/* Peekaboo Timer — end-of-timer fireworks. Rockets climb, burst into glowing sparks and fade.
   The revealed picture is kept clear: no sparks are drawn over the circle. Little copies of the
   revealed picture burst out of the circle and tumble down with the sparks. Sound hooks fire
   exactly when each rocket launches and bursts. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  const COLORS = ['#ff3b3b', '#ffd400', '#3bff6f', '#2ec5ff', '#b44bff', '#ff4fd8', '#ffffff', '#ff9f1a', '#7dffef'];
  // [seconds from start, big burst?]
  const PLAN = [[0, false], [0.3, false], [0.7, true], [1.15, false], [1.5, false], [1.95, true], [2.4, false],
    [2.75, false], [3.2, true], [3.65, true], [3.7, false], [3.8, true], [3.9, false]];
  const LENGTH = 5.6;

  let canvas = null;
  let ctx = null;
  let W = 0;
  let H = 0;
  let scale = 1;
  let raf = 0;
  let last = 0;
  let rockets = [];
  let sparks = [];
  let flashes = [];
  let timers = [];
  let hole = null;
  let active = false;

  // Little copies of the revealed picture (drawn on their own canvas, without trails)
  let mcanvas = null;
  let mctx = null;
  let minis = [];
  let sprite = null;
  let spriteKey = '';
  let onPop = null;

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'fireworks';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    mcanvas = document.createElement('canvas');
    mcanvas.className = 'fireworks fireworks-minis';
    mcanvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mcanvas);
    mctx = mcanvas.getContext('2d');
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth;
    H = innerHeight;
    canvas.width = mcanvas.width = Math.round(W * dpr);
    canvas.height = mcanvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.max(0.6, Math.min(1.35, Math.min(W, H) / 700));
  }

  function target() {
    for (let i = 0; i < 16; i++) {
      const x = rand(W * 0.08, W * 0.92);
      const y = rand(H * 0.06, H * 0.6);
      if (!hole || Math.hypot(x - hole.x, y - hole.y) > hole.r * 0.9) return { x, y };
    }
    return { x: rand(W * 0.1, W * 0.9), y: rand(H * 0.04, H * 0.14) };
  }

  function launch(big, hooks, visual) {
    const t = visual ? target() : { x: rand(0.1, 0.9) * (W || 1), y: 0 };
    const dur = rand(0.75, 1.0);
    const pan = W ? (t.x / W) * 2 - 1 : rand(-0.6, 0.6);
    if (visual) {
      // Short climb from just below the burst, so trails do not streak across the timer.
      rockets.push({ x0: t.x + rand(-40, 40), y0: Math.min(H + 10, t.y + rand(200, 300) * scale), x1: t.x, y1: t.y, t: 0, dur, color: pick(COLORS), big });
    }
    if (hooks.onLaunch) hooks.onLaunch(pan, dur);
    timers.push(setTimeout(() => { if (hooks.onBurst) hooks.onBurst(pan, big); }, dur * 1000));
  }

  function burst(x, y, color, big) {
    const n = big ? 180 : 115;
    const speed = (big ? rand(250, 320) : rand(180, 240)) * scale;
    const ring = Math.random() < 0.25;
    const second = Math.random() < 0.45 ? pick(COLORS) : color;
    const willow = big && Math.random() < 0.35;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.06, 0.06);
      const s = ring ? speed * rand(0.95, 1.05) : speed * Math.sqrt(Math.random()) * 1.05;
      sparks.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0,
        max: (willow ? rand(2.0, 2.8) : rand(1.1, 1.9)) * (big ? 1.15 : 1),
        color: willow ? '#ffd27a' : (i % 3 === 0 ? second : color),
        size: rand(2, 3.4) * Math.max(0.85, scale),
        twinkle: Math.random() < 0.3,
        drag: willow ? 0.5 : 0.33,
      });
    }
    flashes.push({ x, y, life: 0, r: (big ? 170 : 115) * scale });
    if (big) minisFrom(x, y, 4);
  }

  // ---------- little copies of the picture ----------
  /** Pre-draw the picture once: stickers as-is with a soft shadow, full pictures as round badges. */
  function makeSprite(img, sticker) {
    const S = 144;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const iw = img.naturalWidth || S;
    const ih = img.naturalHeight || S;
    if (sticker) {
      const k = Math.min((S * 0.84) / iw, (S * 0.84) / ih);
      g.shadowColor = 'rgba(0,0,0,0.3)';
      g.shadowBlur = 8;
      g.shadowOffsetY = 4;
      g.drawImage(img, (S - iw * k) / 2, (S - ih * k) / 2 - 2, iw * k, ih * k);
    } else {
      const r = S / 2 - 7;
      g.save();
      g.beginPath();
      g.arc(S / 2, S / 2, r, 0, Math.PI * 2);
      g.clip();
      const k = Math.max((2 * r) / iw, (2 * r) / ih);
      g.drawImage(img, S / 2 - (iw * k) / 2, S / 2 - (ih * k) / 2, iw * k, ih * k);
      g.restore();
      g.lineWidth = 8;
      g.strokeStyle = '#ffffff';
      g.beginPath();
      g.arc(S / 2, S / 2, r, 0, Math.PI * 2);
      g.stroke();
    }
    return c;
  }

  function setPicture(src, sticker, popHook) {
    onPop = popHook || null;
    const key = `${src}|${!!sticker}`;
    if (key === spriteKey) return;
    spriteKey = key;
    sprite = null;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { if (spriteKey === key) { try { sprite = makeSprite(img, sticker); } catch (e) { sprite = null; } } };
    img.src = src;
  }

  function addMini(x, y, vx, vy, size, delay) {
    minis.push({ x, y, vx, vy, rot: rand(-0.6, 0.6), vr: rand(-5, 5), size, life: -delay, max: rand(2.2, 3.2) });
  }

  /** Copies burst out of the rim of the circle in every direction. */
  function pictureBurst(n) {
    if (!sprite || !hole || PK.reducedMotion()) return;
    ensure();
    if (!W) resize();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rand(-0.25, 0.25);
      const r0 = hole.r * 0.9;
      const sp = rand(260, 520) * scale;
      addMini(hole.x + Math.cos(a) * r0, hole.y + Math.sin(a) * r0, Math.cos(a) * sp, Math.sin(a) * sp - rand(120, 260) * scale, hole.r * rand(0.2, 0.32), rand(0, 0.15));
    }
    if (onPop) onPop(n);
    kick();
  }

  /** A few copies fly out of a firework burst. */
  function minisFrom(x, y, n) {
    if (!sprite || PK.reducedMotion()) return;
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(120, 260) * scale;
      addMini(x, y, Math.cos(a) * sp, Math.sin(a) * sp - 80 * scale, (hole ? hole.r : 160) * rand(0.15, 0.24), rand(0, 0.1));
    }
  }

  function drawMinis(dt) {
    mctx.clearRect(0, 0, W, H);
    if (!minis.length || !sprite) return;
    minis = minis.filter((m) => {
      m.life += dt;
      if (m.life < 0) return true;
      if (m.life >= m.max || m.y > H + 120) return false;
      const k = Math.pow(0.55, dt);
      m.vx *= k;
      m.vy = m.vy * k + 560 * scale * dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.rot += m.vr * dt;
      const p = Math.min(1, m.life / 0.25);
      const s = m.size * (0.35 + 0.65 * p + 0.22 * Math.sin(p * Math.PI)); // pops in with a little overshoot
      mctx.globalAlpha = Math.max(0, Math.min(1, (m.max - m.life) / 0.6));
      mctx.save();
      mctx.translate(m.x, m.y);
      mctx.rotate(m.rot);
      mctx.drawImage(sprite, -s / 2, -s / 2, s, s);
      mctx.restore();
      return true;
    });
    mctx.globalAlpha = 1;
  }

  function kick() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); }
  }

  function clipOutsideHole() {
    if (!hole) return;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2, true);
    ctx.clip();
  }

  function step(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // Fade the previous frame a little: leaves glowing trails.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.24)';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    clipOutsideHole();
    ctx.globalCompositeOperation = 'lighter';

    rockets = rockets.filter((r) => {
      r.t += dt;
      const p = Math.min(1, r.t / r.dur);
      const e = 1 - Math.pow(1 - p, 2.2);
      const x = r.x0 + (r.x1 - r.x0) * e;
      const y = r.y0 + (r.y1 - r.y0) * e;
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath();
      ctx.arc(x, y, 2.6 * scale, 0, Math.PI * 2);
      ctx.fill();
      sparks.push({ x, y, vx: rand(-20, 20), vy: rand(20, 60), life: 0, max: rand(0.25, 0.5), color: '#ffc46b', size: 1.4, twinkle: false, drag: 0.4 });
      if (p >= 1) { burst(r.x1, r.y1, r.color, r.big); return false; }
      return true;
    });

    flashes = flashes.filter((f) => {
      f.life += dt;
      const a = 1 - f.life / 0.3;
      if (a <= 0) return false;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      g.addColorStop(0, `rgba(255,250,230,${(0.75 * a).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.fillRect(f.x - f.r, f.y - f.r, f.r * 2, f.r * 2);
      return true;
    });

    const TAU = Math.PI * 2;
    sparks = sparks.filter((s) => {
      s.life += dt;
      if (s.life >= s.max) return false;
      const k = Math.pow(s.drag, dt);
      s.vx *= k;
      s.vy = s.vy * k + 110 * scale * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      let a = 1 - s.life / s.max;
      if (s.twinkle) a *= 0.45 + 0.55 * Math.abs(Math.sin(s.life * 26));
      ctx.fillStyle = s.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = a * 0.2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 3.4, 0, TAU);
      ctx.fill();
      return true;
    });

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    drawMinis(dt);

    if (active || rockets.length || sparks.length || flashes.length || minis.length) raf = requestAnimationFrame(step);
    else { raf = 0; ctx.clearRect(0, 0, W, H); mctx.clearRect(0, 0, W, H); }
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    rockets = [];
    sparks = [];
    flashes = [];
    minis = [];
    active = false;
    document.body.classList.remove('fx-on');
  }

  PK.fireworks = {
    /**
     * opts: { hole: {x, y, r} area to keep clear, onLaunch(pan, dur), onBurst(pan, big), onEnd() }
     */
    show(opts) {
      stop();
      const visual = !PK.reducedMotion();
      if (visual) {
        ensure();
        resize();
        hole = opts.hole || null;
      }
      active = true;
      document.body.classList.add('fx-on');
      PLAN.forEach(([t, big]) => timers.push(setTimeout(() => launch(big, opts, visual), t * 1000)));
      timers.push(setTimeout(() => pictureBurst(18), 250));   // the picture "pops" into copies as it is revealed
      timers.push(setTimeout(() => pictureBurst(12), 2300));
      timers.push(setTimeout(() => {
        active = false;
        document.body.classList.remove('fx-on');
        if (opts.onEnd) opts.onEnd();
      }, LENGTH * 1000));
      if (visual) kick();
    },
    updateHole(h) { hole = h; },
    /** The picture whose little copies fly out; popHook(n) is called on each burst (for sound). */
    setPicture,
    pictureBurst,
    stop,
  };
})();
