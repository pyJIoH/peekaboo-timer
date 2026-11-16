// Makes the spoken names and picture sounds with ElevenLabs, from the lists in js/speech.js.
// Only files that are missing are made, so it is safe to run again after adding a picture.
//
//   node tools/make-audio.mjs --check               check every picture has a phrase; make nothing
//   node tools/make-audio.mjs                       make all missing files
//   node tools/make-audio.mjs --only=say:cat,fx:meow  remake these, even if they exist ("cat" alone = both kinds)
//   node tools/make-audio.mjs --say                 remake every phrase (after changing the voice style)
//
// Voice style: eleven_v3, cheerful, with the stress on the thing itself: "[excited] It's a CAT!".
//
// The API key is read from elevenlabs.txt in the project folder (ignored by git) or ELEVENLABS_API_KEY.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VOICE = 'piI8Kku0DcvcL6TTSeQt';
const TTS_MODEL = 'eleven_v3';
const SAY_FORMAT = 'mp3_44100_64';
const FX_FORMAT = 'mp3_44100_96';
const PARALLEL = 3; // the account allows 3 requests at once

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const only = new Set((args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean));
const allSay = args.includes('--say');
const remake = (kind, k) => (kind === 'say' && allSay) || only.has(k) || only.has(`${kind}:${k}`);

// Words the voice says wrongly in capitals ("FOOTBALL" came out as "fitball"): written out by hand.
const VOICE_FIX = { football: "[excited] It's a FOOT-BALL!" };

/** What the voice is given: a cheerful tone and the thing in capitals, so the stress falls on it. */
function voiceText(text, k) {
  if (VOICE_FIX[k]) return VOICE_FIX[k];
  if (!text.startsWith("It's")) return `[excited] ${text.toUpperCase()}`; // topic names: all of it stressed
  const m = /^(It's (?:an? |the )?)(.+?)([!?.]*)$/.exec(text);
  return m ? `[excited] ${m[1]}${m[2].toUpperCase()}${m[3]}` : `[excited] ${text}`;
}

// Load the app's own data files the way the browser does.
const sandbox = { window: {}, console };
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
for (const f of ['js/library.js', 'js/pictures.js', 'js/speech.js']) {
  vm.runInContext(`(function (window) { ${readFileSync(join(ROOT, f), 'utf8')} })(window);`, sandbox, { filename: f });
}
const { speech, pictures } = sandbox.window.PK;

// ---- check the lists ----
const problems = [];
const usedSay = new Set();
const usedFx = new Set();
for (const item of pictures.items) {
  const e = speech.lookup(item.id);
  if (!e) { problems.push(`no phrase for picture ${item.id} (${item.name})`); continue; }
  if (!speech.SAY[e.say]) problems.push(`picture ${item.id}: unknown phrase "${e.say}"`);
  if (e.fx && !speech.FX[e.fx]) problems.push(`picture ${item.id}: unknown sound "${e.fx}"`);
  usedSay.add(e.say);
  if (e.fx) usedFx.add(e.fx);
}
for (const k of Object.keys(speech.SAY)) if (!usedSay.has(k)) problems.push(`phrase "${k}" is not used by any picture`);
for (const t of ['random', 'photos', ...pictures.categories.map((c) => c.id)]) if (!speech.TOPICS[t]) problems.push(`no name for topic "${t}"`);
for (const k of Object.keys(speech.FX)) if (!usedFx.has(k)) problems.push(`sound "${k}" is not used by any picture`);
for (const k of only) {
  const [kind, name] = k.includes(':') ? k.split(':') : ['', k];
  const topic = name.startsWith('topic-') && speech.TOPICS[name.slice(6)];
  const known = kind === 'say' ? speech.SAY[name] || topic : kind === 'fx' ? speech.FX[name] : speech.SAY[name] || speech.FX[name] || topic;
  if (!known) problems.push(`--only: no phrase or sound called "${k}"`);
}
console.log(`${pictures.items.length} pictures, ${Object.keys(speech.SAY).length} phrases, ${Object.keys(speech.FX).length} sounds`);
if (problems.length) {
  console.log(problems.map((p) => '  ! ' + p).join('\n'));
  process.exit(1);
}
if (checkOnly) { console.log('lists OK'); process.exit(0); }

// ---- make the audio ----
let key = process.env.ELEVENLABS_API_KEY;
if (!key) {
  try { key = readFileSync(join(ROOT, 'elevenlabs.txt'), 'utf8').trim(); } catch (e) { /* none */ }
}
if (!key) { console.error('No API key: put it in elevenlabs.txt or ELEVENLABS_API_KEY'); process.exit(1); }

const jobs = [];
for (const [k, text] of Object.entries(speech.SAY)) {
  const file = join(ROOT, 'audio/say', `${k}.mp3`);
  if (remake('say', k) || !existsSync(file)) {
    jobs.push({ kind: 'say', k, file, url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=${SAY_FORMAT}`,
      body: { text: voiceText(text, k), model_id: TTS_MODEL } });
  }
}
for (const [t, text] of Object.entries(speech.TOPICS)) {
  const k = `topic-${t}`;
  const file = join(ROOT, 'audio/say', `${k}.mp3`);
  if (remake('say', k) || !existsSync(file)) {
    jobs.push({ kind: 'say', k, file, url: `https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=${SAY_FORMAT}`,
      body: { text: voiceText(text, k), model_id: TTS_MODEL } });
  }
}
for (const [k, [seconds, text]] of Object.entries(speech.FX)) {
  const file = join(ROOT, 'audio/fx', `${k}.mp3`);
  if (remake('fx', k) || !existsSync(file)) {
    jobs.push({ kind: 'fx', k, file, url: `https://api.elevenlabs.io/v1/sound-generation?output_format=${FX_FORMAT}`,
      body: { text, duration_seconds: seconds, prompt_influence: 0.6 } });
  }
}
console.log(`${jobs.length} files to make`);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let credits = 0;
let failed = 0;
let stop = false;

async function run(job) {
  for (let attempt = 1; attempt <= 4 && !stop; attempt++) {
    let res;
    try {
      res = await fetch(job.url, {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify(job.body),
      });
    } catch (e) {
      await wait(1500 * attempt);
      continue;
    }
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(dirname(job.file), { recursive: true });
      writeFileSync(job.file, buf);
      credits += Number(res.headers.get('character-cost')) || 0;
      console.log(`  ok ${job.kind}/${job.k}.mp3 ${(buf.length / 1024).toFixed(0)} KB`);
      return;
    }
    const text = await res.text();
    if (res.status === 429 || res.status >= 500) { await wait(2000 * attempt); continue; }
    if (/quota|credits/i.test(text)) { stop = true; console.error('  out of credits: stopping'); }
    console.error(`  FAILED ${job.kind}/${job.k}: ${res.status} ${text.slice(0, 200)}`);
    failed++;
    return;
  }
  if (!stop) { console.error(`  FAILED ${job.kind}/${job.k}: gave up after retries`); failed++; }
}

const queue = jobs.slice();
await Promise.all(Array.from({ length: PARALLEL }, async () => {
  while (queue.length && !stop) await run(queue.shift());
}));
console.log(`done: ${jobs.length - failed} made, ${failed} failed, about ${credits} credits used`);
process.exit(failed ? 1 : 0);
