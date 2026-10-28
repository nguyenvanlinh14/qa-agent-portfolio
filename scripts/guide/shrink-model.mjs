// Shrinks the guide's VRoid model for the web: textures capped at 512 px (256 px for normal maps; the bust is shown small), opaque ones re-encoded
// as JPEG, the 2048 px VRM thumbnail (never shown) replaced by a 1 px image. Geometry, rig, expressions and every
// extension (VRM data included) are copied byte for byte; only image buffer views change.
//   node scripts/guide/shrink-model.mjs <in.glb|.vrm> site/guide/tess.glb
// Uses macOS `sips` for resizing and encoding (generic glTF optimizers drop the VRM extension).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [src, out] = process.argv.slice(2);
if (!src || !out) { console.error('usage: node scripts/guide/shrink-model.mjs <in.glb> <out.glb>'); process.exit(2); }

const glb = readFileSync(src);
const jsonLen = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8'));
const binStart = 20 + jsonLen + 8;
const bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLen));
const view = (i) => { const v = json.bufferViews[i]; return bin.subarray(v.byteOffset ?? 0, (v.byteOffset ?? 0) + v.byteLength); };
const tmp = mkdtempSync(join(tmpdir(), 'tess-model-'));
const thumb = json.extensions?.VRM?.meta?.texture;
const thumbImage = thumb !== undefined && thumb >= 0 ? json.textures[thumb]?.source : -1;
// 1×1 transparent PNG
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

const sips = (args) => execFileSync('sips', args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const replaced = new Map(); // bufferView index -> new bytes
let before = 0, after = 0;
for (const [i, img] of json.images.entries()) {
  const data = view(img.bufferView);
  before += data.length;
  if (i === thumbImage) { replaced.set(img.bufferView, PIXEL); img.mimeType = 'image/png'; after += PIXEL.length; continue; }
  const file = join(tmp, `${i}.png`);
  writeFileSync(file, data);
  const w = Number(/pixelWidth: (\d+)/.exec(sips(['-g', 'pixelWidth', file]))[1]);
  const normalMap = /_nml$/.test(img.name ?? '');
  // VRoid stores every PNG with an alpha channel; a normal map never uses it
  const opaque = normalMap || /hasAlpha: no/.test(sips(['-g', 'hasAlpha', file]));
  const cap = normalMap ? 256 : 512;
  if (w > cap) sips(['-Z', String(cap), file]);
  let bytes = readFileSync(file);
  if (opaque && bytes.length > 32 * 1024) {
    const jpg = join(tmp, `${i}.jpg`);
    sips(['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', file, '--out', jpg]);
    const jb = readFileSync(jpg);
    if (jb.length < bytes.length) { bytes = jb; img.mimeType = 'image/jpeg'; }
  }
  if (bytes.length < data.length) replaced.set(img.bufferView, bytes);
  after += Math.min(bytes.length, data.length);
}

// Re-lay the binary chunk: every buffer view in order, 4-byte aligned, image views swapped for their new bytes.
const parts = [];
let offset = 0;
for (const [i, v] of json.bufferViews.entries()) {
  const bytes = replaced.get(i) ?? view(i);
  const pad = (4 - (offset % 4)) % 4;
  if (pad) { parts.push(Buffer.alloc(pad)); offset += pad; }
  v.byteOffset = offset;
  v.byteLength = bytes.length;
  parts.push(bytes);
  offset += bytes.length;
}
const binOut = Buffer.concat(parts, offset);
json.buffers[0].byteLength = binOut.length;

const pad = (buf, fill) => Buffer.concat([buf, Buffer.alloc((4 - (buf.length % 4)) % 4, fill)]);
const jsonChunk = pad(Buffer.from(JSON.stringify(json)), 0x20);
const binChunk = pad(binOut, 0);
const header = Buffer.alloc(12);
header.write('glTF', 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
const chunkHead = (len, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(len, 0); h.write(type, 4); return h; };
writeFileSync(out, Buffer.concat([header, chunkHead(jsonChunk.length, 'JSON'), jsonChunk, chunkHead(binChunk.length, 'BIN\0'), binChunk]));
rmSync(tmp, { recursive: true, force: true });
console.log(`textures ${(before / 1e6).toFixed(1)} MB -> ${(after / 1e6).toFixed(1)} MB; ${src} (${(glb.length / 1e6).toFixed(1)} MB) -> ${out} (${(readFileSync(out).length / 1e6).toFixed(1)} MB)`);
