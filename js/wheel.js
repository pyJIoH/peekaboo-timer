/* Peekaboo Timer — iPhone-style wheel picker. Native momentum scrolling with snap points,
   a 3D drum effect, endless looping and a soft click as each number passes. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  const REPEAT = 9; // copies of the number list; we quietly re-centre on the middle copy

  class Wheel {
    constructor(el, opts) {
      this.el = el;
      this.count = opts.count;
      this.onChange = opts.onChange || null;
      this.onTick = opts.onTick || null;
      this.value = 0;
      this.h = 0;
      this.lastIdx = -1;
      this.styled = new Set();
      this.dragging = false;
      this.suppressClick = false;

      el.setAttribute('role', 'spinbutton');
      el.setAttribute('aria-label', opts.label);
      el.setAttribute('aria-valuemin', '0');
      el.setAttribute('aria-valuemax', String(this.count - 1));
      el.tabIndex = 0;

      const frag = document.createDocumentFragment();
      const pad = () => { const d = document.createElement('div'); d.className = 'wheel-pad'; return d; };
      frag.appendChild(pad());
      this.items = [];
      for (let r = 0; r < REPEAT; r++) {
        for (let v = 0; v < this.count; v++) {
          const d = document.createElement('div');
          d.className = 'wheel-item';
          d.dataset.i = String(r * this.count + v);
          const face = document.createElement('span'); // the tilt goes here, so snap points stay exact
          face.textContent = String(v);
          d.appendChild(face);
          frag.appendChild(d);
          this.items.push(d);
        }
      }
      frag.appendChild(pad());
      el.appendChild(frag);

      el.addEventListener('scroll', () => this.onScroll(), { passive: true });
      if ('onscrollend' in window) el.addEventListener('scrollend', () => this.settle());
      el.addEventListener('click', (e) => {
        if (this.suppressClick) { this.suppressClick = false; return; }
        if (!this.measure()) return;
        // Work out the tapped row from the position (pointer capture can retarget the click).
        const r = el.getBoundingClientRect();
        const rows = Math.round((e.clientY - r.top - r.height / 2) / this.h);
        if (rows) this.scrollToIndex(Math.round(el.scrollTop / this.h) + rows, true);
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); this.step(-1); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); this.step(1); }
      });
      this.bindMouseDrag();
    }

    get mid() { return Math.floor(REPEAT / 2) * this.count; }

    /** Row height in px. Called after layout changes. */
    measure() {
      const h = this.items[0].getBoundingClientRect().height;
      if (h > 0) this.h = h;
      return this.h;
    }

    /** Set the value without animation and without firing onChange. */
    set(v) {
      this.value = ((v % this.count) + this.count) % this.count;
      this.el.setAttribute('aria-valuenow', String(this.value));
      if (!this.measure()) return;
      const i = this.mid + this.value;
      this.lastIdx = i;
      this.el.scrollTop = i * this.h;
      this.paint();
    }

    scrollToIndex(i, smooth) {
      if (!this.measure()) return;
      this.el.scrollTo({ top: i * this.h, behavior: smooth ? 'smooth' : 'instant' });
    }

    step(d) {
      if (!this.measure()) return;
      this.scrollToIndex(Math.round(this.el.scrollTop / this.h) + d, true);
    }

    onScroll() {
      if (!this.raf) this.raf = requestAnimationFrame(() => { this.raf = 0; this.paint(); });
      clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => this.settle(), 180);
    }

    paint() {
      if (!this.h) return;
      const p = this.el.scrollTop / this.h;
      const ci = Math.round(p);
      const keep = new Set();
      // Drum: rows sit on a cylinder, so they bunch up and tilt away from the middle.
      const STEP = 20 * Math.PI / 180;
      const R = this.h / Math.sin(STEP);
      for (let i = ci - 4; i <= ci + 4; i++) {
        const it = this.items[i];
        if (!it) continue;
        const d = i - p;
        const a = Math.max(-1.45, Math.min(1.45, d * STEP));
        const face = it.firstChild;
        face.style.transform = `translateY(${(R * Math.sin(a) - d * this.h).toFixed(2)}px) rotateX(${(-a * 180 / Math.PI).toFixed(2)}deg)`;
        face.style.opacity = Math.max(0.12, Math.cos(a) * 1.05 - 0.05).toFixed(3);
        it.classList.toggle('on', i === ci);
        keep.add(it);
      }
      this.styled.forEach((it) => {
        if (!keep.has(it)) { it.firstChild.style.transform = ''; it.firstChild.style.opacity = ''; it.classList.remove('on'); }
      });
      this.styled = keep;

      if (ci !== this.lastIdx) {
        if (this.lastIdx !== -1 && this.onTick) this.onTick();
        this.lastIdx = ci;
      }
      const v = ((ci % this.count) + this.count) % this.count;
      if (v !== this.value) {
        this.value = v;
        this.el.setAttribute('aria-valuenow', String(v));
        if (this.onChange) this.onChange(v);
      }
    }

    /** After scrolling stops, jump to the same number in the middle copy so the wheel never runs out. */
    settle() {
      if (this.dragging || !this.h) return;
      const ci = Math.round(this.el.scrollTop / this.h);
      const copy = Math.floor(ci / this.count);
      const mid = Math.floor(REPEAT / 2);
      if (copy !== mid) {
        const target = ci + (mid - copy) * this.count;
        this.lastIdx = target;
        this.el.scrollTop = target * this.h;
        this.paint();
      }
    }

    bindMouseDrag() {
      const el = this.el;
      let startY = 0;
      let startTop = 0;
      let active = false;
      let moved = false;
      el.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        active = true;
        moved = false;
        startY = e.clientY;
        startTop = el.scrollTop;
        this.dragging = true;
        el.classList.add('dragging');
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      });
      el.addEventListener('pointermove', (e) => {
        if (!active) return;
        const dy = e.clientY - startY;
        if (Math.abs(dy) > 3) moved = true;
        el.scrollTop = startTop - dy;
      });
      const end = () => {
        if (!active) return;
        active = false;
        this.dragging = false;
        el.classList.remove('dragging');
        if (moved) {
          this.suppressClick = true;
          this.scrollToIndex(Math.round(el.scrollTop / this.h), true);
        }
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
  }

  PK.Wheel = Wheel;
})();
