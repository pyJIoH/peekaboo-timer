/* Peekaboo Timer — the sky behind the timer. In Auto mode it follows the real clock:
   the sun travels from sunrise to sunset, then the moon and stars come out. */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  const THEME_COLOR = { dawn: '#4a62c9', day: '#0a5fd8', dusk: '#2d3a9c', night: '#061033' };
  const SAMPLE_HOUR = { dawn: 6.4, day: 12.5, dusk: 18.9, night: 22.5 };

  let root = null;
  let mode = 'auto';
  let intervalId = 0;

  function periodFor(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 17.5) return 'day';
    if (h >= 17.5 && h < 20.5) return 'dusk';
    return 'night';
  }

  function starField(el, count, seed, size) {
    let s = seed;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const shadows = [];
    for (let i = 0; i < count; i++) {
      const x = (rnd() * 100).toFixed(2);
      const y = (rnd() * 62).toFixed(2);
      const a = (0.45 + rnd() * 0.55).toFixed(2);
      shadows.push(`${x}vw ${y}vh 0 ${size}px rgba(255,255,255,${a})`);
    }
    el.style.boxShadow = shadows.join(',');
  }

  function update() {
    if (!root) return;
    const now = new Date();
    const realHour = now.getHours() + now.getMinutes() / 60;
    const period = mode === 'auto' ? periodFor(realHour) : mode;
    const h = mode === 'auto' ? realHour : SAMPLE_HOUR[mode];

    root.dataset.period = period;

    // Sun: rises 6:00, sets 20:00. Moon: rises 19:30, sets 6:30.
    const sp = (h - 6) / 14;
    const mp = (((h - 19.5) % 24) + 24) % 24 / 11;
    const arc = (p) => ({ x: 6 + 88 * p, y: 66 - 52 * Math.sin(Math.PI * Math.min(1, Math.max(0, p))) });
    const sun = arc(sp);
    const moon = arc(mp);
    root.style.setProperty('--sun-x', sun.x.toFixed(2) + 'vw');
    root.style.setProperty('--sun-y', sun.y.toFixed(2) + 'vh');
    root.style.setProperty('--moon-x', moon.x.toFixed(2) + 'vw');
    root.style.setProperty('--moon-y', moon.y.toFixed(2) + 'vh');
    root.classList.toggle('sun-up', sp > -0.04 && sp < 1.04);
    root.classList.toggle('moon-up', mp > -0.04 && mp < 1.04);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[period]);
  }

  PK.sky = {
    init(el) {
      root = el;
      starField(document.getElementById('starsA'), 70, 7, 0);
      starField(document.getElementById('starsB'), 18, 99, 1);
      update();
      clearInterval(intervalId);
      intervalId = setInterval(update, 60 * 1000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) update(); });
    },
    setMode(m) {
      mode = SAMPLE_HOUR[m] ? m : 'auto';
      update();
    },
    period: () => (root ? root.dataset.period : 'day'),
  };
})();
