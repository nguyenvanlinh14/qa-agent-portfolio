// Step 1 of the evidence video: one narration clip per step (English text-to-speech).
//   node scripts/evidence/narrate.mjs evidence/scripts/<id>.json
// Engines: `gemini` (Gemini TTS, needs GEMINI_API_KEY in the environment), `say` (macOS) or `espeak-ng` (Linux).
// The engine and voice come from the script's "voice" field; without a Gemini key the script's "fallback" voice is used.
// TTS_ENGINE / TTS_VOICE override both. The key is only read from the environment, never written anywhere.
// Writes evidence/out/<id>/audio/NN-<key>.wav and evidence/out/<id>/narration.json with each clip's length,
// which the recorder uses to pace the video and the builder uses to time the subtitles.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const scriptFile = process.argv[2];
if (!scriptFile) {
  console.error('usage: node scripts/evidence/narrate.mjs evidence/scripts/<id>.json');
  process.exit(2);
}
const script = JSON.parse(readFileSync(scriptFile, 'utf8'));
const wanted = script.voice ?? { engine: 'say' };
const picked = wanted.engine === 'gemini' && !process.env.GEMINI_API_KEY ? (script.fallback ?? { engine: 'say' }) : wanted;
if (picked !== wanted) console.log(`GEMINI_API_KEY not set: using the fallback voice (${picked.engine} ${picked.name ?? ''})`);
const engine = process.env.TTS_ENGINE ?? picked.engine;
const voice = process.env.TTS_VOICE ?? picked.name ?? (engine === 'say' ? 'Samantha' : engine === 'gemini' ? 'en-us-rami' : 'en-us');
const rate = String(picked.rate ?? 172);
// Gemini: the main model first, the lite model when the daily quota of the first one is used up (HTTP 429).
const GEMINI_MODELS = [picked.model ?? 'gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
const dir = join('evidence', 'out', script.id);
mkdirSync(join(dir, 'audio'), { recursive: true });

/** Length of a PCM WAV file in ms, read from its header (no ffprobe needed). */
function wavMs(file) {
  const b = readFileSync(file);
  const byteRate = b.readUInt32LE(28);
  // Walk the chunks to the `data` chunk; `say` and espeak write extra chunks before it.
  for (let off = 12; off + 8 <= b.length; ) {
    const id = b.toString('ascii', off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === 'data') return Math.round((Math.min(size, b.length - off - 8) / byteRate) * 1000);
    off += 8 + size + (size % 2);
  }
  throw new Error(`no data chunk in ${file}`);
}

/** Wraps raw 16-bit mono PCM in a WAV header. */
function pcmToWav(pcm, sampleRate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/**
 * Gemini TTS: send the sentence only. A free-text style prefix ("Read calmly: …") is read aloud by the model.
 * The narration text goes to Google, so it must never contain internal data (ids, hosts, tokens, customer data).
 */
async function gemini(text, file) {
  const errors = [];
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
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
    const audio = Buffer.from(part.inlineData.data, 'base64');
    const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType ?? '')?.[1] ?? 24000);
    writeFileSync(file, audio.subarray(0, 4).toString('ascii') === 'RIFF' ? audio : pcmToWav(audio, rate));
    return model;
  }
  throw new Error(`Gemini TTS failed: ${errors.join(' | ')}`);
}

async function speak(text, file) {
  if (engine === 'gemini') return gemini(text, file);
  if (engine === 'say') execFileSync('say', ['-v', voice, '-r', rate, '--file-format=WAVE', '--data-format=LEI16@24000', '-o', file, text]);
  else if (engine === 'espeak-ng') execFileSync('espeak-ng', ['-v', voice, '-s', rate, '-w', file, text]);
  else throw new Error(`unknown TTS engine "${engine}" (use gemini, say or espeak-ng)`);
}

const clips = [];
for (const [i, step] of script.steps.entries()) {
  const file = join(dir, 'audio', `${String(i + 1).padStart(2, '0')}-${step.key}.wav`);
  const model = await speak(step.say, file);
  const ms = wavMs(file);
  console.log(`${step.key.padEnd(10)} ${String(ms).padStart(5)} ms  ${model ? `[${model}] ` : ''}${step.say}`);
  clips.push({ key: step.key, file, ms, text: step.say });
}

writeFileSync(join(dir, 'narration.json'), JSON.stringify({ id: script.id, engine, voice, clips }, null, 2));
console.log(`narration: ${clips.length} clips, ${(clips.reduce((s, c) => s + c.ms, 0) / 1000).toFixed(1)} s → ${dir}/narration.json`);
