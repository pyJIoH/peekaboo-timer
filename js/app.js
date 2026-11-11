/* Peekaboo Timer — app wiring: states, controls, persistence, wake lock, notifications. */
(function () {
  'use strict';
  const PK = window.PK;
  const { $, $$, store, clamp, formatClock, formatShort, formatSpoken } = PK;

  const SEC = 1000;
  const MIN = 60 * SEC;
  const SETTINGS_VERSION = 2;

  const DEFAULT_SETTINGS = {
    digits: true,
    reveal: 'gradual',
    color: 'traffic',
    step: 10 * SEC,
    tick: 'clock',
    tickRate: 2,
    tickVolume: 0.85,
    pips: true,
    endSound: 'fireworks',
    endVolume: 0.9,
    repeatEnd: false,
    sky: 'auto',
    theme: 'system',
    wakeLock: true,
    notify: false,
    muted: false,
    surprise: null, // picture groups used by "Surprise me"; null = all
    v: SETTINGS_VERSION,
  };

  const EXAMPLE_ROUTINES = [
    { id: 'ex-teeth', name: '🪥 Brush teeth', duration: 2 * MIN, picture: 'random' },
    { id: 'ex-shoes', name: '👟 Shoes and coat', duration: 3 * MIN, picture: 'random' },
    { id: 'ex-dress', name: '👕 Get dressed', duration: 5 * MIN, picture: 'random' },
    { id: 'ex-turns', name: '🤝 Take turns', duration: 5 * MIN, picture: 'random' },
    { id: 'ex-tidy', name: '🧸 Tidy up', duration: 10 * MIN, picture: 'random' },
  ];

  // ---------- state ----------
  const storedSettings = store.get('settings', {}) || {};
  const settings = Object.assign({}, DEFAULT_SETTINGS, storedSettings);
  if (storedSettings.v !== SETTINGS_VERSION) {
    // v2: louder tick-tock twice a second, and the fireworks ending, become the defaults.
    Object.assign(settings, {
      tick: storedSettings.tick === 'off' ? 'off' : (storedSettings.tick || 'clock'),
      tickRate: 2,
      tickVolume: Math.max(Number(storedSettings.tickVolume) || 0, DEFAULT_SETTINGS.tickVolume),
      endSound: 'fireworks',
      endVolume: Math.max(Number(storedSettings.endVolume) || 0, DEFAULT_SETTINGS.endVolume),
      v: SETTINGS_VERSION,
    });
    store.set('settings', settings);
  }
  const setup = Object.assign({ duration: 5 * MIN, picture: 'random', label: '' }, store.get('setup', {}));
  if (!(setup.duration >= 0 && setup.duration <= PK.Timer.MAX)) setup.duration = 5 * MIN;
  let routines = store.get('presets', null);
  if (!Array.isArray(routines)) routines = EXAMPLE_ROUTINES.map((r) => Object.assign({}, r));
  if (setup.v !== 2) {
    // The big picture library arrived: every start is a surprise by default.
    setup.picture = 'random';
    setup.v = 2;
    store.set('setup', setup);
    routines.forEach((r) => { if (String(r.id).startsWith('ex-')) r.picture = 'random'; });
    store.set('presets', routines);
  }
  const timer = PK.Timer.restore(store.get('timer', null));
  let photos = []; // { id, url }
  let photosLoaded = false;
  let view = 'setup';

  const saveSettings = () => store.set('settings', settings);
  const saveSetup = () => store.set('setup', setup);
  const saveRoutines = () => store.set('presets', routines);
  const saveTimer = () => (timer.status === 'idle' ? store.remove('timer') : store.set('timer', timer));

  // ---------- elements ----------
  const app = $('#app');
  const dialEl = $('#dial');
  const dial = new PK.Dial(dialEl);
  const els = {
    label: $('#deviceLabel'), readout: $('#readout'), bump: $('#bump'), controls: $('#controls'),
    ctlRow: $('#ctlRow'), picBtn: $('#picBtn'), startBtn: $('#startBtn'),
    pauseBtn: $('#pauseBtn'), stopBtn: $('#stopBtn'), minusCoin: $('#minusCoin'), plusCoin: $('#plusCoin'),
    muteBtn: $('#muteBtn'), digitsBtn: $('#digitsBtn'), fullBtn: $('#fullBtn'), installBtn: $('#installBtn'),
    soundHint: $('#soundHint'), toast: $('#toast'), picker: $('#picker'), photoInput: $('#photoInput'),
    pictureSheet: $('#pictureSheet'), routineSheet: $('#routineSheet'), settingsSheet: $('#settingsSheet'),
  };

  // ---------- pictures ----------
  const photoUrl = (id) => { const p = photos.find((x) => x.id === id); return p ? p.url : null; };
  const isPhoto = (id) => typeof id === 'string' && id.startsWith('photo-');
  const pictureExists = (id) => id === 'random' || PK.pictures.has(id) || !!photoUrl(id) || (isPhoto(id) && !photosLoaded);
  const pictureSrc = (id) => photoUrl(id) || PK.pictures.src(PK.pictures.has(id) ? id : 'rocket');
  const backdropFor = (id) => (isPhoto(id) ? '' : PK.pictures.backdrop(id));
  const showPicture = (id) => dial.setPicture(pictureSrc(id), backdropFor(id));
  function pictureLabel(id) {
    if (id === 'random') return 'Surprise me';
    if (isPhoto(id)) return 'Your photo';
    return PK.pictures.name(id) || 'Picture';
  }
  function picturePhrase(id) {
    if (id === 'random') return 'a surprise picture';
    if (isPhoto(id)) return 'your photo';
    return `the ${(PK.pictures.name(id) || 'picture').toLowerCase()} picture`;
  }

  /** A round thumbnail for any picture (sticker art gets its coloured backdrop). */
  function thumb(id, className) {
    const span = document.createElement('span');
    span.className = className;
    if (id === 'random') {
      span.classList.add('pic-random');
      span.textContent = '?';
      return span;
    }
    const bd = backdropFor(id);
    if (bd) span.style.backgroundImage = bd;
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.loading = 'lazy';
    img.draggable = false;
    if (bd) img.className = 'sticker';
    img.src = pictureSrc(id);
    span.appendChild(img);
    return span;
  }

  // "Surprise me": a shuffled deck, so every picture shows once before any repeats.
  const ALL_GROUPS = PK.pictures.categories.map((c) => c.id).concat('photos');
  function surprisePool() {
    const groups = new Set(Array.isArray(settings.surprise) && settings.surprise.length ? settings.surprise : ALL_GROUPS);
    let pool = PK.pictures.items.filter((i) => i.surprise && groups.has(i.cat)).map((i) => i.id);
    if (groups.has('photos')) pool = pool.concat(photos.map((p) => p.id));
    return pool.length ? pool : PK.pictures.items.filter((i) => i.surprise).map((i) => i.id);
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function pickRandom() {
    const pool = surprisePool();
    const inPool = new Set(pool);
    let deck = (store.get('deck', []) || []).filter((id) => inPool.has(id));
    if (!deck.length) {
      deck = shuffle(pool.slice());
      if (deck.length > 1 && deck[0] === store.get('lastRandom', null)) deck.push(deck.shift());
    }
    const pick = deck.shift();
    store.set('deck', deck);
    store.set('lastRandom', pick);
    prefetch(deck[0]);
    return pick;
  }
  /** Warm the cache with the next surprise so it appears instantly (and works offline later). */
  function prefetch(id) {
    const item = id && PK.pictures.get(id);
    if (item && item.url) { const im = new Image(); im.src = item.url; }
  }
  const coverColor = (f) => PK.Dial.coverColor(settings.color, f);

  // ---------- small display helpers ----------
  function setLabel(text) {
    els.label.hidden = !text;
    els.label.textContent = text || '';
  }
  let readoutText = null;
  function setReadout(text) {
    if (text === readoutText) return;
    readoutText = text;
    if (text == null) { els.readout.hidden = true; return; }
    els.readout.hidden = false;
    if (/^[\d:]+$/.test(text)) {
      els.readout.innerHTML = Array.from(text).map((ch) => (ch === ':' ? '<span class="c">:</span>' : `<span class="d">${ch}</span>`)).join('');
    } else {
      els.readout.textContent = text;
    }
  }
  function bump(text, fromEl) {
    const el = els.bump;
    el.textContent = text;
    if (fromEl) {
      const c = els.controls.getBoundingClientRect();
      const b = fromEl.getBoundingClientRect();
      el.style.left = `${b.left + b.width / 2 - c.left}px`;
      el.style.top = `${b.top - c.top - 26}px`;
    }
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  // ---------- views ----------
  function setView(v) {
    view = v;
    app.dataset.view = v;
    if (v !== 'run') app.classList.remove('is-idle');
    if (v !== 'done') dial.face.classList.remove('spin');
    updateSoundHint();
  }

  // ---------- setup: wheels ----------
  let syncingWheels = false;
  const wheelOpts = (count, label) => ({ count, label, onChange: onWheel, onTick: wheelTick });
  const wheels = {
    m: new PK.Wheel($('#wheelM'), wheelOpts(PK.Timer.MAX_MINUTES + 1, 'Minutes')),
    s: new PK.Wheel($('#wheelS'), wheelOpts(60, 'Seconds')),
  };
  function wheelTick() {
    PK.sound.wheelClick();
    try { if (navigator.vibrate) navigator.vibrate(4); } catch (e) { /* ignore */ }
  }
  function onWheel() {
    if (syncingWheels) return;
    setup.duration = (wheels.m.value * 60 + wheels.s.value) * SEC;
    setup.label = '';
    saveSetup();
    updateSetupMeta();
  }
  function syncWheels() {
    syncingWheels = true;
    const t = Math.round(setup.duration / SEC);
    wheels.m.set(Math.min(PK.Timer.MAX_MINUTES, Math.floor(t / 60)));
    wheels.s.set(t % 60);
    syncingWheels = false;
  }
  function sizeWheels() {
    const w = dialEl.getBoundingClientRect().width;
    if (!w) return;
    els.picker.style.setProperty('--wh', `${Math.max(22, Math.round(w * 0.1))}px`);
    if (view === 'setup') syncWheels();
  }
  if (window.ResizeObserver) new ResizeObserver(sizeWheels).observe(dialEl);
  else window.addEventListener('resize', sizeWheels);

  function updateSetupMeta() {
    els.startBtn.disabled = setup.duration < SEC;
    dialEl.setAttribute('aria-label', setup.duration >= SEC ? `Timer set to ${formatSpoken(setup.duration)}` : 'Set a time with the wheels');
    setLabel(setup.label || '');
    // Same place as the countdown later, so Start just makes the numbers begin to move.
    if (view === 'setup') setReadout(settings.digits && setup.duration >= SEC ? formatClock(setup.duration) : null);
  }

  function updatePicCoin() {
    const b = els.picBtn;
    b.innerHTML = '';
    b.style.backgroundImage = '';
    if (setup.picture === 'random') {
      b.classList.add('is-random');
      b.innerHTML = '<span aria-hidden="true">?</span>';
    } else {
      b.classList.remove('is-random');
      const t = thumb(setup.picture, 'coin-thumb');
      b.style.backgroundImage = t.style.backgroundImage;
      b.append(...t.childNodes);
    }
    b.setAttribute('aria-label', `Hidden picture: ${pictureLabel(setup.picture)}. Tap to change it.`);
    b.title = pictureLabel(setup.picture);
  }

  function renderSetup() {
    if (view !== 'setup') return;
    dial.setSecret(settings.reveal === 'surprise');
    dial.setFraction(1);
    dial.setColor(coverColor(1));
    dial.setCount(null);
    if (setup.picture === 'random') dial.setPicture(PK.pictures.src('plain'), '');
    else showPicture(setup.picture);
    syncWheels();
    updateSetupMeta();
    updatePicCoin();
    document.title = 'Peekaboo Timer';
    resetFavicon();
  }

  function setDuration(ms) {
    setup.duration = clamp(Math.round(ms / SEC) * SEC, 0, PK.Timer.MAX);
    setup.label = '';
    saveSetup();
    renderSetup();
  }

  // A quick "peekaboo": the cover lifts a little to tease the picture, then closes.
  let peekRaf = 0;
  function peek() {
    if (view !== 'setup' || PK.reducedMotion()) return;
    cancelAnimationFrame(peekRaf);
    const t0 = performance.now();
    const D = 1500;
    const depth = 0.3;
    const step = (t) => {
      if (view !== 'setup') return;
      const p = (t - t0) / D;
      let open;
      if (p < 0.3) open = PK.smooth(p / 0.3);
      else if (p < 0.6) open = 1;
      else open = 1 - PK.smooth(Math.min(1, (p - 0.6) / 0.4));
      dial.setFraction(1 - depth * open);
      if (p < 1) peekRaf = requestAnimationFrame(step);
      else dial.setFraction(1);
    };
    peekRaf = requestAnimationFrame(step);
  }

  // ---------- picture sheet ----------
  let gridKey = '';
  function tile(id, name, photo) {
    const cell = document.createElement('div');
    cell.className = 'pic-cell';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pic-tile' + (id === 'random' ? ' pic-random' : '');
    b.dataset.id = id;
    const label = document.createElement('span');
    label.textContent = name;
    b.append(thumb(id, 'pic-img'), label);
    cell.appendChild(b);
    if (photo) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'pic-del';
      del.dataset.del = id;
      del.setAttribute('aria-label', 'Delete this photo');
      del.innerHTML = '<svg class="ico"><use href="#i-close"/></svg>';
      cell.appendChild(del);
    }
    return cell;
  }
  function section(title, count, cells) {
    const sec = document.createElement('section');
    sec.className = 'pic-section';
    const h = document.createElement('h3');
    h.textContent = title;
    if (count != null) { const c = document.createElement('span'); c.textContent = String(count); h.appendChild(c); }
    const grid = document.createElement('div');
    grid.className = 'pic-grid';
    cells.forEach((c) => grid.appendChild(c));
    sec.append(h, grid);
    return sec;
  }
  function buildPictureGrid() {
    const host = $('#pictureGrid');
    const key = photos.map((p) => p.id).join(',');
    if (key !== gridKey || !host.childElementCount) {
      gridKey = key;
      host.innerHTML = '';
      const add = document.createElement('div');
      add.className = 'pic-cell';
      add.innerHTML = '<button type="button" class="pic-tile pic-add" data-add="1" aria-label="Add your own photo"><span class="pic-img"><svg class="ico"><use href="#i-photo"/></svg></span><span>Add a photo</span></button>';
      host.appendChild(section('Surprise', null, [tile('random', 'Surprise me'), add]));
      if (photos.length) host.appendChild(section('Your photos', photos.length, photos.map((p) => tile(p.id, 'Your photo', true))));
      PK.pictures.categories.forEach((cat) => {
        const items = PK.pictures.items.filter((i) => i.cat === cat.id);
        host.appendChild(section(cat.name, items.length, items.map((i) => tile(i.id, i.name))));
      });
    }
    $$('.pic-tile[data-id]', host).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === setup.picture)));
  }
  $('#pictureGrid').addEventListener('click', (e) => {
    const del = e.target.closest('.pic-del');
    if (del) { deletePhoto(del.dataset.del, del); return; }
    const t = e.target.closest('.pic-tile');
    if (!t) return;
    if (t.dataset.add) { els.photoInput.click(); return; }
    closeSheet(els.pictureSheet);
    choosePicture(t.dataset.id);
  });

  function choosePicture(id) {
    setup.picture = id;
    setup.label = '';
    saveSetup();
    renderSetup();
    if (id !== 'random') setTimeout(peek, 120);
  }

  async function deletePhoto(id, btn) {
    if (!btn.classList.contains('confirm')) {
      btn.classList.add('confirm');
      btn.setAttribute('aria-label', 'Tap again to delete this photo');
      toast('Tap the red button again to delete this photo');
      setTimeout(() => { btn.classList.remove('confirm'); btn.setAttribute('aria-label', 'Delete this photo'); }, 3500);
      return;
    }
    await PK.photos.remove(id);
    const p = photos.find((x) => x.id === id);
    if (p) URL.revokeObjectURL(p.url);
    photos = photos.filter((x) => x.id !== id);
    if (setup.picture === id) { setup.picture = 'rocket'; saveSetup(); }
    routines.forEach((r) => { if (r.picture === id) r.picture = 'random'; });
    saveRoutines();
    gridKey = '#';
    buildPictureGrid();
    renderSetup();
    toast('Photo deleted');
  }

  els.photoInput.addEventListener('change', async () => {
    const file = els.photoInput.files && els.photoInput.files[0];
    els.photoInput.value = '';
    if (!file) return;
    try {
      const row = await PK.photos.add(file);
      photos.push({ id: row.id, url: URL.createObjectURL(row.blob) });
      store.set('deck', [row.id].concat(store.get('deck', []) || [])); // show it on the very next surprise
      buildPictureGrid();
      toast('Photo added. It will be the next surprise, and it stays on this device.');
    } catch (e) {
      toast('That photo could not be opened. Try a JPEG or PNG file.');
    }
  });

  // ---------- routines sheet ----------
  const routineThumb = (pic) => thumb(pic, 'routine-thumb');

  function renderRoutineList() {
    const ul = $('#routineList');
    ul.innerHTML = '';
    if (!routines.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No routines yet. Set a time and a picture, then save them below.';
      ul.appendChild(li);
    }
    routines.forEach((r) => {
      const li = document.createElement('li');
      li.className = 'routine-item';
      const go = document.createElement('button');
      go.type = 'button';
      go.className = 'routine-go';
      go.setAttribute('aria-label', `Start ${r.name}, ${formatSpoken(r.duration)}`);
      const name = document.createElement('span');
      name.className = 'routine-name';
      name.textContent = r.name;
      const time = document.createElement('span');
      time.className = 'routine-time';
      time.textContent = formatClock(r.duration);
      go.append(routineThumb(r.picture), name, time);
      go.addEventListener('click', () => { closeSheet(els.routineSheet); startRoutine(r); });
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'routine-del';
      del.setAttribute('aria-label', `Delete ${r.name}`);
      del.innerHTML = '<svg class="ico"><use href="#i-trash"/></svg>';
      del.addEventListener('click', () => {
        if (!del.classList.contains('confirm')) {
          del.classList.add('confirm');
          del.setAttribute('aria-label', `Tap again to delete ${r.name}`);
          setTimeout(() => del.classList.remove('confirm'), 3500);
          return;
        }
        routines = routines.filter((x) => x !== r);
        saveRoutines();
        renderRoutineList();
      });
      li.append(go, del);
      ul.appendChild(li);
    });
  }

  function updateRoutineHint() {
    $('#routineHint').textContent = setup.duration >= SEC
      ? `${formatShort(setup.duration)} with ${picturePhrase(setup.picture)}. Using a name that already exists updates that routine.`
      : 'Set a time with the wheels first.';
  }

  function openRoutineSheet() {
    renderRoutineList();
    updateRoutineHint();
    openSheet(els.routineSheet);
  }

  function startRoutine(r) {
    setup.duration = r.duration;
    setup.picture = pictureExists(r.picture) ? r.picture : 'random';
    setup.label = r.name;
    saveSetup();
    startTimer({ duration: r.duration, picture: setup.picture, label: r.name, routineId: r.id });
  }

  $('#routineForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#routineName');
    const name = input.value.trim();
    if (setup.duration < SEC) { toast('Set a time with the wheels first'); return; }
    if (!name) { input.focus(); toast('Type a name for the routine first'); return; }
    const existing = routines.find((r) => r.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      Object.assign(existing, { name, duration: setup.duration, picture: setup.picture });
      toast(`Updated “${name}”`);
    } else {
      routines.push({ id: 'r-' + PK.uid(), name, duration: setup.duration, picture: setup.picture });
      toast(`Saved “${name}”`);
    }
    input.value = '';
    input.blur();
    saveRoutines();
    renderRoutineList();
  });

  $('#routinesRestore').addEventListener('click', () => {
    let added = 0;
    EXAMPLE_ROUTINES.forEach((ex) => {
      if (!routines.some((r) => r.id === ex.id)) { routines.push(Object.assign({}, ex)); added++; }
    });
    saveRoutines();
    renderRoutineList();
    toast(added ? 'Example routines added back' : 'The example routines are already there');
  });

  // ---------- run ----------
  function startTimer(opts) {
    if (!(opts.duration >= SEC)) return;
    PK.sound.unlock();
    PK.sound.stopEnd();
    PK.fireworks.stop();
    const chosen = opts.picture;
    const pic = chosen === 'random' ? pickRandom() : (pictureExists(chosen) ? chosen : 'rocket');
    timer.start(opts.duration, { picture: pic, chosen, label: opts.label || '', routineId: opts.routineId || null });
    saveTimer();
    enterRun();
    PK.sound.startChirp();
  }

  function enterRun() {
    setView('run');
    const m = timer.meta;
    showPicture(m.picture);
    dial.setSecret(settings.reveal === 'surprise');
    setLabel(m.label || '');
    updatePauseBtn();
    updateRunTools();
    updateStepLabels();
    holdWake();
    beat.start();
    PK.sound.cancelTicks();
    lastSecond = -1;
    onBeat();
    render();
    kick();
    poke();
  }

  let raf = 0;
  let lastSecond = -1;
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function frame() {
    raf = 0;
    render();
    if (view === 'run' && timer.status === 'running') kick();
  }

  function render() {
    if (view !== 'run') return;
    if (timer.isOver()) { finish(); return; }
    const left = timer.left();
    const f = timer.fraction();
    dial.setFraction(f);
    dial.setColor(coverColor(f));
    const sec = Math.ceil(left / SEC - 1e-6);
    dial.setCount(sec >= 1 && sec <= 5 ? sec : null);
    setReadout(settings.digits ? formatClock(left) : null);
    if (sec !== lastSecond) { lastSecond = sec; secondChanged(left, f); }
  }

  function secondChanged(left, f) {
    const clock = formatClock(left);
    const label = timer.meta.label || 'Peekaboo';
    document.title = timer.status === 'paused' ? `Paused ${clock} · ${label}` : `${clock} · ${label}`;
    drawFavicon(f, coverColor(f));
    dialEl.setAttribute('aria-label', `${formatSpoken(left)} left${timer.status === 'paused' ? ', paused' : ''}`);
  }

  // Background-safe heartbeat: schedules ticks and catches the end even when rAF is paused.
  const beat = PK.heartbeat(onBeat, 250);
  function onBeat() {
    if (timer.status === 'running' && timer.isOver()) { finish(); return; }
    if (timer.status === 'running') PK.sound.scheduleTicks(timer, settings);
    if (document.hidden && view === 'run') {
      const left = timer.left();
      const sec = Math.ceil(left / SEC);
      if (sec !== lastSecond) { lastSecond = sec; secondChanged(left, timer.fraction()); }
    }
  }

  function togglePause() {
    if (view !== 'run' || !timer.toggle()) return;
    PK.sound.unlock();
    PK.sound.cancelTicks();
    saveTimer();
    updatePauseBtn();
    lastSecond = -1;
    onBeat();
    render();
    kick();
  }

  function updatePauseBtn() {
    const running = timer.status === 'running';
    els.pauseBtn.setAttribute('aria-label', running ? 'Pause' : 'Keep going');
    els.pauseBtn.title = running ? 'Pause (Space)' : 'Keep going (Space)';
    els.pauseBtn.querySelector('use').setAttribute('href', running ? '#i-pause' : '#i-play');
    if (view === 'run') setLabel(running ? (timer.meta.label || '') : 'Paused');
  }

  function adjust(delta, fromEl) {
    if (view !== 'run' || !timer.adjust(delta)) return;
    PK.sound.cancelTicks();
    saveTimer();
    lastSecond = -1;
    onBeat();
    render();
    kick();
    bump(`${delta > 0 ? '+' : '−'}${formatShort(Math.abs(delta))}`, fromEl || (delta > 0 ? els.plusCoin : els.minusCoin));
  }

  function stepLabel(ms) {
    return ms >= MIN ? `${ms / MIN}m` : String(ms / SEC);
  }
  function updateStepLabels() {
    const s = settings.step;
    $('#minusNum').textContent = `−${stepLabel(s)}`;
    $('#plusNum').textContent = `+${stepLabel(s)}`;
    els.minusCoin.setAttribute('aria-label', `${formatSpoken(s)} less`);
    els.plusCoin.setAttribute('aria-label', `${formatSpoken(s)} more`);
  }

  [els.minusCoin, els.plusCoin].forEach((btn) => {
    holdRepeat(btn, () => adjust(btn.dataset.adjust === 'small' ? settings.step : -settings.step, btn));
  });

  function updateRunTools() {
    const muted = settings.muted;
    els.muteBtn.querySelector('use').setAttribute('href', muted ? '#i-mute' : '#i-sound');
    els.muteBtn.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
    els.digitsBtn.setAttribute('aria-pressed', String(!!settings.digits));
    els.digitsBtn.setAttribute('aria-label', settings.digits ? 'Hide the time under the circle' : 'Show the time under the circle');
  }

  function toggleMute() { setSetting('muted', !settings.muted); PK.sound.unlock(); }
  function toggleDigits() { setSetting('digits', !settings.digits); }

  const fsEnabled = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  els.fullBtn.hidden = !fsEnabled;
  function toggleFullscreen() {
    if (!fsEnabled) return;
    const d = document;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      } else {
        const el = d.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        const p = req && req.call(el);
        if (p && p.catch) p.catch(() => toast('Full screen is not available here'));
      }
    } catch (e) { /* ignore */ }
  }

  // Controls fade after a few seconds so the child sees only the timer.
  let idleTimer = 0;
  function poke() {
    app.classList.remove('is-idle');
    clearTimeout(idleTimer);
    if (view !== 'run') return;
    idleTimer = setTimeout(() => {
      if (view === 'run' && timer.status === 'running' && !anySheetOpen()) app.classList.add('is-idle');
    }, 5000);
  }

  // ---------- done ----------
  let wakeReleaseTimer = 0;
  let celebrateUntil = 0;

  function finish() {
    if (timer.status !== 'running' && timer.status !== 'paused') return;
    timer.finish();
    saveTimer();
    beat.stop();
    PK.sound.cancelTicks();
    showDone(true);
  }

  function dialHole() {
    const r = dialEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
  }

  function celebrate() {
    const name = settings.endSound;
    const fwGain = name === 'fireworks' ? 1 : 0.35;
    if (name !== 'fireworks') PK.sound.playEnd(name, { repeat: settings.repeatEnd });
    celebrateUntil = Date.now() + 3 * MIN;
    const run = () => {
      const r = dialEl.getBoundingClientRect();
      PK.fireworks.show({
        hole: { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 },
        onLaunch: (pan, dur) => PK.sound.fwLaunch(pan, dur, fwGain),
        onBurst: (pan, big) => PK.sound.fwBoom(pan, big, fwGain),
        onEnd: () => {
          if (view === 'done' && settings.repeatEnd && name === 'fireworks' && Date.now() < celebrateUntil) run();
        },
      });
    };
    run();
  }

  function showDone(withCelebration) {
    setView('done');
    const m = timer.meta;
    showPicture(m.picture);
    dial.setFraction(0);
    dial.setCount(null);
    dial.setSecret(false);
    setLabel(pictureLabel(m.picture)); // who appeared
    PK.fireworks.setPicture(pictureSrc(m.picture), !!backdropFor(m.picture), (n) => PK.sound.pops(n));
    PK.fireworks.updateHole(dialHole());
    setReadout('All done!');
    document.title = 'All done! · Peekaboo';
    resetFavicon();
    dialEl.setAttribute('aria-label', 'Time is up');
    if (withCelebration) {
      dial.spin();
      celebrate();
      try { if (navigator.vibrate) navigator.vibrate([180, 90, 180, 90, 320]); } catch (e) { /* ignore */ }
      notifyDone();
    }
    clearTimeout(wakeReleaseTimer);
    wakeReleaseTimer = setTimeout(releaseWake, 2 * MIN);
    try { $('#doneBtn').focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }

  function goSetup() {
    PK.sound.stopEnd();
    PK.sound.cancelTicks();
    PK.fireworks.stop();
    beat.stop();
    timer.reset();
    saveTimer();
    releaseWake();
    clearTimeout(wakeReleaseTimer);
    setView('setup');
    renderSetup();
  }

  $('#againBtn').addEventListener('click', () => {
    const m = timer.meta;
    startTimer({ duration: m.duration || timer.total, picture: m.chosen || m.picture, label: m.label, routineId: m.routineId });
  });
  $('#doneBtn').addEventListener('click', goSetup);

  // ---------- wake lock ----------
  let wakeLock = null;
  async function holdWake() {
    clearTimeout(wakeReleaseTimer);
    if (!settings.wakeLock || !('wakeLock' in navigator) || document.hidden || wakeLock) return;
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch (e) { wakeLock = null; }
  }
  function releaseWake() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }

  // ---------- notifications ----------
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;

  async function ensureNotifyPermission() {
    const note = $('#notifyNote');
    if (!('Notification' in window)) {
      note.textContent = isIOS && !isStandalone
        ? 'On iPhone and iPad this works after you add Peekaboo to your home screen.'
        : 'This browser cannot show notifications.';
      setSetting('notify', false);
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
      try { perm = await Notification.requestPermission(); } catch (e) { /* ignore */ }
    }
    if (perm !== 'granted') {
      note.textContent = 'Notifications are blocked for this site. Allow them in your browser’s site settings, then switch this on again.';
      setSetting('notify', false);
    } else {
      note.textContent = 'You will get a notification if you switch to another app or tab.';
    }
  }

  function notifyDone() {
    if (!settings.notify || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    const title = 'Time is up!';
    const opts = {
      body: timer.meta.label ? `${timer.meta.label}: all done.` : 'Your Peekaboo timer has finished.',
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: 'peekaboo-done',
      renotify: true,
    };
    const direct = () => { try { new Notification(title, opts); } catch (e) { /* ignore */ } };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((r) => r.showNotification(title, opts)).catch(direct);
    } else direct();
  }

  // ---------- favicon shows progress in the browser tab ----------
  const favLink = $('#favicon');
  const favDefault = favLink ? favLink.getAttribute('href') : '';
  let favCanvas = null;
  let favKey = '';
  function drawFavicon(f, color) {
    if (!favLink) return;
    const key = Math.round(f * 100) + color;
    if (key === favKey) return;
    favKey = key;
    try {
      if (!favCanvas) { favCanvas = document.createElement('canvas'); favCanvas.width = favCanvas.height = 64; }
      const c = favCanvas.getContext('2d');
      c.clearRect(0, 0, 64, 64);
      c.fillStyle = '#f2eee6';
      c.beginPath(); c.arc(32, 32, 31, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#cfe9fb';
      c.beginPath(); c.arc(32, 32, 27, 0, Math.PI * 2); c.fill();
      if (f > 0) {
        c.fillStyle = color;
        c.beginPath();
        if (f >= 0.9999) c.arc(32, 32, 27, 0, Math.PI * 2);
        else { c.moveTo(32, 32); c.arc(32, 32, 27, -Math.PI / 2 - f * Math.PI * 2, -Math.PI / 2); c.closePath(); }
        c.fill();
      }
      favLink.type = 'image/png';
      favLink.href = favCanvas.toDataURL('image/png');
    } catch (e) { /* ignore */ }
  }
  function resetFavicon() {
    if (!favLink || !favKey) return;
    favKey = '';
    favLink.type = 'image/svg+xml';
    favLink.href = favDefault;
  }

  // ---------- sheets ----------
  function openSheet(d) {
    if (d.open) return;
    try { d.showModal(); } catch (e) { d.setAttribute('open', ''); }
    poke();
  }
  function closeSheet(d) {
    if (!d.open) return;
    try { d.close(); } catch (e) { d.removeAttribute('open'); }
  }
  const anySheetOpen = () => $$('dialog.sheet').some((d) => d.open);
  $$('dialog.sheet').forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d) closeSheet(d); });
    $$('[data-close]', d).forEach((b) => b.addEventListener('click', () => closeSheet(d)));
    d.addEventListener('close', poke);
  });

  // ---------- settings ----------
  let themeSetByApp = false;
  function applyTheme() {
    const rootEl = document.documentElement;
    if (settings.theme === 'light' || settings.theme === 'dark') {
      rootEl.setAttribute('data-theme', settings.theme);
      themeSetByApp = true;
    } else if (themeSetByApp) {
      rootEl.removeAttribute('data-theme');
      themeSetByApp = false;
    }
  }

  function applySetting(key) {
    switch (key) {
      case 'tickVolume':
      case 'endVolume':
      case 'muted':
        PK.sound.setVolumes(settings.tickVolume, settings.endVolume, settings.muted);
        updateRunTools();
        updateSoundHint();
        break;
      case 'tick':
      case 'tickRate':
      case 'pips':
        PK.sound.cancelTicks();
        onBeat();
        break;
      case 'sky':
        PK.sky.setMode(settings.sky);
        break;
      case 'theme':
        applyTheme();
        break;
      case 'color':
      case 'digits':
        updateRunTools();
        if (view === 'setup') renderSetup();
        else if (view === 'run') { lastSecond = -1; render(); }
        break;
      case 'reveal':
        if (view !== 'done') dial.setSecret(settings.reveal === 'surprise');
        break;
      case 'step':
        updateStepLabels();
        break;
      case 'wakeLock':
        if (settings.wakeLock && view === 'run') holdWake();
        else if (!settings.wakeLock) releaseWake();
        break;
      case 'notify':
        if (settings.notify) ensureNotifyPermission();
        break;
      default:
        break;
    }
  }

  function syncControl(key) {
    $$(`[data-setting="${key}"]`).forEach((input) => {
      if (input.type === 'checkbox') input.checked = !!settings[key];
      else if (input.type === 'radio') input.checked = String(settings[key]) === input.value;
      else input.value = settings[key];
    });
  }

  function setSetting(key, value) {
    settings[key] = value;
    saveSettings();
    syncControl(key);
    applySetting(key);
  }

  const hearTick = () => PK.sound.previewTick(settings.tick === 'off' ? 'clock' : settings.tick, settings.tickRate);

  function bindSettings() {
    $$('[data-setting]').forEach((input) => {
      const key = input.dataset.setting;
      syncControl(key);
      const evt = input.type === 'range' ? 'input' : 'change';
      input.addEventListener(evt, () => {
        if (input.type === 'radio' && !input.checked) return;
        let v = input.type === 'checkbox' ? input.checked : input.value;
        if (input.type === 'range' || input.dataset.type === 'number') v = Number(v);
        settings[key] = v;
        saveSettings();
        applySetting(key);
        if ((key === 'tick' && v !== 'off') || key === 'tickRate') hearTick();
        if (key === 'endSound') PK.sound.previewEnd(v);
      });
      if (input.type === 'range') {
        input.addEventListener('change', () => {
          PK.sound.unlock();
          if (key === 'tickVolume') hearTick();
          if (key === 'endVolume') PK.sound.previewEnd(settings.endSound);
        });
      }
    });
    $('#hearTick').addEventListener('click', hearTick);
    $('#hearEnd').addEventListener('click', () => PK.sound.previewEnd(settings.endSound));
  }

  function applyAllSettings() {
    PK.sound.setVolumes(settings.tickVolume, settings.endVolume, settings.muted);
    PK.sky.setMode(settings.sky);
    applyTheme();
    updateRunTools();
    updateStepLabels();
  }

  // ---------- sound unlock hint ----------
  function updateSoundHint() {
    els.soundHint.hidden = !(view === 'run' && !settings.muted && !PK.sound.ready() && (settings.tick !== 'off' || settings.pips));
  }
  const gesture = () => {
    if (PK.sound.ready() && !PK.sound.stale()) return;
    PK.sound.unlock();
    setTimeout(updateSoundHint, 200);
  };
  PK.sound.onChange(updateSoundHint);
  ['pointerdown', 'pointerup', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, gesture, { capture: true, passive: true }));
  els.soundHint.addEventListener('click', (e) => { e.stopPropagation(); PK.sound.unlock(); setTimeout(updateSoundHint, 200); });

  // ---------- helpers ----------
  function holdRepeat(btn, fn) {
    let delay = 0;
    let rep = 0;
    let fired = false;
    const stop = () => { clearTimeout(delay); clearInterval(rep); };
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      fired = false;
      stop();
      delay = setTimeout(() => {
        fired = true;
        fn();
        rep = setInterval(fn, 140);
      }, 450);
    });
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach((ev) => btn.addEventListener(ev, stop));
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('click', () => {
      if (fired) { fired = false; return; }
      fn();
    });
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = els.toast;
    t.textContent = msg;
    t.classList.remove('show');
    if (t.showPopover) {
      try { t.hidePopover(); } catch (e) { /* not open */ }
      try { t.showPopover(); } catch (e) { /* ignore */ }
    }
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => { if (t.hidePopover) { try { t.hidePopover(); } catch (e) { /* ignore */ } } }, 300);
    }, 2800);
  }

  // ---------- events ----------
  $('#settingsBtn').addEventListener('click', () => openSheet(els.settingsSheet));
  $('#routinesBtn').addEventListener('click', openRoutineSheet);
  els.picBtn.addEventListener('click', () => { buildPictureGrid(); openSheet(els.pictureSheet); });
  const startFromSetup = () => startTimer({ duration: setup.duration, picture: setup.picture, label: setup.label });
  els.startBtn.addEventListener('click', startFromSetup);
  els.pauseBtn.addEventListener('click', togglePause);
  els.stopBtn.addEventListener('click', goSetup);
  els.muteBtn.addEventListener('click', toggleMute);
  els.digitsBtn.addEventListener('click', toggleDigits);
  els.fullBtn.addEventListener('click', toggleFullscreen);
  dialEl.addEventListener('click', () => {
    if (view === 'done') {
      dial.spin();
      PK.sound.boing();
      PK.fireworks.updateHole(dialHole());
      PK.fireworks.pictureBurst(12);
    }
    else if (view === 'run') poke();
  });
  ['pointerdown', 'pointermove', 'keydown'].forEach((ev) => document.addEventListener(ev, poke, { passive: true }));
  document.addEventListener('touchstart', () => {}, { passive: true }); // lets iOS Safari show :active press states

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || anySheetOpen()) return;
    const target = e.target;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    const onControl = !!(target && target.closest && target.closest('button, a, input'));
    const k = e.key;
    if (k === 'f' || k === 'F') { toggleFullscreen(); return; }
    if (k === 'm' || k === 'M') { toggleMute(); return; }
    if (view === 'setup') {
      if ((k === ' ' || k === 'Enter') && !onControl) { e.preventDefault(); startFromSetup(); }
      else if (k === 'ArrowUp') { e.preventDefault(); setDuration(setup.duration + MIN); }
      else if (k === 'ArrowDown') { e.preventDefault(); setDuration(setup.duration - MIN); }
    } else if (view === 'run') {
      if (k === ' ' && !onControl) { e.preventDefault(); togglePause(); }
      else if (k === 'ArrowUp') { e.preventDefault(); adjust(MIN); }
      else if (k === 'ArrowDown') { e.preventDefault(); adjust(-MIN); }
      else if (k === 'ArrowRight') { e.preventDefault(); adjust(settings.step); }
      else if (k === 'ArrowLeft') { e.preventDefault(); adjust(-settings.step); }
      else if (k === 'd' || k === 'D') toggleDigits();
      else if (k === 'Escape') goSetup();
    } else if (view === 'done') {
      if (k === 'Escape' || ((k === ' ' || k === 'Enter') && !onControl)) { e.preventDefault(); goSetup(); }
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    PK.sound.resume();
    if (view === 'run') holdWake();
    lastSecond = -1;
    render();
    kick();
    updateSoundHint();
  });

  window.addEventListener('resize', () => {
    if (view === 'done') {
      const r = dialEl.getBoundingClientRect();
      PK.fireworks.updateHole({ x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 });
    }
  });

  // Another tab changed the timer: follow it.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'peekaboo:timer') return;
    const next = PK.Timer.restore(store.get('timer', null));
    if (next.status === 'idle' && view !== 'setup') { goSetup(); return; }
    if ((next.status === 'running' || next.status === 'paused') && (next.endAt !== timer.endAt || next.status !== timer.status || next.total !== timer.total)) {
      Object.assign(timer, next.toJSON());
      enterRun();
    }
  });

  // ---------- install ----------
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    els.installBtn.hidden = false;
  });
  els.installBtn.addEventListener('click', async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) { /* ignore */ }
    deferredInstall = null;
    els.installBtn.hidden = true;
  });
  window.addEventListener('appinstalled', () => { els.installBtn.hidden = true; toast('Peekaboo is installed'); });
  if (isStandalone) $('#installNote').hidden = true;

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  // A library picture that cannot load (offline, never cached): show a drawn monster instead.
  dial.onError = () => {
    const id = view === 'setup' ? setup.picture : timer.meta && timer.meta.picture;
    const item = id && PK.pictures.get(id);
    if (!item || !item.url) return;
    const fb = PK.pictures.offlineFallback(id);
    if (view === 'setup') { dial.setPicture(PK.pictures.src(fb), ''); return; }
    timer.meta.picture = fb;
    saveTimer();
    showPicture(fb);
    if (view === 'done') {
      setLabel(pictureLabel(fb));
      PK.fireworks.setPicture(pictureSrc(fb), false, (n) => PK.sound.pops(n));
    }
  };

  function buildSurpriseGroups() {
    const host = $('#surpriseCats');
    host.innerHTML = '';
    const chosen = new Set(Array.isArray(settings.surprise) && settings.surprise.length ? settings.surprise : ALL_GROUPS);
    const groups = PK.pictures.categories.map((c) => [c.id, c.name, PK.pictures.items.filter((i) => i.cat === c.id && i.surprise).length]);
    groups.push(['photos', 'Your photos', photos.length]);
    groups.forEach(([id, name, count]) => {
      const label = document.createElement('label');
      label.className = 'cat-chip';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = `sg-${id}`;
      input.value = id;
      input.checked = chosen.has(id);
      const span = document.createElement('span');
      span.textContent = `${name} · ${count}`;
      label.append(input, span);
      host.appendChild(label);
    });
  }
  $('#surpriseCats').addEventListener('change', () => {
    const picked = $$('#surpriseCats input').filter((i) => i.checked).map((i) => i.value);
    if (!picked.length) {
      toast('Keep at least one group switched on');
      buildSurpriseGroups();
      return;
    }
    settings.surprise = picked.length === ALL_GROUPS.length ? null : picked;
    saveSettings();
    store.set('deck', []);
  });
  $('#settingsBtn').addEventListener('click', buildSurpriseGroups);

  // ---------- boot ----------
  function boot() {
    PK.sky.init($('#sky'));
    applyAllSettings();
    bindSettings();

    const now = Date.now();
    if (timer.status === 'running' && timer.isOver()) {
      if (now - timer.endAt < 15 * MIN) { timer.finish(); timer.finishedAt = timer.endAt; }
      else timer.reset();
    } else if (timer.status === 'done' && now - timer.finishedAt > 15 * MIN) {
      timer.reset();
    }
    saveTimer();

    sizeWheels();
    if (timer.status === 'running' || timer.status === 'paused') enterRun();
    else if (timer.status === 'done') showDone(false);
    else {
      setView('setup');
      renderSetup();
      setTimeout(peek, 900);
    }

    PK.photos.list().then((rows) => {
      photos = rows.map((r) => ({ id: r.id, url: URL.createObjectURL(r.blob) }));
      photosLoaded = true;
      if (isPhoto(setup.picture) && !photoUrl(setup.picture)) { setup.picture = 'rocket'; saveSetup(); }
      if (view === 'setup') renderSetup();
      else if (timer.meta && timer.meta.picture) showPicture(timer.meta.picture);
    });
  }

  boot();
})();
