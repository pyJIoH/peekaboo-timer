/* Peekaboo Timer — countdown model. Wall-clock based, so it stays correct across
   background tabs, sleep and page reloads. Pure logic: no DOM. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  // A kids' timer: up to 120 minutes (the minute wheel goes 0-120, seconds 0-59).
  const MAX_MINUTES = 120;
  const MAX = (MAX_MINUTES * 60 + 59) * 1000;

  class Timer {
    constructor(now) {
      this.now = now || (() => Date.now());
      this.reset();
    }

    reset() {
      this.status = 'idle';   // idle | running | paused | done
      this.total = 0;         // full length of the dial, ms (grows if time is added past it)
      this.endAt = 0;         // wall-clock end while running
      this.pausedLeft = 0;    // remaining ms while paused
      this.finishedAt = 0;
      this.meta = {};
    }

    start(duration, meta) {
      const d = Math.min(MAX, Math.max(1000, Math.round(duration)));
      this.status = 'running';
      this.total = d;
      this.endAt = this.now() + d;
      this.pausedLeft = 0;
      this.finishedAt = 0;
      this.meta = Object.assign({ duration: d }, meta || {});
    }

    left() {
      switch (this.status) {
        case 'running': return Math.max(0, this.endAt - this.now());
        case 'paused': return this.pausedLeft;
        case 'done': return 0;
        default: return this.total;
      }
    }

    fraction() {
      if (this.status === 'done') return 0;
      return this.total > 0 ? Math.min(1, Math.max(0, this.left() / this.total)) : 1;
    }

    isOver() {
      return this.status === 'running' && this.now() >= this.endAt;
    }

    pause() {
      if (this.status !== 'running') return false;
      this.pausedLeft = this.left();
      this.status = 'paused';
      return true;
    }

    resume() {
      if (this.status !== 'paused') return false;
      this.endAt = this.now() + this.pausedLeft;
      this.status = 'running';
      return true;
    }

    toggle() {
      return this.status === 'running' ? this.pause() : this.resume();
    }

    /** Add or remove time without stopping. Never jumps straight to the end: at least 1 s stays. */
    adjust(delta) {
      if (this.status !== 'running' && this.status !== 'paused') return false;
      const cur = this.left();
      let next = cur + delta;
      if (delta < 0) next = Math.max(next, Math.min(cur, 1000));
      next = Math.min(MAX, next);
      if (next > this.total) this.total = next;
      if (this.status === 'running') this.endAt = this.now() + next;
      else this.pausedLeft = next;
      return true;
    }

    finish() {
      this.status = 'done';
      this.finishedAt = this.now();
      this.pausedLeft = 0;
    }

    toJSON() {
      return {
        status: this.status, total: this.total, endAt: this.endAt,
        pausedLeft: this.pausedLeft, finishedAt: this.finishedAt, meta: this.meta,
      };
    }

    static restore(data, now) {
      const t = new Timer(now);
      if (data && typeof data === 'object' && ['running', 'paused', 'done'].includes(data.status)) {
        t.status = data.status;
        t.total = Number(data.total) || 0;
        t.endAt = Number(data.endAt) || 0;
        t.pausedLeft = Number(data.pausedLeft) || 0;
        t.finishedAt = Number(data.finishedAt) || 0;
        t.meta = data.meta || {};
        if (t.total <= 0) t.reset();
      }
      return t;
    }
  }

  Timer.MAX = MAX;
  Timer.MAX_MINUTES = MAX_MINUTES;
  PK.Timer = Timer;
})();
