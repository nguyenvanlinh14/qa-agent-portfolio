// MarketFlow (demo) simulation engine: pure functions + a tiny seeded market.
// No DOM, no storage, no clock: the same seed always gives the same snapshot, steps and candles.
import { INDEX_BASE, STOCKS } from './data.js';

export const DEFAULT_SEED = 2026;
export const TICK_MS = 1500;
export const CANDLE_COUNT = 60;

// ---------- seeded randomness ----------

/** mulberry32: small, fast, good enough for a demo. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash. */
export function hashStr(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** `?seed=N&frozen=1`. Frozen is explicit: it is never inferred from navigator.webdriver. */
export function parseParams(search) {
  const q = new URLSearchParams(search);
  const raw = q.get('seed');
  const seed = raw !== null && /^\d{1,9}$/.test(raw) ? Number(raw) : DEFAULT_SEED;
  const frozen = ['1', 'true'].includes(q.get('frozen') ?? '');
  return { seed, frozen, seedGiven: raw !== null && /^\d{1,9}$/.test(raw) };
}

// ---------- HOSE price rules (prices in VND) ----------

/** Tick size: < 10,000 -> 10; 10,000 to < 50,000 -> 50; >= 50,000 -> 100. */
export function tickSize(price) {
  if (price < 10000) return 10;
  if (price < 50000) return 50;
  return 100;
}

export function roundToTick(price) {
  const t = tickSize(price);
  return Math.round(price / t) * t;
}
export function floorToTick(price) {
  const t = tickSize(price);
  return Math.floor(price / t + 1e-9) * t;
}
export function ceilToTick(price) {
  const t = tickSize(price);
  return Math.ceil(price / t - 1e-9) * t;
}

/** Ceiling = reference x 1.07 rounded down to the tick (never above +7%). */
export function ceilingOf(ref) {
  const t = tickSize((ref * 107) / 100);
  return Math.floor((ref * 107) / (100 * t)) * t;
}
/** Floor = reference x 0.93 rounded up to the tick (never below -7%). */
export function floorOf(ref) {
  const t = tickSize((ref * 93) / 100);
  return Math.ceil((ref * 93) / (100 * t)) * t;
}

/** One tick up / down from a price (the tick size can change at 10,000 and 50,000). */
export const tickUp = (p) => p + tickSize(p);
export const tickDown = (p) => p - tickSize(p - 1);

/** ceiling | floor | reference | up | down */
export function stateOf(last, ref, ceil, floor) {
  if (last >= ceil) return 'ceiling';
  if (last <= floor) return 'floor';
  if (last === ref) return 'reference';
  return last > ref ? 'up' : 'down';
}

export const pctOf = (last, ref) => ((last - ref) / ref) * 100;

// ---------- the market ----------

function openingRow(stock, seed) {
  const rng = mulberry32(hashStr(stock.t) ^ Math.imul(seed + 1, 0x9e3779b1));
  const ceil = ceilingOf(stock.ref);
  const floor = floorOf(stock.ref);
  const u = rng();
  let last;
  if (u < 0.08) last = ceil;
  else if (u < 0.14) last = floor;
  else if (u < 0.22) last = stock.ref;
  else {
    const pct = (rng() + rng() + rng() - 1.5) * 0.08; // about +-6%, bell-shaped
    last = Math.min(ceil, Math.max(floor, roundToTick(stock.ref * (1 + pct))));
  }
  const dailyVolume = stock.shares * (0.0006 + rng() * 0.0034);
  const volume = Math.round((dailyVolume * (0.15 + rng() * 0.45)) / 100) * 100;
  return { last, volume };
}

export function createMarket(seed) {
  const rng = mulberry32(Math.imul(seed + 7, 0x85ebca6b) ^ 0x1234abcd);
  const rows = new Map();
  for (const s of STOCKS) {
    const { last, volume } = openingRow(s, seed);
    rows.set(s.t, { ...s, ceil: ceilingOf(s.ref), floor: floorOf(s.ref), last, volume });
  }
  const list = [...rows.values()];
  let steps = 0;

  return {
    seed,
    rows,
    list,
    get steps() {
      return steps;
    },
    /** One simulated update: 1-4 random tickers move 1-2 ticks. Returns [{t, prev, last}]. */
    step() {
      steps++;
      const changes = [];
      const n = 1 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const row = list[Math.floor(rng() * list.length)];
        const dir = rng() < 0.5 ? -1 : 1;
        const hops = 1 + Math.floor(rng() * 2);
        const prev = row.last;
        let p = row.last;
        for (let k = 0; k < hops; k++) {
          const next = dir > 0 ? tickUp(p) : tickDown(p);
          if (next > row.ceil || next < row.floor) break;
          p = next;
        }
        row.volume += 100 * (1 + Math.floor(rng() * 80));
        if (p !== prev) {
          row.last = p;
          changes.push({ t: row.t, prev, last: p });
        }
      }
      return changes;
    },
  };
}

export function bidAsk(row) {
  return { bid: Math.max(row.floor, tickDown(row.last)), ask: Math.min(row.ceil, tickUp(row.last)) };
}

/** Cap-weighted VN30 (simulated) level plus breadth. */
export function summarize(list) {
  let num = 0;
  let den = 0;
  let volume = 0;
  const counts = { ceiling: 0, floor: 0, reference: 0, up: 0, down: 0 };
  for (const r of list) {
    num += r.last * r.shares;
    den += r.ref * r.shares;
    volume += r.volume;
    counts[stateOf(r.last, r.ref, r.ceil, r.floor)]++;
  }
  const value = (num / den) * INDEX_BASE;
  return {
    value,
    change: value - INDEX_BASE,
    pct: ((value - INDEX_BASE) / INDEX_BASE) * 100,
    volume,
    advancers: counts.up + counts.ceiling,
    decliners: counts.down + counts.floor,
    unchanged: counts.reference,
    ceiling: counts.ceiling,
    floor: counts.floor,
  };
}

// ---------- candles ----------

/** `n` past sessions ending at the reference price (the previous close). */
export function candles(stock, seed, n = CANDLE_COUNT) {
  const rng = mulberry32(hashStr(stock.t) ^ Math.imul(seed + 3, 0xc2b2ae35) ^ 0x9e3779b9);
  const gauss = () => (rng() + rng() + rng() - 1.5) * 2;
  const closes = new Array(n);
  closes[n - 1] = stock.ref;
  for (let i = n - 1; i >= 1; i--) closes[i - 1] = roundToTick(closes[i] / (1 + gauss() * 0.014 + 0.0004));
  const before = roundToTick(closes[0] / (1 + gauss() * 0.014));
  const out = [];
  for (let i = 0; i < n; i++) {
    const prevClose = i ? closes[i - 1] : before;
    const open = roundToTick(prevClose * (1 + gauss() * 0.004));
    const close = closes[i];
    const high = ceilToTick(Math.max(open, close) * (1 + rng() * 0.01));
    const low = floorToTick(Math.min(open, close) * (1 - rng() * 0.01));
    const volume = Math.round((stock.shares * (0.0006 + rng() * 0.0034)) / 100) * 100;
    out.push({ open, high, low, close, volume });
  }
  return out;
}
