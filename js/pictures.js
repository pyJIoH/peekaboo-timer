/* Peekaboo Timer — built-in hidden pictures. Original vector scenes, drawn for a circular frame
   (400 × 400, main subject inside the middle circle). */
(function () {
  'use strict';
  const PK = (window.PK = window.PK || {});

  // ---------- drawing helpers ----------
  const sparkle = (x, y, s, fill = '#fff', op = 1) =>
    `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="${fill}" opacity="${op}"/>`;

  function star(cx, cy, R, r, rot = -90, n = 5) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const rad = ((rot + (i * 180) / n) * Math.PI) / 180;
      const rr = i % 2 ? r : R;
      d += (i ? 'L' : 'M') + (cx + rr * Math.cos(rad)).toFixed(1) + ' ' + (cy + rr * Math.sin(rad)).toFixed(1);
    }
    return d + 'Z';
  }

  const paw = (x, y, rot, fill) =>
    `<g transform="translate(${x} ${y}) rotate(${rot})" fill="${fill}"><ellipse cy="8" rx="15" ry="12"/><circle cx="-14" cy="-10" r="6.5"/><circle cx="-4" cy="-18" r="6.5"/><circle cx="8" cy="-17" r="6.5"/><circle cx="16" cy="-7" r="6"/></g>`;

  const flower = (x, y, petal = '#fff', center = '#ffc93c', s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><g fill="${petal}"><circle cx="0" cy="-7" r="6"/><circle cx="7" cy="0" r="6"/><circle cx="0" cy="7" r="6"/><circle cx="-7" cy="0" r="6"/></g><circle r="4.5" fill="${center}"/></g>`;

  const wave = (y, amp, fill, extra = '') => {
    let d = `M0 ${y}q25 ${-amp} 50 0`;
    for (let i = 0; i < 8; i++) d += 't50 0';
    return `<path d="${d}V400H0Z" fill="${fill}" ${extra}/>`;
  };

  const cloudPuffs = (parts, fill) => `<g fill="${fill}">${parts.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>`;

  const svg = (body, defs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${defs}</defs>${body}</svg>`;

  // ---------- scenes ----------
  function rocket() {
    const stars = [[40, 60, 2.2], [150, 40, 1.6], [230, 34, 2], [360, 190, 1.8], [330, 250, 1.4], [44, 180, 1.5],
      [370, 350, 2], [250, 370, 1.6], [24, 250, 1.8], [190, 16, 1.3], [300, 24, 1.2], [386, 110, 1.4], [140, 380, 1.5],
      [290, 300, 1.3], [96, 214, 1.2], [340, 20, 1.8], [18, 120, 1.2], [210, 300, 1.1]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
    return svg(`
      <rect width="400" height="400" fill="url(#bg)"/>
      <g fill="#fff">${stars}</g>
      ${sparkle(352, 70, 9)}${sparkle(60, 270, 7, '#fff', 0.85)}${sparkle(262, 352, 8, '#ffe9a6')}
      <g transform="translate(98 108) rotate(-20)">
        <ellipse rx="70" ry="15" fill="none" stroke="#ffd9ad" stroke-width="7" opacity=".85"/>
        <circle r="40" fill="#ff9f5a"/>
        <path d="M-40 4a40 40 0 0 0 80 0" fill="#f2843f"/>
        <ellipse cx="-12" cy="-16" rx="13" ry="6" fill="#ffc08a"/>
        <path d="M-70 0A70 15 0 0 0 70 0" fill="none" stroke="#ffd9ad" stroke-width="7"/>
      </g>
      <g><circle cx="320" cy="318" r="34" fill="#e3e0f7"/><circle cx="308" cy="306" r="8" fill="#c7c2e8"/><circle cx="332" cy="330" r="6" fill="#c7c2e8"/><circle cx="332" cy="302" r="4" fill="#c7c2e8"/></g>
      <g transform="translate(205 198) rotate(38)">
        <circle cy="186" r="13" fill="#fff" opacity=".25"/><circle cx="-4" cy="212" r="9" fill="#fff" opacity=".18"/>
        <path d="M-24 66C-22 110-8 140 0 170C8 140 22 110 24 66Z" fill="url(#flame)"/>
        <path d="M-12 66C-11 92-4 110 0 130C4 110 11 92 12 66Z" fill="#fff7c2" opacity=".9"/>
        <path d="M-34 6C-58 20-68 50-66 82L-30 58Z" fill="#ff4d6d"/>
        <path d="M34 6C58 20 68 50 66 82L30 58Z" fill="#e23a5c"/>
        <path d="M0-112C40-82 46-22 38 58H-38C-46-22-40-82 0-112Z" fill="#f4f6ff"/>
        <g clip-path="url(#body)">
          <rect x="-50" y="-120" width="100" height="58" fill="#ff4d6d"/>
          <rect x="-50" y="40" width="100" height="20" fill="#ff4d6d"/>
          <rect x="14" y="-120" width="40" height="200" fill="#1d2150" opacity=".1"/>
        </g>
        <path d="M-24 58H24L20 72H-20Z" fill="#7d84b5"/>
        <circle cy="-14" r="21" fill="#2b3474"/><circle cy="-14" r="15" fill="#5fd3ff"/><circle cx="-5" cy="-20" r="5" fill="#fff" opacity=".85"/>
        <rect x="-4.5" y="20" width="9" height="54" rx="4.5" fill="#d42f55"/>
      </g>`,
    `<radialGradient id="bg" cx="50%" cy="42%" r="72%"><stop offset="0" stop-color="#3b2f93"/><stop offset=".6" stop-color="#211a63"/><stop offset="1" stop-color="#110d3b"/></radialGradient>
     <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7b0"/><stop offset=".45" stop-color="#ffb52e"/><stop offset="1" stop-color="#ff4d3a" stop-opacity="0"/></linearGradient>
     <clipPath id="body"><path d="M0-112C40-82 46-22 38 58H-38C-46-22-40-82 0-112Z"/></clipPath>`);
  }

  function ship() {
    return svg(`
      <rect width="400" height="400" fill="url(#sky)"/>
      <circle cx="84" cy="88" r="52" fill="#fff3a6" opacity=".55"/><circle cx="84" cy="88" r="34" fill="#ffd84d"/>
      ${cloudPuffs([[300, 84, 22], [326, 74, 28], [354, 86, 20], [312, 96, 18], [340, 98, 16]], '#fff')}
      <rect y="262" width="400" height="138" fill="url(#sea)"/>
      ${wave(264, 10, '#5db8f5')}
      <rect x="194" y="26" width="12" height="226" rx="4" fill="#6b3f22"/>
      <path d="M206 28L248 34L239 45L248 56L206 52Z" fill="#ff5a5f"/>
      <rect x="150" y="60" width="100" height="6" rx="3" fill="#6b3f22"/>
      <path d="M158 66H242Q250 80 246 92H154Q150 80 158 66Z" fill="#fff6e2"/>
      <path d="M200 66H242Q250 80 246 92H200Z" fill="#f1e2c0"/>
      <rect x="140" y="92" width="120" height="7" rx="3.5" fill="#6b3f22"/>
      <path d="M134 99H266Q284 150 272 198H128Q116 150 134 99Z" fill="#fff6e2"/>
      <path d="M200 99H266Q284 150 272 198H200Z" fill="#f1e2c0"/>
      <g transform="translate(200 150)" fill="#2b2b3a">
        <rect x="-31" y="-4" width="62" height="8" rx="4" transform="rotate(35)"/>
        <rect x="-31" y="-4" width="62" height="8" rx="4" transform="rotate(-35)"/>
        <circle r="20"/><rect x="-11" y="10" width="22" height="12" rx="4"/>
        <circle cx="-7" cy="-2" r="5.5" fill="#fff6e2"/><circle cx="7" cy="-2" r="5.5" fill="#fff6e2"/>
      </g>
      <rect x="122" y="198" width="156" height="7" rx="3.5" fill="#6b3f22"/>
      <path d="M80 228H320L312 246H88Z" fill="#c4834f"/>
      <path d="M88 244H312L290 304Q200 320 110 304Z" fill="#9b5d36"/>
      <path d="M96 262H304L299 276H101Z" fill="#7a4626"/>
      <g fill="#ffd46b"><circle cx="140" cy="269" r="5.5"/><circle cx="180" cy="269" r="5.5"/><circle cx="220" cy="269" r="5.5"/><circle cx="260" cy="269" r="5.5"/></g>
      ${wave(302, 14, '#1f78cc')}
      <path d="M0 302q25-14 50 0t50 0t50 0t50 0t50 0t50 0t50 0t50 0" fill="none" stroke="#c4e9ff" stroke-width="5" stroke-linecap="round"/>
      ${wave(350, 12, '#185fae')}
      <g fill="none" stroke="#2b3474" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M300 150q9-10 18 0q9-10 18 0"/><path d="M332 190q7-8 14 0q7-8 14 0"/><path d="M46 170q7-8 14 0q7-8 14 0"/></g>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc8ff"/><stop offset="1" stop-color="#d4f1ff"/></linearGradient>
     <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f9be8"/><stop offset="1" stop-color="#1665b8"/></linearGradient>`);
  }

  function cupcake() {
    let dots = '';
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        dots += `<circle cx="${col * 64 + (row % 2 ? 32 : 0) + 8}" cy="${row * 60 + 14}" r="7"/>`;
      }
    }
    let pleats = '';
    for (let i = 1; i < 7; i++) {
      const xt = 114 + (i * 172) / 7;
      const xb = 138 + (i * 124) / 7;
      pleats += `<path d="M${xt.toFixed(1)} 232L${xb.toFixed(1)} 330" stroke="#e8507f" stroke-width="5" stroke-linecap="round"/>`;
    }
    const sprinkles = [[132, 206, 20, '#ff5d8f'], [160, 220, -30, '#3ec1d3'], [196, 206, 60, '#ffd23f'], [230, 218, -10, '#7bd389'],
      [264, 206, 40, '#9b5de5'], [286, 220, -50, '#ff5d8f'], [148, 172, -40, '#ffd23f'], [184, 182, 15, '#9b5de5'],
      [220, 168, 70, '#ff5d8f'], [254, 180, -20, '#3ec1d3'], [172, 138, 30, '#7bd389'], [206, 148, -60, '#3ec1d3'], [236, 134, 10, '#ffd23f']]
      .map(([x, y, r, c]) => `<rect x="-7" y="-2.5" width="14" height="5" rx="2.5" fill="${c}" transform="translate(${x} ${y}) rotate(${r})"/>`).join('');
    const lolly = (x, y, a, b) => `<rect x="${x - 3.5}" y="${y + 10}" width="7" height="150" rx="3.5" fill="#fff"/>
      <circle cx="${x}" cy="${y}" r="34" fill="${a}"/><circle cx="${x}" cy="${y}" r="25" fill="${b}"/><circle cx="${x}" cy="${y}" r="16" fill="${a}"/><circle cx="${x}" cy="${y}" r="7" fill="${b}"/>`;
    return svg(`
      <rect width="400" height="400" fill="#ffd9ea"/>
      <g fill="#ffc6de">${dots}</g>
      ${lolly(64, 144, '#7cc8ff', '#fff')}
      ${lolly(338, 120, '#ffd23f', '#ff7a59')}
      <ellipse cx="200" cy="334" rx="114" ry="14" fill="#f2a3c4"/>
      <path d="M114 226H286L262 330H138Z" fill="#ff6f9f"/>
      ${pleats}
      <rect x="106" y="218" width="188" height="16" rx="8" fill="#ff86b0"/>
      <rect x="92" y="198" width="216" height="44" rx="22" fill="#ffcfe2"/>
      <rect x="92" y="190" width="216" height="44" rx="22" fill="#fff4f8"/>
      <rect x="114" y="162" width="172" height="42" rx="21" fill="#ffcfe2"/>
      <rect x="114" y="154" width="172" height="42" rx="21" fill="#fff4f8"/>
      <rect x="140" y="128" width="120" height="40" rx="20" fill="#ffcfe2"/>
      <rect x="140" y="120" width="120" height="40" rx="20" fill="#fff4f8"/>
      <path d="M174 126C178 100 198 94 202 76C214 96 228 106 226 126Z" fill="#fff4f8"/>
      ${sprinkles}
      <path d="M204 66C206 52 214 42 228 34" fill="none" stroke="#6b3f22" stroke-width="4" stroke-linecap="round"/>
      <circle cx="204" cy="80" r="20" fill="#e8304a"/><circle cx="197" cy="73" r="6" fill="#ff9aa8"/>
      ${sparkle(46, 262, 9)}${sparkle(354, 262, 8)}${sparkle(286, 46, 9)}${sparkle(120, 52, 7)}`);
  }

  function dino() {
    const spike = (x, y, r) => `<path d="M-11 8L0-16L11 8Z" fill="#ffb84d" transform="translate(${x} ${y}) rotate(${r})" stroke="#ffb84d" stroke-width="4" stroke-linejoin="round"/>`;
    return svg(`
      <rect width="400" height="400" fill="url(#sky)"/>
      <circle cx="328" cy="72" r="44" fill="#fff3a6" opacity=".5"/><circle cx="328" cy="72" r="30" fill="#ffd84d"/>
      <g fill="#e4e8f0"><circle cx="100" cy="112" r="13"/><circle cx="88" cy="90" r="17"/><circle cx="106" cy="64" r="21"/></g>
      <path d="M10 252L80 132H120L190 252Z" fill="#c49a7a"/>
      <path d="M80 132H120L113 148Q100 138 87 148Z" fill="#ff7a45"/>
      <path d="M0 252Q100 204 200 240T400 230V400H0Z" fill="#94d982"/>
      <path d="M332 300Q322 240 340 190" stroke="#a0703f" stroke-width="12" fill="none" stroke-linecap="round"/>
      <g fill="#3fae5a">
        <path d="M340 190Q366 164 394 184Q366 178 340 190Z"/><path d="M340 190Q314 164 286 184Q314 178 340 190Z"/>
        <path d="M340 190Q352 154 380 150Q356 162 340 190Z"/><path d="M340 190Q328 154 300 150Q324 162 340 190Z"/>
      </g>
      <path d="M0 300Q120 270 220 296T400 290V400H0Z" fill="#6cc25a"/>
      ${spike(122, 234, -40)}${spike(150, 220, -18)}${spike(184, 214, 0)}${spike(214, 222, 18)}${spike(240, 214, 30)}${spike(254, 186, 18)}${spike(260, 156, 8)}
      <path d="M130 262C90 262 60 250 28 224C50 262 92 298 142 300Z" fill="#4fbf6a"/>
      <rect x="122" y="290" width="30" height="46" rx="13" fill="#3fa658"/>
      <rect x="212" y="290" width="30" height="46" rx="13" fill="#3fa658"/>
      <ellipse cx="186" cy="268" rx="82" ry="52" fill="#4fbf6a"/>
      <path d="M224 240C252 210 262 176 260 136L298 134C304 182 288 232 252 274Z" fill="#4fbf6a"/>
      <rect x="146" y="296" width="30" height="46" rx="13" fill="#4fbf6a"/>
      <rect x="234" y="294" width="30" height="46" rx="13" fill="#4fbf6a"/>
      <g fill="#fff" opacity=".9"><circle cx="153" cy="338" r="3"/><circle cx="162" cy="339" r="3"/><circle cx="241" cy="336" r="3"/><circle cx="250" cy="337" r="3"/></g>
      <ellipse cx="192" cy="290" rx="56" ry="24" fill="#a8e6a3"/>
      <g fill="#3fa658"><circle cx="160" cy="250" r="9"/><circle cx="190" cy="236" r="7"/><circle cx="214" cy="256" r="8"/><circle cx="136" cy="268" r="6"/></g>
      <ellipse cx="284" cy="124" rx="38" ry="27" fill="#4fbf6a"/>
      <circle cx="290" cy="113" r="9.5" fill="#fff"/><circle cx="292" cy="114" r="5.5" fill="#1d2a3a"/><circle cx="294" cy="111" r="1.9" fill="#fff"/>
      <circle cx="306" cy="132" r="6" fill="#ff9aa2" opacity=".75"/>
      <path d="M294 134Q306 143 318 132" fill="none" stroke="#1d6b35" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="316" cy="117" r="2.3" fill="#1d6b35"/>
      ${flower(56, 336)}${flower(98, 366, '#ffe0f0')}${flower(306, 352)}${flower(356, 326, '#ffe0f0')}`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fe3ff"/><stop offset="1" stop-color="#e9fbff"/></linearGradient>`);
  }

  function ocean() {
    let sandDots = '';
    [[30, 372], [70, 386], [120, 362], [190, 380], [240, 368], [280, 390], [330, 374], [372, 362], [214, 352]]
      .forEach(([x, y]) => { sandDots += `<circle cx="${x}" cy="${y}" r="3"/>`; });
    const smallFish = (x, y, body, tail, flip = false, s = 1) =>
      `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})"><path d="M-18 0L-34-13V13Z" fill="${tail}"/><ellipse rx="22" ry="13" fill="${body}"/><circle cx="10" cy="-3" r="3.2" fill="#1f2a44"/></g>`;
    return svg(`
      <rect width="400" height="400" fill="url(#w)"/>
      <g fill="#fff" opacity=".12"><path d="M60 0H112L40 400H-12Z"/><path d="M180 0H216L192 400H150Z"/><path d="M292 0H344L384 400H322Z"/></g>
      <path d="M0 340Q100 318 200 336T400 330V400H0Z" fill="#f5d58a"/>
      <g fill="#e6bf6a">${sandDots}</g>
      <g fill="none" stroke-linecap="round" stroke-width="11">
        <path d="M50 352Q34 310 54 280T48 206" stroke="#2fb36b"/><path d="M80 354Q94 320 76 296T88 248" stroke="#27a05e"/>
        <path d="M352 346Q336 306 354 276T346 216" stroke="#2fb36b"/>
      </g>
      <path d="M300 346V310M300 324L284 302M300 318L316 296M284 302V288M316 296V282" stroke="#ff7aa2" stroke-width="9" stroke-linecap="round" fill="none"/>
      <path d="${star(150, 352, 17, 8, -90)}" fill="#ff6b8b" stroke="#ff6b8b" stroke-width="5" stroke-linejoin="round"/>
      ${smallFish(92, 96, '#ffd54f', '#ffc93c')}
      ${smallFish(322, 82, '#c3b1f0', '#a993e6', true, 0.8)}
      ${smallFish(320, 284, '#4dd0e1', '#26c6da', true)}
      <g fill="#fff" fill-opacity=".2" stroke="#fff" stroke-width="3"><circle cx="304" cy="164" r="9"/><circle cx="318" cy="136" r="6"/><circle cx="308" cy="114" r="4"/></g>
      <g transform="translate(196 186)">
        <path d="M-88 0L-136-46Q-122 0-136 46Z" fill="#ff7a2f"/>
        <path d="M-30-56Q0-102 46-52Z" fill="#ff7a2f"/>
        <path d="M-10 54Q14 86 38 52Z" fill="#ff7a2f"/>
        <ellipse rx="98" ry="62" fill="#ff8c3a"/>
        <g clip-path="url(#fb)">
          <path d="M-50-70Q-32 0-50 70H-24Q-6 0-24-70Z" fill="#fff" stroke="#1f2a44" stroke-width="4"/>
          <path d="M16-70Q34 0 16 70H42Q60 0 42-70Z" fill="#fff" stroke="#1f2a44" stroke-width="4"/>
        </g>
        <ellipse rx="98" ry="62" fill="none" stroke="#e8701f" stroke-width="3"/>
        <path d="M-12 12Q12 34 28 8Q8 0-12 12Z" fill="#ff7a2f"/>
        <circle cx="64" cy="-14" r="15" fill="#fff"/><circle cx="68" cy="-14" r="8.5" fill="#1f2a44"/><circle cx="71" cy="-17" r="3" fill="#fff"/>
        <circle cx="64" cy="16" r="7" fill="#ff5f6d" opacity=".45"/>
        <path d="M94 14Q86 23 76 18" fill="none" stroke="#1f2a44" stroke-width="3.5" stroke-linecap="round"/>
      </g>`,
    `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#73d8ff"/><stop offset=".55" stop-color="#2a8fdc"/><stop offset="1" stop-color="#1a5fae"/></linearGradient>
     <clipPath id="fb"><ellipse rx="98" ry="62"/></clipPath>`);
  }

  function rainbow() {
    const colors = ['#ff5a5f', '#ff9f1c', '#ffd23f', '#5fd068', '#3ab0ff', '#8e6cff'];
    const arcs = colors.map((c, i) => {
      const r = 156 - i * 18;
      return `<path d="M${200 - r} 284A${r} ${r} 0 0 1 ${200 + r} 284" fill="none" stroke="${c}" stroke-width="19"/>`;
    }).join('');
    let rays = '';
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      rays += `<path d="M${(328 + Math.cos(a) * 40).toFixed(1)} ${(80 + Math.sin(a) * 40).toFixed(1)}L${(328 + Math.cos(a) * 52).toFixed(1)} ${(80 + Math.sin(a) * 52).toFixed(1)}"/>`;
    }
    const cloud = (m) => {
      const pts = [[36, 298, 24], [66, 282, 32], [104, 286, 28], [132, 300, 20]].map(([x, y, r]) => [m ? 400 - x : x, y, r]);
      const rx = m ? 254 : 20;
      return `<g><rect x="${rx}" y="300" width="126" height="28" rx="14" fill="#dcecff"/>${cloudPuffs(pts.map(([x, y, r]) => [x, y + 6, r]), '#dcecff')}
        <rect x="${rx}" y="292" width="126" height="28" rx="14" fill="#fff"/>${cloudPuffs(pts, '#fff')}</g>`;
    };
    return svg(`
      <rect width="400" height="400" fill="url(#s)"/>
      ${sparkle(76, 92, 9)}${sparkle(150, 54, 7)}${sparkle(246, 40, 8)}${sparkle(40, 180, 6)}
      <g stroke="#ffc93c" stroke-width="6" stroke-linecap="round">${rays}</g>
      <circle cx="328" cy="80" r="31" fill="#ffd84d"/>
      <circle cx="318" cy="75" r="3.4" fill="#8a5a00"/><circle cx="338" cy="75" r="3.4" fill="#8a5a00"/>
      <path d="M316 87Q328 97 340 87" fill="none" stroke="#8a5a00" stroke-width="3" stroke-linecap="round"/>
      <circle cx="312" cy="86" r="4" fill="#ff9f7a" opacity=".6"/><circle cx="344" cy="86" r="4" fill="#ff9f7a" opacity=".6"/>
      <path d="M0 300Q100 280 200 296T400 292V400H0Z" fill="#8fdc7a"/>
      ${arcs}
      ${cloud(false)}${cloud(true)}
      <path d="M0 344Q120 322 230 340T400 338V400H0Z" fill="#74c965"/>
      ${flower(60, 362)}${flower(150, 378, '#ffe0f0')}${flower(252, 366)}${flower(342, 360, '#ffe0f0')}${flower(200, 352, '#fff', '#ff9f1c', 0.8)}`,
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe9ff"/><stop offset="1" stop-color="#f3fbff"/></linearGradient>`);
  }

  function kitty() {
    return svg(`
      <rect width="400" height="400" fill="#e6ddff"/>
      ${paw(58, 86, -20, '#d6c9fb')}${paw(338, 64, 18, '#d6c9fb')}${paw(46, 300, 10, '#d6c9fb')}${paw(354, 300, -14, '#d6c9fb')}
      <ellipse cx="200" cy="396" rx="134" ry="86" fill="#ffa94d"/>
      <ellipse cx="200" cy="388" rx="62" ry="58" fill="#fff3e6"/>
      <path d="M100 168L110 62Q116 52 126 58L192 122Z" fill="#ffa94d"/>
      <path d="M300 168L290 62Q284 52 274 58L208 122Z" fill="#ffa94d"/>
      <path d="M118 136L122 82L166 122Z" fill="#ffc2d1"/>
      <path d="M282 136L278 82L234 122Z" fill="#ffc2d1"/>
      <ellipse cx="200" cy="210" rx="124" ry="104" fill="#ffa94d"/>
      <g fill="#f08a24">
        <path d="M188 108Q200 104 212 108L206 144Q200 148 194 144Z"/>
        <path d="M158 116Q168 110 177 112L175 140Q169 142 165 138Z"/>
        <path d="M242 116Q232 110 223 112L225 140Q231 142 235 138Z"/>
        <path d="M78 196Q90 192 102 196Q90 202 78 196Z"/><path d="M80 216Q92 212 104 216Q92 222 80 216Z"/>
        <path d="M322 196Q310 192 298 196Q310 202 322 196Z"/><path d="M320 216Q308 212 296 216Q308 222 320 216Z"/>
      </g>
      <ellipse cx="174" cy="254" rx="34" ry="28" fill="#fff3e6"/><ellipse cx="226" cy="254" rx="34" ry="28" fill="#fff3e6"/>
      <ellipse cx="150" cy="198" rx="21" ry="26" fill="#2a2440"/><ellipse cx="250" cy="198" rx="21" ry="26" fill="#2a2440"/>
      <circle cx="157" cy="188" r="7.5" fill="#fff"/><circle cx="144" cy="208" r="3.5" fill="#fff"/>
      <circle cx="257" cy="188" r="7.5" fill="#fff"/><circle cx="244" cy="208" r="3.5" fill="#fff"/>
      <circle cx="116" cy="246" r="14" fill="#ff8fab" opacity=".45"/><circle cx="284" cy="246" r="14" fill="#ff8fab" opacity=".45"/>
      <path d="M187 233H213Q216 235 212 240L203 248Q200 250 197 248L188 240Q184 235 187 233Z" fill="#ff7aa2"/>
      <path d="M200 248V256M200 256Q192 268 180 262M200 256Q208 268 220 262" fill="none" stroke="#2a2440" stroke-width="3.5" stroke-linecap="round"/>
      <g stroke="#2a2440" stroke-width="3" stroke-linecap="round" opacity=".55"><path d="M138 250L84 242M138 262L86 268M262 250L316 242M262 262L314 268"/></g>
      <g fill="#ffb867"><ellipse cx="146" cy="352" rx="32" ry="20"/><ellipse cx="254" cy="352" rx="32" ry="20"/></g>
      <g stroke="#e8913a" stroke-width="3" stroke-linecap="round"><path d="M136 344V356M150 344V356M244 344V356M258 344V356"/></g>`);
  }

  function train() {
    let sleepers = '';
    for (let x = 4; x < 400; x += 28) sleepers += `<rect x="${x}" y="320" width="14" height="18" rx="2"/>`;
    const wheel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b3474"/><circle cx="${x}" cy="${y}" r="${r * 0.66}" fill="#ffd23f"/><circle cx="${x}" cy="${y}" r="${r * 0.22}" fill="#2b3474"/>`;
    return svg(`
      <rect width="400" height="400" fill="url(#s)"/>
      ${cloudPuffs([[60, 70, 18], [82, 62, 22], [104, 72, 16]], '#fff')}
      ${cloudPuffs([[330, 104, 16], [350, 96, 20], [370, 106, 14]], '#fff')}
      <path d="M0 252Q90 202 180 240T360 230Q384 228 400 236V400H0Z" fill="#a7e09a"/>
      <rect y="300" width="400" height="100" fill="#7dcc6f"/>
      ${flower(40, 368)}${flower(150, 380, '#ffe0f0')}${flower(300, 372)}${flower(372, 356, '#ffe0f0')}
      <rect y="318" width="400" height="22" fill="#c9a27a"/>
      <g fill="#8a5a3c">${sleepers}</g>
      <rect y="321" width="400" height="5" fill="#7a8199"/>
      <g fill="#fff"><circle cx="282" cy="100" r="15" opacity=".95"/><circle cx="256" cy="76" r="21" opacity=".9"/><circle cx="218" cy="56" r="27" opacity=".85"/><circle cx="168" cy="46" r="31" opacity=".75"/></g>
      <rect x="-30" y="176" width="84" height="92" rx="10" fill="#ffd23f"/>
      <rect x="-10" y="192" width="44" height="36" rx="7" fill="#c4f0ff"/>
      <rect x="48" y="258" width="16" height="9" fill="#2b3474"/>
      ${wheel(20, 296, 24)}
      <rect x="276" y="128" width="24" height="52" fill="#2b3474"/>
      <rect x="268" y="116" width="40" height="16" rx="5" fill="#2b3474"/>
      <rect x="150" y="178" width="160" height="80" rx="32" fill="#3a86ff"/>
      <rect x="150" y="178" width="160" height="22" rx="11" fill="#5c9dff" opacity=".7"/>
      <rect x="200" y="178" width="10" height="80" fill="#ffd23f"/><rect x="256" y="178" width="10" height="80" fill="#ffd23f"/>
      <path d="M214 178a18 18 0 0 1 36 0Z" fill="#ffd23f"/>
      <rect x="304" y="196" width="16" height="24" rx="6" fill="#ffe680"/>
      <rect x="66" y="144" width="100" height="124" rx="10" fill="#ff5a5f"/>
      <rect x="56" y="130" width="120" height="22" rx="9" fill="#2b3474"/>
      <rect x="86" y="164" width="60" height="46" rx="9" fill="#c4f0ff" stroke="#fff" stroke-width="5"/>
      <rect x="56" y="256" width="272" height="20" rx="6" fill="#2b3474"/>
      <path d="M322 256H336L358 300H322Z" fill="#ff5a5f"/>
      ${wheel(112, 290, 32)}${wheel(220, 298, 24)}${wheel(282, 298, 24)}
      <rect x="108" y="292" width="180" height="8" rx="4" fill="#c7cde6"/>`,
    `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fdcff"/><stop offset="1" stop-color="#e9f9ff"/></linearGradient>`);
  }

  function plain() {
    let dots = '';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const big = i % 3 === 0;
      dots += `<circle cx="${(200 + Math.sin(a) * 168).toFixed(1)}" cy="${(200 - Math.cos(a) * 168).toFixed(1)}" r="${big ? 7 : 4.5}"/>`;
    }
    return svg(`
      <rect width="400" height="400" fill="url(#p)"/>
      <circle cx="200" cy="200" r="132" fill="none" stroke="#e1e6f4" stroke-width="2"/>
      <g fill="#cbd3ea">${dots}</g>
      <circle cx="200" cy="200" r="9" fill="#cbd3ea"/>`,
    `<radialGradient id="p" cx="50%" cy="38%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eaeef9"/></radialGradient>`);
  }

  const BUILTINS = [
    { id: 'rocket', name: 'Space rocket', draw: rocket },
    { id: 'ship', name: 'Pirate ship', draw: ship },
    { id: 'cupcake', name: 'Cupcake', draw: cupcake },
    { id: 'dino', name: 'Dinosaur', draw: dino },
    { id: 'ocean', name: 'Under the sea', draw: ocean },
    { id: 'rainbow', name: 'Rainbow', draw: rainbow },
    { id: 'kitty', name: 'Kitty', draw: kitty },
    { id: 'train', name: 'Steam train', draw: train },
    { id: 'plain', name: 'Plain clock face', draw: plain },
  ];

  // ---------- generated: friendly monsters ----------
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const hsl = (h, s, l) => `hsl(${Math.round(h)},${s}%,${l}%)`;
  const MONSTER_HUES = [140, 200, 285, 330, 25, 48, 172, 355, 258, 95, 12, 190];
  const SYL_A = ['Bo', 'Zu', 'Fli', 'Gor', 'Mo', 'Pip', 'Wum', 'Ki', 'Lu', 'Ra', 'Snu', 'Tib', 'Yo', 'Gub', 'Nib', 'Ozz', 'Fuz', 'Dro'];
  const SYL_B = ['bble', 'zle', 'po', 'nk', 'mo', 'ggy', 'x', 'li', 'dle', 'boo', 'mp', 'rk', 'ty', 'nzo'];
  const MONSTER_COUNT = 48;

  // Body outlines: [svg element, top y, bottom y, left x, right x, eye y, mouth y]
  function monsterBody(kind) {
    switch (kind) {
      case 0: return ['<circle cx="200" cy="236" r="118"/>', 118, 354, 82, 318, 205, 272];
      case 1: return ['<ellipse cx="200" cy="228" rx="104" ry="132"/>', 96, 360, 96, 304, 185, 262];
      case 2: return ['<ellipse cx="200" cy="252" rx="140" ry="102"/>', 150, 354, 60, 340, 222, 282];
      case 3: {
        let d = 'M82 232A118 118 0 0 1 318 232V336';
        for (let i = 0; i < 6; i++) d += i % 2 ? 'q-20 22-39.3 0' : 'q-20-22-39.3 0';
        return [`<path d="${d}Z"/>`, 114, 344, 82, 318, 205, 268];
      }
      case 4: return [`<path d="${star(200, 240, 130, 114, -90, 26)}"/>`, 110, 370, 70, 330, 208, 276];
      default: return ['<rect x="88" y="116" width="224" height="226" rx="72"/>', 116, 342, 88, 312, 202, 270];
    }
  }

  function monster(n) {
    const r = rng(n * 7919 + 13);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const h = MONSTER_HUES[n % MONSTER_HUES.length] + (r() * 16 - 8);
    const body = hsl(h, 72, 58);
    const dark = hsl(h, 62, 38);
    const light = hsl(h, 90, 80);
    const bgH = (h + 150 + r() * 60) % 360;
    const accent = hsl((h + 180) % 360, 85, 60);
    const kind = n % 6;
    const [shape, top, bottom, left, right, eyeY, mouthY] = monsterBody(kind);
    const eyes = [2, 1, 3, 2][Math.floor(n / 6) % 4];
    const lookX = r() * 2 - 1;
    const lookY = r() * 1.4 - 0.5;
    const sleepy = r() < 0.12;

    let back = '';
    // background confetti
    for (let i = 0; i < 16; i++) {
      const a = r() * Math.PI * 2;
      const dist = 150 + r() * 70;
      const x = (200 + Math.cos(a) * dist).toFixed(1);
      const y = (210 + Math.sin(a) * dist).toFixed(1);
      back += r() < 0.5 ? `<circle cx="${x}" cy="${y}" r="${(4 + r() * 6).toFixed(1)}" fill="#fff" opacity=".55"/>` : sparkle(+x, +y, 6 + r() * 6, '#fff', 0.7);
    }
    back += `<ellipse cx="200" cy="${bottom + 10}" rx="118" ry="16" fill="#000" opacity=".12"/>`;

    // things behind the body: top decoration, arms, feet
    let behind = '';
    const topKind = pick(['horns', 'antennae', 'ears', 'unicorn', 'tuft', 'none', 'horns', 'antennae']);
    const tx = (dir) => 200 + dir * (kind === 2 ? 62 : 48);
    if (topKind === 'horns') {
      [-1, 1].forEach((dir) => {
        const x = tx(dir);
        const y = top + 12;
        behind += `<path d="M${x - 16} ${y + 30}Q${x - 14} ${y - 18} ${x + dir * 24} ${y - 42}Q${x + 6} ${y - 6} ${x + 16} ${y + 30}Z" fill="#fff2d2" stroke="#e5c98f" stroke-width="4" stroke-linejoin="round"/>`;
      });
    } else if (topKind === 'antennae') {
      [-1, 1].forEach((dir) => {
        const x = tx(dir) * 0.6 + 200 * 0.4;
        behind += `<path d="M${x} ${top + 30}L${x + dir * 30} ${top - 46}" stroke="${dark}" stroke-width="7" stroke-linecap="round"/><circle cx="${x + dir * 30}" cy="${top - 50}" r="14" fill="${accent}" stroke="${dark}" stroke-width="4"/>`;
      });
    } else if (topKind === 'ears') {
      [-1, 1].forEach((dir) => {
        const x = tx(dir);
        behind += `<path d="M${x - 32} ${top + 44}L${x + dir * 12} ${top - 40}L${x + 32} ${top + 34}Z" fill="${body}" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/><path d="M${x - 14} ${top + 30}L${x + dir * 9} ${top - 18}L${x + 14} ${top + 26}Z" fill="${light}"/>`;
      });
    } else if (topKind === 'unicorn') {
      behind += `<path d="M184 ${top + 34}L200 ${top - 58}L216 ${top + 34}Z" fill="#ffd54a" stroke="#e2a700" stroke-width="4" stroke-linejoin="round"/>`;
    } else if (topKind === 'tuft') {
      behind += `<path d="M168 ${top + 26}L176 ${top - 26}L192 ${top + 14}L204 ${top - 34}L214 ${top + 14}L232 ${top - 22}L236 ${top + 26}Z" fill="${dark}" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>`;
    }
    const armUp = r() < 0.6;
    [-1, 1].forEach((dir) => {
      const x = dir < 0 ? left + 6 : right - 6;
      const y = eyeY + (armUp ? 40 : 90);
      const rot = dir * (armUp ? 38 : 150);
      behind += `<ellipse cx="${x}" cy="${y}" rx="18" ry="44" fill="${body}" stroke="${dark}" stroke-width="5" transform="rotate(${rot} ${x} ${y}) translate(0 -26)"/>`;
    });
    if (kind !== 3) {
      [-1, 1].forEach((dir) => {
        behind += `<ellipse cx="${200 + dir * 54}" cy="${bottom - 2}" rx="36" ry="21" fill="${dark}"/>`;
      });
    }

    // the body with belly and spots clipped inside it
    let inside = `<ellipse cx="200" cy="${mouthY + 62}" rx="66" ry="48" fill="${light}" opacity=".75"/>`;
    const spots = [[128, 168], [276, 162], [112, 292], [292, 300], [148, 120], [260, 120], [200, 352]];
    spots.forEach(([x, y]) => { if (r() < 0.55) inside += `<circle cx="${x}" cy="${y}" r="${(9 + r() * 9).toFixed(1)}" fill="${dark}" opacity=".35"/>`; });

    // face
    let face = '';
    const eye = (cx, cy, R) => {
      const px = cx + lookX * R * 0.3;
      const py = cy + lookY * R * 0.3;
      let s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${dark}" stroke-width="${(R * 0.13).toFixed(1)}"/>`;
      s += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(R * 0.5).toFixed(1)}" fill="#1d1b2e"/><circle cx="${(px - R * 0.17).toFixed(1)}" cy="${(py - R * 0.19).toFixed(1)}" r="${(R * 0.17).toFixed(1)}" fill="#fff"/>`;
      if (sleepy) s += `<path d="M${cx - R} ${cy}A${R} ${R} 0 0 1 ${cx + R} ${cy}Z" fill="${body}" stroke="${dark}" stroke-width="${(R * 0.13).toFixed(1)}" stroke-linejoin="round"/>`;
      return s;
    };
    if (eyes === 1) face += eye(200, eyeY - 6, 44);
    else if (eyes === 2) face += eye(160, eyeY, 29) + eye(240, eyeY, 29);
    else face += eye(150, eyeY + 6, 23) + eye(200, eyeY - 22, 26) + eye(250, eyeY + 6, 23);
    if (eyes !== 1 && r() < 0.75) face += `<ellipse cx="130" cy="${mouthY - 6}" rx="17" ry="11" fill="#ff7fa3" opacity=".5"/><ellipse cx="270" cy="${mouthY - 6}" rx="17" ry="11" fill="#ff7fa3" opacity=".5"/>`;
    const my = mouthY;
    const mouthKind = pick(['open', 'grin', 'smile', 'o', 'fangs', 'open']);
    if (mouthKind === 'open') {
      const d = `M162 ${my}Q200 ${my + 58} 238 ${my}Z`;
      face += `<clipPath id="m${n}"><path d="${d}"/></clipPath><path d="${d}" fill="#3b1028" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>`;
      face += `<ellipse cx="200" cy="${my + 30}" rx="20" ry="12" fill="#ff7b9c" clip-path="url(#m${n})"/>`;
      face += `<path d="M176 ${my}l8 13 8-13ZM208 ${my}l8 13 8-13Z" fill="#fff"/>`;
    } else if (mouthKind === 'grin') {
      face += `<path d="M150 ${my - 6}Q200 ${my + 46} 250 ${my - 6}Q200 ${my + 12} 150 ${my - 6}Z" fill="#fff" stroke="${dark}" stroke-width="5" stroke-linejoin="round"/>`;
      face += `<path d="M175 ${my + 4}v12M200 ${my + 8}v13M225 ${my + 4}v12" stroke="${dark}" stroke-width="3"/>`;
    } else if (mouthKind === 'smile') {
      face += `<path d="M168 ${my}Q200 ${my + 30} 232 ${my}" fill="none" stroke="${dark}" stroke-width="8" stroke-linecap="round"/>`;
    } else if (mouthKind === 'o') {
      face += `<ellipse cx="200" cy="${my + 10}" rx="15" ry="19" fill="#3b1028" stroke="${dark}" stroke-width="4"/>`;
    } else {
      face += `<path d="M164 ${my}Q200 ${my + 28} 236 ${my}" fill="none" stroke="${dark}" stroke-width="7" stroke-linecap="round"/>`;
      face += `<path d="M178 ${my + 9}l6 16 7-14ZM209 ${my + 11}l7 14 6-16Z" fill="#fff" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }

    const bodyFilled = shape.replace('/>', ` fill="${body}" stroke="${dark}" stroke-width="6" stroke-linejoin="round"/>`);
    return svg(`
      <rect width="400" height="400" fill="url(#bg${n})"/>
      ${back}${behind}${bodyFilled}
      <g clip-path="url(#body${n})">${inside}</g>
      ${face}`,
    `<radialGradient id="bg${n}" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="${hsl(bgH, 90, 92)}"/><stop offset="1" stop-color="${hsl(bgH, 70, 74)}"/></radialGradient>
     <clipPath id="body${n}">${shape}</clipPath>`);
  }

  function monsterName(n) {
    const r = rng(n * 104729 + 7);
    return SYL_A[Math.floor(r() * SYL_A.length)] + SYL_B[Math.floor(r() * SYL_B.length)] + ' the monster';
  }

  // ---------- generated: shape friends ----------
  const SHAPES = [
    ['circle', 'Circle', 0, (f) => `<circle cx="200" cy="205" r="132" ${f} stroke-width="10"/>`, 205],
    ['square', 'Square', 210, (f) => `<rect x="76" y="80" width="248" height="248" rx="30" ${f} stroke-width="10"/>`, 205],
    ['triangle', 'Triangle', 45, (f) => `<path d="M200 70L338 322H62Z" ${f} stroke-width="28"/>`, 245],
    ['star', 'Star', 50, (f) => `<path d="${star(200, 215, 160, 76, -90)}" ${f} stroke-width="20"/>`, 222],
    ['heart', 'Heart', 345, (f) => `<path d="M200 340C80 258 48 168 108 118C148 86 188 104 200 136C212 104 252 86 292 118C352 168 320 258 200 340Z" ${f} stroke-width="10"/>`, 200],
    ['rectangle', 'Rectangle', 160, (f) => `<rect x="48" y="112" width="304" height="190" rx="26" ${f} stroke-width="10"/>`, 207],
    ['oval', 'Oval', 280, (f) => `<ellipse cx="200" cy="205" rx="160" ry="112" ${f} stroke-width="10"/>`, 205],
    ['diamond', 'Diamond', 190, (f) => `<path d="M200 54L338 205L200 356L62 205Z" ${f} stroke-width="20"/>`, 205],
    ['pentagon', 'Pentagon', 120, (f) => `<path d="${polygon(200, 216, 150, 5, 0)}" ${f} stroke-width="20"/>`, 220],
    ['hexagon', 'Hexagon', 25, (f) => `<path d="${polygon(200, 205, 148, 6, 0)}" ${f} stroke-width="20"/>`, 205],
    ['octagon', 'Octagon', 300, (f) => `<path d="${polygon(200, 205, 146, 8, 22.5)}" ${f} stroke-width="20"/>`, 205],
    ['crescent', 'Moon', 55, (f) => `<path d="M238 74A134 134 0 1 0 238 336A112 112 0 1 1 238 74Z" ${f} stroke-width="10"/>`, 205, 122],
    ['cloud', 'Cloud', 205, (f) => `<path d="M110 300C68 300 46 270 52 238C58 208 86 192 112 196C114 150 152 116 198 120C238 124 264 152 270 186C310 176 350 202 350 244C350 278 324 300 292 300Z" ${f} stroke-width="10"/>`, 232],
    ['plus', 'Plus', 0, (f) => `<path d="M156 70H244V160H334V250H244V340H156V250H66V160H156Z" ${f} stroke-width="22"/>`, 205],
    ['half', 'Half circle', 230, (f) => `<path d="M60 270A140 140 0 0 1 340 270Z" ${f} stroke-width="20"/>`, 222],
    ['flower', 'Flower', 320, (f, light) => {
      let p = '';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        p += `<circle cx="${(200 + Math.cos(a) * 92).toFixed(1)}" cy="${(208 + Math.sin(a) * 92).toFixed(1)}" r="62" ${f} stroke-width="10"/>`;
      }
      return p + `<circle cx="200" cy="208" r="78" fill="#ffd54a" stroke="#e2a700" stroke-width="8"/>`;
    }, 208],
  ];

  function polygon(cx, cy, R, n, rotDeg) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = ((rotDeg - 90 + (i * 360) / n) * Math.PI) / 180;
      d += (i ? 'L' : 'M') + (cx + R * Math.cos(a)).toFixed(1) + ' ' + (cy + R * Math.sin(a)).toFixed(1);
    }
    return d + 'Z';
  }

  function shapeFriend(i) {
    const [, , hue, draw, faceY, faceX = 200] = SHAPES[i];
    const fill = hsl(hue, 82, 60);
    const dark = hsl(hue, 70, 38);
    const light = hsl(hue, 90, 82);
    const bgH = (hue + 180) % 360;
    const attrs = `fill="${fill}" stroke="${dark}" stroke-linejoin="round"`;
    let dots = '';
    for (let y = 20; y < 400; y += 52) for (let x = (y / 52) % 2 ? 46 : 20; x < 400; x += 52) dots += `<circle cx="${x}" cy="${y}" r="7"/>`;
    const fx = faceX;
    const fy = faceY;
    const eye = (x) => `<ellipse cx="${x}" cy="${fy - 8}" rx="14" ry="17" fill="#fff" stroke="${dark}" stroke-width="3"/><circle cx="${x + 2}" cy="${fy - 5}" r="8" fill="#1d1b2e"/><circle cx="${x - 2}" cy="${fy - 10}" r="3" fill="#fff"/>`;
    return svg(`
      <rect width="400" height="400" fill="${hsl(bgH, 85, 90)}"/>
      <g fill="${hsl(bgH, 70, 82)}">${dots}</g>
      <ellipse cx="200" cy="362" rx="120" ry="14" fill="#000" opacity=".1"/>
      ${draw(attrs, light)}
      ${eye(fx - 30)}${eye(fx + 30)}
      <ellipse cx="${fx - 54}" cy="${fy + 18}" rx="13" ry="8" fill="#ff7fa3" opacity=".55"/><ellipse cx="${fx + 54}" cy="${fy + 18}" rx="13" ry="8" fill="#ff7fa3" opacity=".55"/>
      <path d="M${fx - 20} ${fy + 20}Q${fx} ${fy + 40} ${fx + 20} ${fy + 20}" fill="none" stroke="${dark}" stroke-width="6" stroke-linecap="round"/>`);
  }

  // ---------- one catalog for everything ----------
  const CATEGORIES = [
    { id: 'scenes', name: 'Picture scenes' },
    { id: 'animals', name: 'Animals' },
    { id: 'monsters', name: 'Monsters and magic' },
    { id: 'shapes', name: 'Shapes' },
    { id: 'food', name: 'Food and sweets' },
    { id: 'vehicles', name: 'Things that go' },
    { id: 'nature', name: 'Nature and sky' },
    { id: 'fun', name: 'Toys and fun' },
  ];

  const ITEMS = [];
  const BY_ID = new Map();
  const add = (item) => { ITEMS.push(item); BY_ID.set(item.id, item); };
  BUILTINS.forEach((b) => add({ id: b.id, name: b.name, cat: 'scenes', kind: 'scene', surprise: b.id !== 'plain' }));
  for (let n = 1; n <= MONSTER_COUNT; n++) add({ id: `m:${n}`, name: monsterName(n), cat: 'monsters', kind: 'monster', surprise: true });
  SHAPES.forEach((s, i) => add({ id: `s:${s[0]}`, name: s[1], cat: 'shapes', kind: 'shape', index: i, surprise: true }));
  (PK.library || []).forEach(([src, file, name, cat]) => add({
    id: `${src}:${file}`, name, cat, kind: 'sticker', surprise: true,
    url: `library/${src === 'n' ? 'noto' : 'fluent'}/${file}.svg`,
  }));

  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const cache = new Map();
  const toData = (markup) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(markup.replace(/\s{2,}/g, ' '));

  PK.pictures = {
    categories: CATEGORIES,
    items: ITEMS,
    builtins: BUILTINS.map(({ id, name }) => ({ id, name })),
    get: (id) => BY_ID.get(id) || null,
    has: (id) => BY_ID.has(id),
    name: (id) => (BY_ID.get(id) || {}).name,
    /** Image URL for any catalog picture. */
    src(id) {
      const item = BY_ID.get(id) || BY_ID.get('rocket');
      if (item.url) return item.url;
      if (cache.has(item.id)) return cache.get(item.id);
      let url;
      if (item.kind === 'monster') url = toData(monster(Number(item.id.slice(2))));
      else if (item.kind === 'shape') url = toData(shapeFriend(item.index));
      else url = toData(BUILTINS.find((b) => b.id === item.id).draw());
      cache.set(item.id, url);
      return url;
    },
    /** Stickers (transparent emoji art) sit on a sunburst background; returns the CSS for it, or '' for full scenes. */
    backdrop(id) {
      const item = BY_ID.get(id);
      if (!item || item.kind !== 'sticker') return '';
      const h = hash(id) % 360;
      return `repeating-conic-gradient(from 0deg at 50% 46%, rgba(255,255,255,.2) 0deg 9deg, rgba(255,255,255,0) 9deg 18deg), radial-gradient(circle at 50% 46%, hsl(${h},95%,94%) 0%, hsl(${h},85%,82%) 50%, hsl(${h},70%,68%) 100%)`;
    },
    /** A picture that never needs the network (used if a library file cannot load offline). */
    offlineFallback(id) {
      return `m:${(hash(id || 'x') % MONSTER_COUNT) + 1}`;
    },
  };
})();
