// Voices the portfolio guide (site/guide/tour.json) with Gemini TTS, one clip per step and language.
//   GEMINI_API_KEY=… npm run guide:voice            (or: node --env-file=<path/to/.env> scripts/guide/voice.mjs)
//   options: --force (redo every clip) · --lang en|vi (one language only)
// Writes site/guide/audio/<lang>/<id>.m4a (AAC, small enough to commit) and site/guide/voice.json with each clip's
// length and a hash of its text + voice, so unchanged clips are skipped and the site never needs the key.
// Encoder: macOS `afconvert`, or ffmpeg when FFMPEG is set. The key is only read from the environment, never written.
// The spoken text goes to Google: it is the public tour text only.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const GUIDE = join(ROOT, 'site', 'guide');
const argv = process.argv.slice(2);
const force = argv.includes('--force');
const onlyLang = argv.includes('--lang') ? argv[argv.indexOf('--lang') + 1] : null;
// The main model first, the lite model when the daily quota of the first one is used up (HTTP 429).
const MODELS = [process.env.GEMINI_TTS_MODEL ?? 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];

const tour = JSON.parse(readFileSync(join(GUIDE, 'tour.json'), 'utf8'));
const manifestFile = join(GUIDE, 'voice.json');
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { clips: {} };
const key = process.env.GEMINI_API_KEY;
const tmp = mkdtempSync(join(tmpdir(), 'guide-voice-'));

/** Wraps raw 16-bit mono PCM in a WAV header. */
function pcmToWav(pcm, sampleRate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Gemini TTS: the sentence only (a style prefix would be read aloud). Returns { pcm, rate, model }. */
async function speak(text, voice) {
  const errors = [];
  for (const model of MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
      }),
    });
    if (!res.ok) {
      errors.push(`${model}: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
      if (res.status === 429) continue;
      break;
    }
    const data = await res.json();
    const part = data.candidates?.flatMap((c) => c.content?.parts ?? []).find((p) => p.inlineData);
    if (!part) { errors.push(`${model}: no audio in the response`); continue; }
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? '')?.[1] ?? 24000);
    return { pcm: Buffer.from(part.inlineData.data, 'base64'), rate, model };
  }
  throw new Error(`Gemini TTS failed: ${errors.join(' | ')}`);
}

function encode(wav, out) {
  if (process.env.FFMPEG) execFileSync(process.env.FFMPEG, ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'aac', '-b:a', '48k', out]);
  else execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', wav, out]);
}

const langs = Object.keys(tour.voices).filter((l) => !onlyLang || l === onlyLang);
const todo = [];
for (const lang of langs) {
  const voice = tour.voices[lang].name;
  for (const step of tour.steps) {
    const text = step.say[lang];
    const hash = createHash('sha1').update(`${voice}\n${text}`).digest('hex').slice(0, 12);
    const file = `audio/${lang}/${step.id}.m4a`;
    const prev = manifest.clips[lang]?.[step.id];
    if (!force && prev?.hash === hash && existsSync(join(GUIDE, file))) continue;
    todo.push({ lang, voice, id: step.id, text, hash, file });
  }
}

if (!todo.length) { console.log('guide voice: every clip is up to date'); process.exit(0); }
if (!key) {
  console.log(`GEMINI_API_KEY not set: ${todo.length} clip(s) not voiced; the guide shows their text without sound`);
  process.exit(0);
}

try {
  for (const c of todo) {
    const { pcm, rate, model } = await speak(c.text, c.voice);
    const wav = join(tmp, `${c.lang}-${c.id}.wav`);
    writeFileSync(wav, pcm.subarray(0, 4).toString('ascii') === 'RIFF' ? pcm : pcmToWav(pcm, rate));
    mkdirSync(join(GUIDE, 'audio', c.lang), { recursive: true });
    encode(wav, join(GUIDE, c.file));
    const ms = Math.round((pcm.length / 2 / rate) * 1000);
    (manifest.clips[c.lang] ??= {})[c.id] = { file: c.file, ms, hash: c.hash };
    // Saved after every clip, so a quota stop keeps what is already done.
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`${c.lang} ${c.id.padEnd(10)} ${String(ms).padStart(5)} ms  [${model}]`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
