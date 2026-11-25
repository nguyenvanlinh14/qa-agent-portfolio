// "Liquid morph" accents, hand-written (no libraries): closed blob paths whose radii breathe over time.
// Every path keeps the same command layout (1 M + 8 C + Z), so shapes morph smoothly frame to frame.
// Static (one fixed frame, no loop) when the visitor prefers reduced motion or the URL says `frozen=1`;
// paused while the tab is hidden. `window.__liquid` is a tiny hook so a spec can tell a static frame from a loop.
import { mulberry32, parseParams } from './engine.js';

const N = 8;
const TAU = Math.PI * 2;
const STATIC_T = 1.7; // seconds: the fixed frame used for static rendering and visual snapshots
const FRAME_MS = 33; // ~30 fps is plenty for slow blobs

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const frozen = parseParams(location.search).frozen;
export const motionAllowed = () => !frozen && !reduced.matches;

const f = (n) => n.toFixed(1);

/** Closed smooth blob (Catmull-Rom converted to cubic Beziers) around (cx, cy). */
export function blobPath(cx, cy, r, mult, rot = 0) {
  const pts = mult.map((m, i) => {
    const a = rot + (i / N) * TAU;
    return [cx + Math.cos(a) * r * m, cy + Math.sin(a) * r * m];
  });
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i + N - 1) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

const fields = [];
const state = (window.__liquid = { running: false, mode: motionAllowed() ? 'live' : 'static', frames: 0, blobs: 0 });
let raf = 0;
let last = 0;
let t = STATIC_T;

function draw(time) {
  for (const b of fields) {
    const mult = b.speed.map((s, i) => 1 + b.amp * Math.sin(time * s + b.phase[i]));
    const dx = Math.sin(time * b.drift) * b.r * 0.12;
    const dy = Math.cos(time * b.drift * 0.8 + b.phase[0]) * b.r * 0.1;
    b.el.setAttribute('d', blobPath(b.cx + dx, b.cy + dy, b.r, mult, b.rot));
  }
}

function frame(now) {
  raf = requestAnimationFrame(frame);
  if (now - last < FRAME_MS) return;
  t += Math.min(now - last, 100) / 1000;
  last = now;
  draw(t);
  state.frames++;
}

function sync() {
  const live = motionAllowed() && !document.hidden && fields.length > 0;
  if (live && !raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  } else if (!live && raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  state.running = raf !== 0;
  state.mode = motionAllowed() ? 'live' : 'static';
  if (!motionAllowed()) draw(STATIC_T);
}
document.addEventListener('visibilitychange', sync);
reduced.addEventListener?.('change', sync);

/**
 * Registers blobs. `defs`: [{ el: SVGPathElement, cx, cy, r, amp?, rot? }]. Shapes are derived from a fixed
 * seed per blob, so the first frame is identical on every load.
 */
export function addBlobs(defs) {
  for (const [i, d] of defs.entries()) {
    const rng = mulberry32(0x5eed + fields.length * 101 + i);
    fields.push({
      amp: 0.2,
      rot: rng() * TAU,
      ...d,
      speed: Array.from({ length: N }, () => 0.35 + rng() * 0.6),
      phase: Array.from({ length: N }, () => rng() * TAU),
      drift: 0.15 + rng() * 0.2,
    });
  }
  state.blobs = fields.length;
  draw(STATIC_T);
  sync();
}
