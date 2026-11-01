/* Peekaboo Timer — the dial. A flat coloured cover hides the picture and shrinks clockwise,
   like a clock hand sweeping it away. Nothing else sits on the picture, except a small
   5-4-3-2-1 countdown in the very last seconds. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  const FIXED = { red: '#ef4444', blue: '#3b82f6', purple: '#8b5cf6', pink: '#ec4899', teal: '#14b8a6' };

  // Traffic light stops: [fraction left, hue, saturation, lightness] — bright, flat colours.
  const TRAFFIC = [[0, 12, 84, 51], [0.12, 12, 84, 51], [0.3, 40, 98, 50], [0.55, 98, 68, 45], [1, 98, 68, 45]];

  function trafficColor(f) {
    let i = 1;
    while (i < TRAFFIC.length - 1 && f > TRAFFIC[i][0]) i++;
    const a = TRAFFIC[i - 1];
    const b = TRAFFIC[i];
    const t = PK.smooth(PK.clamp((f - a[0]) / (b[0] - a[0] || 1), 0, 1));
    return `hsl(${PK.lerp(a[1], b[1], t).toFixed(1)}, ${PK.lerp(a[2], b[2], t).toFixed(1)}%, ${PK.lerp(a[3], b[3], t).toFixed(1)}%)`;
  }

  function coverColor(mode, f) {
    return FIXED[mode] || trafficColor(f);
  }

  function sectorPath(f, r) {
    if (f >= 0.99995) return `M0 ${-r}A${r} ${r} 0 1 1 0 ${r}A${r} ${r} 0 1 1 0 ${-r}Z`;
    if (f <= 0.00005) return '';
    const a = (1 - f) * Math.PI * 2;
    const x = (r * Math.sin(a)).toFixed(3);
    const y = (-r * Math.cos(a)).toFixed(3);
    return `M0 0L${x} ${y}A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 0 ${-r}Z`;
  }

  class Dial {
    constructor(root) {
      this.root = root;
      this.face = root.querySelector('#dialFace');
      this.pic = root.querySelector('#dialPic');
      this.cover = root.querySelector('#coverPath');
      this.countEl = root.querySelector('#dialCount');
      this.f = -1;
      this.color = '';
      this.count = null;
      this.key = '';
      this.onError = null;
      this.pic.addEventListener('error', () => { if (this.onError) this.onError(); });
    }

    /** backdrop: CSS background for transparent sticker art, or '' for full-bleed pictures. */
    setPicture(src, backdrop) {
      const key = `${src}|${backdrop || ''}`;
      if (key === this.key) return;
      this.key = key;
      this.pic.classList.toggle('sticker', !!backdrop);
      this.face.style.backgroundImage = backdrop || '';
      this.pic.src = src;
    }

    setSecret(on) {
      this.face.classList.toggle('is-secret', !!on);
    }

    setFraction(f) {
      f = PK.clamp(f, 0, 1);
      if (Math.abs(f - this.f) < 0.00002) return;
      this.f = f;
      this.cover.setAttribute('d', sectorPath(f, 101));
    }

    setColor(color) {
      if (color === this.color) return;
      this.color = color;
      this.root.style.setProperty('--cover', color);
    }

    /** Small countdown number in the middle (last seconds only); null hides it. */
    setCount(n) {
      if (n === this.count) return;
      this.count = n;
      const el = this.countEl;
      if (n == null) { el.hidden = true; return; }
      el.hidden = false;
      el.textContent = String(n);
      el.classList.remove('pop');
      void el.offsetWidth;
      el.classList.add('pop');
    }

    spin() {
      const face = this.face;
      face.classList.remove('spin');
      void face.offsetWidth; // restart the animation
      face.classList.add('spin');
    }
  }

  Dial.coverColor = coverColor;
  Dial.sectorPath = sectorPath;
  PK.Dial = Dial;
})();
