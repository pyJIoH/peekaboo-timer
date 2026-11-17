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

- Looks like a little timer toy: a cream "device" on a blue sky with clouds, round on top around the big circle and square at the bottom (on its side in phone landscape). Under the circle: a status line (*Paused*, the routine name, or who appeared) and the time, then a wide blue pill **Start** / **Pause | Stop** / **Done** with each half big enough for a finger, gold **+ / −** coins that add or take away more time the longer the timer is (5 s for a 1-minute timer, 10 s up to 5 minutes, 30 s up to 10, 1 min up to 20, 2 min above), and flat sound / time / settings icons along the bottom.
- **iPhone-style time wheels** (minutes 0–59 and seconds; no hours, it is a kids' timer) right on the circle: flick, scroll with a mouse wheel, drag or tap a number. Endless, with a soft click per number.
- The picture is never covered by numbers. The remaining time is shown small *under* the circle (can be hidden), and only the **last 5 seconds** count down in the middle in a small badge.
- **596 hidden pictures, a new surprise every start.** "Surprise me" is the default: each start deals the next card from a shuffled deck, so every picture appears once before any repeat.
  - 472 emoji-style pictures in two art styles (Microsoft Fluent Emoji, Google Noto Emoji): animals, fairies, superheroes, robots, aliens, food and sweets, vehicles, nature and weather, toys, sports, music, party things.
  - 48 friendly monsters, 16 shape friends (circle, star, heart, triangle...) and the numbers 0 to 50, drawn by the app's own code, so they work offline.
  - 8 illustrated scenes (rocket, pirate ship, train, cupcake, kitty, dinosaur, clownfish, rainbow), each in the topic of what it shows, a plain clock face, and **your own photos** (unlimited, stored only on the device).
  - The **?** coin opens topics, not single pictures: *Surprise me*, Animals, Monsters and magic, Shapes, Numbers, Food and sweets, Things that go, Nature and sky, Toys and fun (and Your photos when there are some). Topics go by what a picture shows, so every cat, the drawn kitty too, is in Animals. The child picks a topic (the voice says its name: "ANIMALS!"); the picture inside it stays a surprise, and each topic deals its own deck without repeats. The coin shows the topic's picture, and routines remember a topic.
  - Settings → *Surprise pictures come from* picks which groups *Surprise me* uses, and only those groups are offered as topics.
  - When time is up the picture spins and its name appears ("Jellyfish!").
- Green → amber → red cover, or a fixed colour. Optional **blurry until the end** mode.
- **Tick-tock twice a second** (clock, wood block, bubble or off; once a second if you prefer) with its own volume, plus countdown beeps for the last 5 seconds.
- **Fireworks finale**: the sky dims, rockets whistle up and burst into glowing sparks with booms and crackle. The revealed picture spins and stays clear of the sparks.
  Little copies of the revealed picture burst out of the circle and tumble down with the sparks; tap the picture afterwards for another burst.
  Other endings: fanfare, chimes, magic, cuckoo, beeps. By default the whole celebration (fireworks, flying pictures, spinning picture) goes on and keeps the screen on until someone taps *Done*; it can be set to play once.
- **The picture says what it is**: when time is up a friendly voice says "It's a cat!" and then the cat meows; a train whistles, a monster roars, a plane flies by. Every cat is "a cat" and every monster "a monster", so the words stay simple; numbers are read out ("It's TWENTY-ONE!"). Tap the picture to hear it again. Can be turned off in Settings. Your own photos stay quiet.
- The picture stays on screen until someone taps *Done*; tap it to spin it again. *Again* restarts the same timer.
- **Routines** (presets) such as *Brush teeth 2:00*: tap one to start it. Save, update, delete, restore the examples.
- Phone first: the whole timer always fits the screen with no scrolling, in portrait and landscape (checked from 320 px phones to tablets). Every button is at least 44 × 44 px; the ■ button stops at once, without a question. Controls fade while the timer runs.
- The sky follows the real clock: sunrise, daytime with the sun moving across, sunset, and night with moon and stars. It can also be fixed.
- Updates itself: app files are always checked with the server, and a new version loads on its own on the setup screen (never during a countdown or the celebration). Settings → About shows the version number. Pictures and sounds come from the offline cache after their first load, and the next surprise loads while the setup screen is open, so the picture is there the moment the timer starts.
- Keeps the screen awake while running, optional notification when time is up in the background, remaining time and a progress pie in the browser tab, survives reloads and works across tabs.
- Light and dark menus, keyboard shortcuts, screen-reader labels, reduced-motion support.

## Technical choices

| Decision | Choice | Why |
| --- | --- | --- |
| Platform | Progressive Web App (plain HTML/CSS/JS) | One codebase for every OS; installable; offline via service worker |
| Language | Vanilla JavaScript, no framework, no build | Instant load, nothing to compile or update, opens straight from disk |
| Timing | Wall-clock end time (`Date.now`) + worker heartbeat | Stays exact when the tab is in the background, the phone sleeps or the page reloads |
| Sound | Web Audio API synthesis, ticks scheduled on the audio clock | Steady ticks even when the page is busy; separate tick/end volumes |
| Picture voices | Recorded MP3 clips made once with ElevenLabs (`tools/make-audio.mjs`) | Same voice every time, no network calls from the app; a picture's clips load when the timer starts and are cached for offline |
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
js/speech.js          what each picture says and its sound (phrases, sound prompts, picture map)
audio/say/, audio/fx/ the spoken names and the picture sounds (made by tools/make-audio.mjs)
tools/make-audio.mjs  makes missing clips with ElevenLabs; key in elevenlabs.txt (not in git)
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
