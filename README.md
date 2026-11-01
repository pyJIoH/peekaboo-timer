# Peekaboo Timer

A visual countdown timer for kids, built as a website that works on any device (iPhone, iPad, Android, Mac, Windows, Linux).
A coloured cover hides a picture. As time runs out the cover sweeps away like a clock hand and turns from green to amber to red.
When time is up the picture spins, a sound plays and confetti falls. No ads, no accounts, no tracking.

## Run it

- **Quickest:** double-click `index.html`. Everything works except offline caching and install-as-app.
- **Full experience (offline, installable):** serve the folder over HTTP, for example:

  ```sh
  python3 -m http.server 8791
  # then open http://localhost:8791
  ```

## Put it online

It is a static site with no build step and no dependencies. Upload the whole folder to any static host:
GitHub Pages, Netlify, Cloudflare Pages, Vercel or your own server. Once it is served over HTTPS:

- **iPhone / iPad:** Safari → Share → *Add to Home Screen*. It opens full screen like an app and works offline.
- **Android / Chrome / Edge:** use the *Install* button that appears in the top bar.

## Features

- Looks like a little timer toy: a cream "device" on a blue sky with clouds, round on top around the big circle and square at the bottom (on its side in phone landscape). Under the circle: a status line (*Paused*, the routine name, or who appeared) and the time, then a wide blue pill **Start** / **Pause | Stop** / **Done** with each half big enough for a finger, gold **−10 / +10** coins, and flat sound / time / settings icons along the bottom.
- **iPhone-style time wheels** (minutes 0–120 and seconds; no hours, it is a kids' timer) right on the circle: flick, scroll with a mouse wheel, drag or tap a number. Endless, with a soft click per number.
- The picture is never covered by numbers. The remaining time is shown small *under* the circle (can be hidden), and only the **last 5 seconds** count down in the middle in a small badge.
- **545 hidden pictures, a new surprise every start.** "Surprise me" is the default: each start deals the next card from a shuffled deck, so every picture appears once before any repeat.
  - 472 emoji-style pictures in two art styles (Microsoft Fluent Emoji, Google Noto Emoji): animals, fairies, superheroes, robots, aliens, food and sweets, vehicles, nature and weather, toys, sports, music, party things.
  - 48 friendly monsters and 16 shape friends (circle, star, heart, triangle...) drawn by the app's own code, so they work offline.
  - 8 illustrated scenes, a plain clock face, and **your own photos** (unlimited, stored only on the device).
  - Settings → *Surprise pictures come from* picks which groups are used. The picture chooser shows everything, grouped.
  - When time is up the picture spins and its name appears ("Jellyfish!").
- Green → amber → red cover, or a fixed colour. Optional **blurry until the end** mode.
- **Tick-tock twice a second** (clock, wood block, bubble or off; once a second if you prefer) with its own volume, plus countdown beeps for the last 5 seconds.
- **Fireworks finale**: the sky dims, rockets whistle up and burst into glowing sparks with booms and crackle. The revealed picture spins and stays clear of the sparks.
  Little copies of the revealed picture burst out of the circle and tumble down with the sparks; tap the picture afterwards for another burst.
  Other endings: fanfare, chimes, magic, cuckoo, beeps. Optional repeat until *Done*.
- The picture stays on screen until someone taps *Done*; tap it to spin it again. *Again* restarts the same timer.
- **Routines** (presets) such as *Brush teeth 2:00*: tap one to start it. Save, update, delete, restore the examples.
- Phone first: the whole timer always fits the screen with no scrolling, in portrait and landscape (checked from 320 px phones to tablets). Every button is at least 44 × 44 px; the ■ button stops at once, without a question. Controls fade while the timer runs.
- The sky follows the real clock: sunrise, daytime with the sun moving across, sunset, and night with moon and stars. It can also be fixed.
- Keeps the screen awake while running, optional notification when time is up in the background, remaining time and a progress pie in the browser tab, survives reloads and works across tabs.
- Light and dark menus, keyboard shortcuts, screen-reader labels, reduced-motion support.

## Technical choices

| Decision | Choice | Why |
| --- | --- | --- |
| Platform | Progressive Web App (plain HTML/CSS/JS) | One codebase for every OS; installable; offline via service worker |
| Language | Vanilla JavaScript, no framework, no build | Instant load, nothing to compile or update, opens straight from disk |
| Timing | Wall-clock end time (`Date.now`) + worker heartbeat | Stays exact when the tab is in the background, the phone sleeps or the page reloads |
| Sound | Web Audio API synthesis, ticks scheduled on the audio clock | No audio files; steady ticks even when the page is busy; separate tick/end volumes |
| Graphics | SVG dial and SVG illustrations | Sharp at any size, from a phone to a classroom projector |
| Storage | `localStorage` for settings/routines, IndexedDB for photos | Private, on-device, no server |

## Files

```
index.html            page structure and sheets
css/styles.css        all styling (themes, sky, dial, layouts)
js/util.js            helpers, storage, background heartbeat
js/timer.js           countdown model (pure logic)
js/dial.js            dial drawing, colours, last-seconds badge
js/pictures.js        built-in scenes, monster and shape generators, picture catalog
js/library.js         list of the downloaded pictures (generated)
library/              downloaded pictures + LICENSES.md (sources and licence texts)
js/sounds.js          sound engine
js/sky.js             time-of-day sky
js/photos.js          your photos (IndexedDB)
js/wheel.js           iPhone-style wheel picker
js/fireworks.js       end-of-timer fireworks
js/app.js             app wiring
sw.js                 offline support
manifest.webmanifest  install metadata
icons/                app icons
```
