/* Peekaboo Timer — sound engine. Every sound is synthesised with the Web Audio API.
   Ticks are scheduled on the audio clock (look-ahead scheduler), so they stay steady
   even when the page is busy or in a background tab. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  let ctx = null;
  let master, tickBus, endBus, uiBus, reverbSend, noiseBuf;
  const vol = { tick: 0.85, end: 0.9, muted: false };

  // Ticks waiting to play: { when, voice }
  let pending = [];
  let pendingKeys = new Set();
  let pendingEpoch = null;

  // End sounds
  let endVoice = null;
  let endRepeat = 0;
  let endRepeatUntil = 0;
  let endJob = null; // the end melody being played: { name, repeat, doneAt (audio clock) }
  let fxVoice = null;
  let previewTimers = [];

  // Health of the audio context. On iPhone and iPad (every browser there is WebKit) a context
  // can be left interrupted, or "running" yet silent, after the page was in the background, a
  // call, Siri or a change of audio output. Such a context is not trusted again: it is replaced
  // on the next tap, because a new context can only start inside a user gesture.
  const IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const STUCK_MS = 1500;
  let stale = false;   // replace the context on the next user gesture
  let ran = false;     // this context has been running at least once
  let clockSeen = 0;   // last audio clock reading, and when it was taken
  let clockAt = 0;
  let stuckMs = 0;     // how long the audio clock has stood still while "running"
  let listener = null;

  function notify() {
    if (!listener) return;
    try { listener(); } catch (e) { /* ignore */ }
  }

  function suspect() {
    if (ctx) stale = true;
  }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let made;
    try { made = new AC({ latencyHint: 'interactive' }); } catch (e) { return null; }
    ctx = made;
    stale = false;
    ran = made.state === 'running';
    clockAt = 0;
    stuckMs = 0;
    made.onstatechange = () => {
      if (made !== ctx) return;
      if (made.state === 'running') ran = true;
      else if (ran) stale = true; // it stopped without being asked to: this code never suspends it
      notify();
    };

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 4;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.12;
    limiter.connect(ctx.destination);

    master = ctx.createGain();
    master.connect(limiter);
    tickBus = ctx.createGain();
    tickBus.connect(master);
    endBus = ctx.createGain();
    endBus.connect(master);
    uiBus = ctx.createGain();
    uiBus.gain.value = 0.5;
    uiBus.connect(master);

    const conv = ctx.createConvolver();
    conv.buffer = impulse(2.4, 3.2);
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.32;
    endBus.connect(reverbSend);
    reverbSend.connect(conv);
    conv.connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    applyVolumes();
    return ctx;
  }

  function impulse(seconds, decay) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    tickBus.gain.setTargetAtTime(Math.pow(vol.tick, 1.3) * 1.7, t, 0.02);
    endBus.gain.setTargetAtTime(Math.pow(vol.end, 1.4) * 1.1, t, 0.02);
    master.gain.setTargetAtTime(vol.muted ? 0 : 1, t, 0.02);
  }

  /** Must run inside a user gesture (tap/click/key) the first time, for iOS and Chrome autoplay rules. */
  function unlock() {
    try {
      // Safari 17+: play even when the ring/silent switch is on — a timer has to be heard.
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    } catch (e) { /* ignore */ }
    const fresh = !ctx;
    let c = ensure();
    if (!c) return;
    if (!fresh && (stale || c.state === 'closed') && gestureLive()) {
      c = rebuild();
      if (!c) return;
    }
    if (c.state !== 'running') c.resume().catch(() => {});
    try {
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    } catch (e) { /* ignore */ }
  }

  /** False while the browser would refuse to start audio (a scroll, the first half of a tap). */
  function gestureLive() {
    const ua = navigator.userActivation;
    return !ua || ua.isActive;
  }

  /** Throws the context away and builds a new one. Call inside a user gesture. */
  function rebuild() {
    const old = ctx;
    let unfinished = false;
    try { unfinished = !!endJob && old.currentTime < endJob.doneAt; } catch (e) { /* ignore */ }
    cancelTicks();
    clearTimeout(endRepeat);
    endRepeat = 0;
    old.onstatechange = null;
    ctx = null;
    endVoice = null;
    fxVoice = null;
    lastClick = -1;
    try {
      const closing = old.close();
      if (closing && closing.catch) closing.catch(() => {});
    } catch (e) { /* ignore */ }
    if (!ensure()) return null;
    // An end melody the old context never got to finish starts again on the new one.
    if (endJob && (unfinished || (endJob.repeat && Date.now() < endRepeatUntil))) playEndPass();
    notify();
    return ctx;
  }

  /** Notices a context that says "running" while its clock stands still. */
  function watchClock() {
    if (!ctx || ctx.state !== 'running') { clockAt = 0; stuckMs = 0; return; }
    const now = performance.now();
    const ct = ctx.currentTime;
    const was = stuckMs;
    if (clockAt && ct === clockSeen) {
      const gap = now - clockAt;
      if (gap < 1000) stuckMs += gap; // longer gaps mean the page itself was asleep
    } else {
      stuckMs = 0;
    }
    clockSeen = ct;
    clockAt = now;
    if (stuckMs > STUCK_MS && was <= STUCK_MS) { stale = true; notify(); }
    else if (was > STUCK_MS && stuckMs === 0) notify();
  }

  const ready = () => !!ctx && ctx.state === 'running' && stuckMs <= STUCK_MS;

  // ---------- building blocks ----------
  function env(param, t, attack, peak, decay) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  function osc(type, freq, t, out, peak, attack, decay) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    env(g.gain, t, attack, peak, decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return o;
  }

  function noise(t, out, { type = 'bandpass', freq = 2000, q = 1, peak = 1, attack = 0.001, decay = 0.05, rate = 1 }) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    src.playbackRate.value = rate;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    env(g.gain, t, attack, peak, decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.8);
    src.stop(t + attack + decay + 0.05);
    return { src, filter: f, gain: g };
  }

  function voice(bus) {
    const g = ctx.createGain();
    g.connect(bus);
    return g;
  }

  // ---------- tick-tock ----------
  const TICKS = {
    clock(t, tock, out) {
      noise(t, out, { freq: tock ? 1700 : 2700, q: 3.5, peak: 2.4, decay: 0.035 });
      osc('triangle', tock ? 880 : 1320, t, out, 0.55, 0.001, 0.035);
      osc('sine', tock ? 150 : 190, t, out, 0.7, 0.002, 0.06);
    },
    wood(t, tock, out) {
      const f = tock ? 700 : 940;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.12, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
      const g = ctx.createGain();
      env(g.gain, t, 0.002, 1.3, 0.1);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.16);
      osc('triangle', f * 2.7, t, out, 0.25, 0.001, 0.03);
      noise(t, out, { freq: f * 3, q: 2, peak: 0.6, decay: 0.012 });
    },
    bubble(t, tock, out) {
      const f0 = tock ? 250 : 330;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f0 * 3.2, t + 0.07);
      const g = ctx.createGain();
      env(g.gain, t, 0.005, 1.1, 0.09);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.15);
    },
  };

  function pip(t, last, out) {
    const f = last ? 1318.5 : 880;
    osc('triangle', f, t, out, 0.9, 0.006, 0.2);
    osc('sine', f * 2, t, out, 0.2, 0.006, 0.1);
  }

  /**
   * Called a few times per second while a timer runs. Schedules every tick
   * falling inside the next ~1.6 s on the audio clock.
   * settings.tickRate: 2 = tick-tock every half second, 1 = once a second.
   */
  function scheduleTicks(timer, settings) {
    watchClock();
    if (!ready() || timer.status !== 'running') return;
    const tickType = TICKS[settings.tick] ? settings.tick : null;
    if (!tickType && !settings.pips) return;
    const stepMs = settings.tickRate === 1 ? 1000 : 500;
    const epoch = `${timer.endAt}:${stepMs}:${tickType}:${settings.pips}`;
    if (pendingEpoch !== epoch) {
      cancelTicks();
      pendingEpoch = epoch;
    }
    const nowMs = Date.now();
    const leftMs = timer.endAt - nowMs;
    const kMax = Math.floor(leftMs / stepMs);
    const kMin = Math.max(1, Math.ceil((leftMs - 1600) / stepMs));
    const base = ctx.currentTime - nowMs / 1000;
    for (let k = kMax; k >= kMin; k--) {
      if (pendingKeys.has(k)) continue;
      pendingKeys.add(k);
      const at = (timer.endAt - k * stepMs) / 1000 + base;
      if (at < ctx.currentTime - 0.03) continue; // missed (tab was frozen): skip rather than burst
      const when = Math.max(at, ctx.currentTime + 0.004);
      const leftAt = k * stepMs;            // ms remaining at that moment
      const whole = leftAt % 1000 === 0;
      const v = voice(tickBus);
      if (settings.pips && leftAt <= 5000) {
        if (whole) pip(when, leftAt === 1000, v);
      } else if (tickType) {
        TICKS[tickType](when, k % 2 === 1, v);
      }
      pending.push({ when, voice: v });
    }
    const ct = ctx.currentTime;
    pending = pending.filter((p) => {
      if (p.when < ct - 1) { p.voice.disconnect(); return false; }
      return true;
    });
  }

  function cancelTicks() {
    pendingKeys = new Set();
    pendingEpoch = null;
    if (ctx) {
      const ct = ctx.currentTime;
      pending.forEach((p) => { if (p.when > ct - 0.01) p.voice.disconnect(); });
    }
    pending = [];
  }

  // ---------- fireworks ----------
  function fxOut() {
    if (!fxVoice) fxVoice = voice(endBus);
    return fxVoice;
  }

  function panTo(pan, out) {
    if (!ctx.createStereoPanner) return out;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan * 0.75));
    p.connect(out);
    return p;
  }

  function fwLaunch(pan, dur, gain) {
    if (!ready()) return;
    const out = panTo(pan, fxOut());
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(650, t);
    o.frequency.exponentialRampToValueAtTime(2000, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07 * gain, t + 0.12);
    g.gain.setValueAtTime(0.07 * gain, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
    const hiss = noise(t, out, { freq: 3000, q: 1.2, peak: 0.16 * gain, attack: 0.08, decay: dur });
    hiss.filter.frequency.setValueAtTime(2500, t);
    hiss.filter.frequency.linearRampToValueAtTime(5500, t + dur);
  }

  function fwBoom(pan, big, gain) {
    if (!ready()) return;
    const out = panTo(pan, fxOut());
    const t = ctx.currentTime + 0.005;
    const amp = (big ? 1 : 0.75) * gain;
    const len = big ? 1.9 : 1.3;
    // Body of the bang: low, rumbling noise.
    const body = noise(t, out, { type: 'lowpass', freq: big ? 1700 : 1300, q: 0.7, peak: 1.6 * amp, attack: 0.006, decay: len, rate: 0.6 });
    body.filter.frequency.setValueAtTime(big ? 1700 : 1300, t);
    body.filter.frequency.exponentialRampToValueAtTime(130, t + len);
    // Thump you feel.
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(big ? 95 : 125, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.5);
    const g = ctx.createGain();
    env(g.gain, t, 0.004, 1.1 * amp, 0.55);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.65);
    // Crackle as the sparks fall.
    const count = big ? 48 : 26;
    for (let i = 0; i < count; i++) {
      const ct = t + 0.22 + Math.random() * (big ? 1.2 : 0.85);
      noise(ct, out, { type: 'highpass', freq: 2500 + Math.random() * 3500, q: 0.8, peak: (0.25 + Math.random() * 0.45) * amp, decay: 0.01 + Math.random() * 0.02 });
    }
  }

  // ---------- melodies ----------
  function brass(f, t, d, out, peak) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = 1.5;
    lp.frequency.setValueAtTime(f * 1.5, t);
    lp.frequency.linearRampToValueAtTime(f * 6, t + 0.06);
    lp.frequency.exponentialRampToValueAtTime(f * 2.4, t + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.03);
    g.gain.setTargetAtTime(peak * 0.7, t + 0.05, 0.12);
    g.gain.setTargetAtTime(0.0001, t + d, 0.07);
    lp.connect(g).connect(out);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vibAmt = ctx.createGain();
    vibAmt.gain.setValueAtTime(0, t);
    vibAmt.gain.linearRampToValueAtTime(d > 0.4 ? 9 : 0, t + 0.3);
    vib.connect(vibAmt);
    [-7, 7].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.detune.value = det;
      vibAmt.connect(o.detune);
      o.connect(lp);
      o.start(t);
      o.stop(t + d + 0.5);
    });
    vib.start(t);
    vib.stop(t + d + 0.5);
  }

  function bell(f, t, out, peak) {
    [[1, 1, 2.4], [2.0, 0.42, 1.5], [2.76, 0.34, 1.0], [4.07, 0.2, 0.6], [5.4, 0.12, 0.4]].forEach(([ratio, amp, dec]) => {
      osc('sine', f * ratio, t, out, peak * amp, 0.002, dec);
    });
  }

  const ENDS = {
    fanfare(t, out) {
      const n = [[392, 0, 0.13], [523.25, 0.15, 0.13], [659.25, 0.3, 0.13], [783.99, 0.45, 0.42], [659.25, 0.72, 0.12], [783.99, 0.86, 0.12]];
      n.forEach(([f, dt, d]) => brass(f, t + dt, d, out, 0.28));
      brass(1046.5, t + 1.02, 1.05, out, 0.3);
      brass(659.25, t + 1.02, 1.05, out, 0.16);
      brass(783.99, t + 1.02, 1.05, out, 0.16);
      return 2.4;
    },
    chimes(t, out) {
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell(f, t + i * 0.2, out, 0.32));
      [1046.5, 1568, 2093].forEach((f) => bell(f, t + 1.0, out, 0.24));
      return 3.4;
    },
    magic(t, out) {
      const scale = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637, 3136, 3520];
      for (let i = 0; i < 16; i++) {
        const f = scale[Math.min(scale.length - 1, Math.floor(i * 0.65))];
        osc('sine', f, t + i * 0.065, out, 0.22, 0.003, 0.32);
        osc('sine', f * 2, t + i * 0.065, out, 0.07, 0.003, 0.16);
      }
      [1568, 2093, 2637].forEach((f) => bell(f, t + 1.1, out, 0.16));
      return 2.8;
    },
    cuckoo(t, out) {
      for (let r = 0; r < 3; r++) {
        const s = t + r * 0.78;
        [[783.99, 0, 0.2], [622.25, 0.24, 0.32]].forEach(([f, dt, d]) => {
          osc('sine', f, s + dt, out, 0.5, 0.015, d);
          osc('triangle', f, s + dt, out, 0.18, 0.015, d);
        });
      }
      return 2.5;
    },
    alarm(t, out) {
      for (let b = 0; b < 2; b++) {
        for (let i = 0; i < 4; i++) {
          const s = t + b * 0.9 + i * 0.13;
          const o = ctx.createOscillator();
          o.type = 'square';
          o.frequency.value = 2093;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, s);
          g.gain.linearRampToValueAtTime(0.12, s + 0.004);
          g.gain.setValueAtTime(0.12, s + 0.07);
          g.gain.linearRampToValueAtTime(0.0001, s + 0.078);
          o.connect(g).connect(out);
          o.start(s);
          o.stop(s + 0.09);
        }
      }
      return 1.8;
    },
  };

  function playEnd(name, opts) {
    stopEnd();
    if (!ensure()) return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
    if (!ENDS[name]) return;
    endRepeatUntil = Date.now() + 3 * 60 * 1000; // never nag for more than 3 minutes
    endJob = { name, repeat: !!(opts && opts.repeat), doneAt: 0 };
    playEndPass();
  }

  function playEndPass() {
    const job = endJob;
    if (!job || !ctx) return;
    const v = voice(endBus);
    if (endVoice) fadeOut(endVoice, 0.3);
    endVoice = v;
    const t = ctx.currentTime + 0.05;
    const dur = ENDS[job.name](t, v);
    job.doneAt = t + dur;
    if (job.repeat && Date.now() < endRepeatUntil) endRepeat = setTimeout(playEndPass, (dur + 1.4) * 1000);
  }

  function fadeOut(v, sec) {
    try {
      const t = ctx.currentTime;
      v.gain.cancelScheduledValues(t);
      v.gain.setValueAtTime(v.gain.value, t);
      v.gain.linearRampToValueAtTime(0, t + sec);
      setTimeout(() => v.disconnect(), sec * 1000 + 60);
    } catch (e) { /* ignore */ }
  }

  function stopEnd() {
    clearTimeout(endRepeat);
    endRepeat = 0;
    endJob = null;
    previewTimers.forEach(clearTimeout);
    previewTimers = [];
    if (ctx) {
      if (endVoice) fadeOut(endVoice, 0.12);
      if (fxVoice) fadeOut(fxVoice, 0.25);
    }
    endVoice = null;
    fxVoice = null;
  }

  // ---------- small UI sounds ----------
  function startChirp() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.01;
    const v = voice(endBus);
    osc('sine', 1046.5, t, v, 0.16, 0.005, 0.18);
    osc('sine', 1568, t + 0.09, v, 0.16, 0.005, 0.3);
  }

  function boing() {
    if (!ready()) return;
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.12);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.38);
    const g = ctx.createGain();
    env(g.gain, t, 0.01, 0.35, 0.4);
    o.connect(g).connect(voice(endBus));
    o.start(t);
    o.stop(t + 0.5);
  }

  /** Bubbly pops for the little flying pictures. */
  function pops(n) {
    if (!ready()) return;
    const count = Math.min(9, Math.max(3, Math.round(n / 2)));
    const t0 = ctx.currentTime + 0.01;
    const v = voice(endBus);
    for (let i = 0; i < count; i++) {
      const t = t0 + i * 0.05 + Math.random() * 0.03;
      const f = 480 + Math.random() * 720;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(f * 1.9, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
      const g = ctx.createGain();
      env(g.gain, t, 0.003, 0.3, 0.08);
      o.connect(g).connect(v);
      o.start(t);
      o.stop(t + 0.12);
    }
    setTimeout(() => v.disconnect(), 1500);
  }

  /** The soft click of an iPhone picker wheel. */
  let lastClick = 0;
  function wheelClick() {
    if (!ready()) return;
    const t = ctx.currentTime;
    if (t - lastClick < 0.03) return;
    lastClick = t;
    const v = voice(uiBus);
    noise(t, v, { freq: 3800, q: 2.5, peak: 0.35, decay: 0.008 });
    osc('sine', 2200, t, v, 0.06, 0.001, 0.01);
    setTimeout(() => v.disconnect(), 200);
  }

  function previewTick(type, rate) {
    unlock();
    if (!ctx) return;
    const fn = TICKS[type];
    if (!fn) return;
    const gap = rate === 1 ? 1 : 0.5;
    const t = ctx.currentTime + 0.06;
    const v = voice(tickBus);
    for (let i = 0; i < 4; i++) fn(t + i * gap, i % 2 === 1, v);
  }

  function previewEnd(name) {
    unlock();
    stopEnd();
    if (name !== 'fireworks') { playEnd(name, { repeat: false }); return; }
    [[0, false], [0.5, true], [1.1, false]].forEach(([dt, big]) => {
      previewTimers.push(setTimeout(() => {
        const pan = Math.random() * 1.2 - 0.6;
        fwLaunch(pan, 0.8, 1);
        previewTimers.push(setTimeout(() => fwBoom(pan, big, 1), 800));
      }, dt * 1000));
    });
  }

  // Coming back to the page, or a new audio output, is when iOS breaks a context without saying so.
  document.addEventListener('visibilitychange', () => { if (IOS && !document.hidden) suspect(); });
  window.addEventListener('pageshow', (e) => { if (e.persisted) suspect(); });
  if (IOS && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
    navigator.mediaDevices.addEventListener('devicechange', suspect);
  }

  PK.sound = {
    unlock,
    ready,
    /** True when the context should be replaced on the next tap, even if it claims to be running. */
    stale: () => stale,
    /** Calls fn whenever the sound may have started or stopped working. */
    onChange(fn) { listener = fn; },
    resume() { if (ctx && ctx.state !== 'running') ctx.resume().catch(() => {}); },
    setVolumes(tick, end, muted) {
      vol.tick = tick;
      vol.end = end;
      vol.muted = !!muted;
      applyVolumes();
    },
    scheduleTicks,
    cancelTicks,
    playEnd,
    stopEnd,
    fwLaunch,
    fwBoom,
    startChirp,
    boing,
    pops,
    wheelClick,
    previewTick,
    previewEnd,
  };
})();
