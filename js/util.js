/* Peekaboo Timer — shared helpers. Classic script (no modules) so the app also runs from file://. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  PK.$ = (sel, root) => (root || document).querySelector(sel);
  PK.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  PK.clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  PK.lerp = (a, b, t) => a + (b - a) * t;
  PK.smooth = (t) => t * t * (3 - 2 * t);
  PK.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  PK.reducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const PREFIX = 'peekaboo:';
  PK.store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* storage full or blocked */ }
    },
    remove(key) {
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    },
  };

  const pad = (n) => String(n).padStart(2, '0');

  /** Clock text for a remaining time. Rounds up, so "0:01" shows until the very end. */
  PK.formatClock = function (ms) {
    const total = Math.max(0, Math.ceil(ms / 1000 - 1e-6));
    return `${Math.floor(total / 60)}:${pad(total % 60)}`; // minutes only: "90:00", no hours
  };

  /** Short human label: "45 s", "5 min", "90 min", "2 min 30 s". */
  PK.formatShort = function (ms) {
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    const parts = [];
    if (m) parts.push(`${m} min`);
    if (s) parts.push(`${s} s`);
    return parts.join(' ') || '0 s';
  };

  /** Words for screen readers: "4 minutes 30 seconds". */
  PK.formatSpoken = function (ms) {
    const total = Math.max(0, Math.ceil(ms / 1000 - 1e-6));
    const m = Math.floor(total / 60);
    const s = total % 60;
    const w = (n, unit) => `${n} ${unit}${n === 1 ? '' : 's'}`;
    const parts = [];
    if (m) parts.push(w(m, 'minute'));
    if (s || !parts.length) parts.push(w(s, 'second'));
    return parts.join(' ');
  };

  /** Heartbeat that keeps firing in background tabs (dedicated workers are not throttled like page timers). */
  PK.heartbeat = function (fn, ms) {
    let worker = null;
    let intervalId = 0;
    try {
      const src = 'let t=0;onmessage=e=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
      worker.onmessage = () => fn();
      worker.onerror = () => { worker = null; };
    } catch (e) { worker = null; }
    return {
      start() {
        this.stop();
        if (worker) worker.postMessage(ms);
        else intervalId = setInterval(fn, ms);
      },
      stop() {
        if (worker) worker.postMessage(0);
        clearInterval(intervalId);
        intervalId = 0;
      },
    };
  };
})();
