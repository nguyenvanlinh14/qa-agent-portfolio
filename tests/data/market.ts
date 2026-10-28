// Test data for the MarketFlow (demo) app. Specs never hard-code tickers, prices or messages inline:
// they come from here. The VN30 list below is an independent copy of the app data (site/demo/data.js) so the
// tests act as an oracle instead of re-using the code under test. All numbers are simulated demo data.

/** `?seed=42&frozen=1`: deterministic snapshot, no live updates. Every board spec uses it unless it tests live mode. */
export const MARKET_SEED = 42;
export const FROZEN_QUERY = `?seed=${MARKET_SEED}&frozen=1`;
export const LIVE_QUERY = '';

export const DISCLAIMER = 'Simulated data for testing demos — not real prices, not investment advice.';
export const APP_NAME = 'MarketFlow (demo)';
export const INDEX_NAME = 'VN30 (simulated)';

export type Sector =
  | 'Banking'
  | 'Real estate'
  | 'Consumer'
  | 'Energy'
  | 'Industrial'
  | 'Technology'
  | 'Aviation'
  | 'Financial services'
  | 'Retail'
  | 'Materials';

export interface Stock {
  ticker: string;
  name: string;
  sector: Sector;
  /** Reference price in VND. */
  ref: number;
  pe: number;
  /** Market cap in VND billions. */
  mcap: number;
}

const s = (ticker: string, name: string, sector: Sector, ref: number, pe: number, mcap: number): Stock => ({ ticker, name, sector, ref, pe, mcap });

/** VN30 constituents as commonly listed in 2025–2026; composition changes semi-annually. Alphabetical, like the board. */
export const VN30: readonly Stock[] = [
  s('ACB', 'Asia Commercial Bank', 'Banking', 24500, 7.8, 125000),
  s('BCM', 'Becamex IDC', 'Industrial', 62000, 24.5, 64000),
  s('BID', 'BIDV', 'Banking', 38500, 10.8, 270000),
  s('BVH', 'Bao Viet Holdings', 'Financial services', 55000, 18.9, 40800),
  s('CTG', 'VietinBank', 'Banking', 36000, 8.9, 193000),
  s('FPT', 'FPT Corp', 'Technology', 98000, 20.3, 145000),
  s('GAS', 'PV Gas', 'Energy', 71000, 15.4, 163000),
  s('GVR', 'Vietnam Rubber Group', 'Materials', 34500, 25.1, 138000),
  s('HDB', 'HDBank', 'Banking', 26000, 7.1, 90000),
  s('HPG', 'Hoa Phat Group', 'Materials', 27500, 13.6, 175000),
  s('LPB', 'LPBank', 'Banking', 33000, 11.2, 99000),
  s('MBB', 'MB Bank', 'Banking', 26500, 6.9, 160000),
  s('MSN', 'Masan Group', 'Consumer', 72000, 38.5, 103000),
  s('MWG', 'Mobile World', 'Retail', 65000, 17.2, 95000),
  s('PLX', 'Petrolimex', 'Energy', 40000, 16.0, 51000),
  s('SAB', 'Sabeco', 'Consumer', 52000, 17.5, 33300),
  s('SHB', 'SHB', 'Banking', 15500, 6.8, 56000),
  s('SSB', 'SeABank', 'Banking', 18500, 9.5, 52000),
  s('SSI', 'SSI Securities', 'Financial services', 33000, 18.6, 66000),
  s('STB', 'Sacombank', 'Banking', 55000, 9.1, 104000),
  s('TCB', 'Techcombank', 'Banking', 35500, 9.4, 250000),
  s('TPB', 'TPBank', 'Banking', 17500, 8.3, 46000),
  s('VCB', 'Vietcombank', 'Banking', 62000, 14.2, 515000),
  s('VHM', 'Vinhomes', 'Real estate', 95000, 8.8, 390000),
  s('VIB', 'VIB', 'Banking', 19500, 7.5, 58000),
  s('VIC', 'Vingroup', 'Real estate', 150000, 55.0, 580000),
  s('VJC', 'Vietjet', 'Aviation', 105000, 21.7, 57000),
  s('VNM', 'Vinamilk', 'Consumer', 62500, 15.9, 130000),
  s('VPB', 'VPBank', 'Banking', 20500, 10.7, 162000),
  s('VRE', 'Vincom Retail', 'Real estate', 28000, 14.8, 65000),
];

export const VN30_TICKERS: readonly string[] = VN30.map((x) => x.ticker);
export const SECTORS: readonly Sector[] = ['Banking', 'Real estate', 'Consumer', 'Energy', 'Industrial', 'Technology', 'Aviation', 'Financial services', 'Retail', 'Materials'];

export const stock = (ticker: string): Stock => {
  const found = VN30.find((x) => x.ticker === ticker);
  if (!found) throw new Error(`Unknown VN30 ticker in test data: ${ticker}`);
  return found;
};
export const stocksIn = (sector: Sector): Stock[] => VN30.filter((x) => x.sector === sector);

// ---------- HOSE price rules, mirrored for assertions (prices in VND) ----------

/** < 10,000 -> 10; 10,000 to < 50,000 -> 50; >= 50,000 -> 100. */
export function tickSize(price: number): number {
  if (price < 10_000) return 10;
  if (price < 50_000) return 50;
  return 100;
}

/** ref x 1.07, rounded DOWN to the tick of that price level (never above +7%). */
export function ceilingOf(ref: number): number {
  const raw = (ref * 107) / 100;
  const tick = tickSize(raw);
  return Math.floor(raw / tick + 1e-9) * tick;
}

/** ref x 0.93, rounded UP to the tick of that price level (never below -7%). */
export function floorOf(ref: number): number {
  const raw = (ref * 93) / 100;
  const tick = tickSize(raw);
  return Math.ceil(raw / tick - 1e-9) * tick;
}

// ---------- display formats ----------

/** VND -> thousands with 2 decimals: 24500 -> "24.50". */
export const fmtPrice = (vnd: number): string => (vnd / 1000).toFixed(2);

export function fmtChange(vndDelta: number): string {
  if (vndDelta === 0) return '0.00';
  return `${vndDelta > 0 ? '+' : '-'}${(Math.abs(vndDelta) / 1000).toFixed(2)}`;
}

export function fmtPct(last: number, ref: number): string {
  const pct = ((last - ref) / ref) * 100;
  const text = Math.abs(pct).toFixed(2);
  if (Number(text) === 0) return '0.00%';
  return `${pct > 0 ? '+' : '-'}${text}%`;
}

export const fmtMcap = (bn: number): string => bn.toLocaleString('en-US');

// ---------- the frozen snapshot for seed 42 ----------

export type RowState = 'ceiling' | 'floor' | 'reference' | 'up' | 'down';

/** Last prices (VND) shown by the board for `?seed=42&frozen=1`. Golden data: change it only when the simulation changes on purpose. */
export const SEED_42_LAST: Readonly<Record<string, number>> = {
  ACB: 26200, BCM: 66300, BID: 38450, BVH: 54700, CTG: 36750, FPT: 103700, GAS: 70200, GVR: 34900, HDB: 24850, HPG: 27100,
  LPB: 32500, MBB: 24650, MSN: 71000, MWG: 65500, PLX: 37400, SAB: 52000, SHB: 15450, SSB: 18850, SSI: 31900, STB: 51200,
  TCB: 37950, TPB: 16600, VCB: 62900, VHM: 99800, VIB: 19650, VIC: 157900, VJC: 103200, VNM: 62800, VPB: 20300, VRE: 27050,
};

/** Known rows of the seed-42 snapshot, one per colour convention. */
export const KNOWN_ROWS = {
  ceiling: ['ACB', 'BCM', 'TCB'],
  floor: ['MBB', 'STB'],
  reference: ['SAB'],
  up: ['FPT', 'CTG'],
  down: ['BID', 'PLX'],
} as const satisfies Record<RowState, readonly string[]>;

export interface ExpectedRow {
  ticker: string;
  name: string;
  sector: Sector;
  ref: number;
  ceil: number;
  floor: number;
  last: number;
  state: RowState;
  pct: number;
  /** Display strings exactly as the board renders them. */
  text: { ref: string; ceil: string; floor: string; last: string; chg: string; pct: string };
}

export function expectedRow(ticker: string): ExpectedRow {
  const base = stock(ticker);
  const last = SEED_42_LAST[ticker];
  if (last === undefined) throw new Error(`No seed-42 price for ${ticker}`);
  const ceil = ceilingOf(base.ref);
  const floor = floorOf(base.ref);
  const state: RowState = last >= ceil ? 'ceiling' : last <= floor ? 'floor' : last === base.ref ? 'reference' : last > base.ref ? 'up' : 'down';
  return {
    ticker,
    name: base.name,
    sector: base.sector,
    ref: base.ref,
    ceil,
    floor,
    last,
    state,
    pct: ((last - base.ref) / base.ref) * 100,
    text: {
      ref: fmtPrice(base.ref),
      ceil: fmtPrice(ceil),
      floor: fmtPrice(floor),
      last: fmtPrice(last),
      chg: fmtChange(last - base.ref),
      pct: fmtPct(last, base.ref),
    },
  };
}

export const SEED_42_ROWS: readonly ExpectedRow[] = VN30_TICKERS.map(expectedRow);

/** Index summary of the seed-42 snapshot (cap-weighted VN30 simulation, base 1,950). */
export const SEED_42_INDEX = { value: '1,976.96', change: '+26.96 (+1.38%)' } as const;

/** Breadth derived from the snapshot above: advancing counts ceiling, declining counts floor. */
export const SEED_42_BREADTH = {
  advancing: SEED_42_ROWS.filter((r) => r.state === 'up' || r.state === 'ceiling').length,
  unchanged: SEED_42_ROWS.filter((r) => r.state === 'reference').length,
  declining: SEED_42_ROWS.filter((r) => r.state === 'down' || r.state === 'floor').length,
};

/** Tickers ordered by %Chg ascending (ties broken by ticker), the same rule the board uses. */
export const TICKERS_BY_PCT_ASC: readonly string[] = [...SEED_42_ROWS].sort((a, b) => a.pct - b.pct || a.ticker.localeCompare(b.ticker)).map((r) => r.ticker);
export const TICKERS_BY_PCT_DESC: readonly string[] = [...TICKERS_BY_PCT_ASC].reverse();

/** Rounded to 2 decimals, i.e. what the screener compares against. */
export const displayedPct = (ticker: string): number => Math.round(expectedRow(ticker).pct * 100) / 100;

// ---------- storage keys used by the app ----------

export const watchlistKey = (email: string): string => `marketflow.watchlist.${email}`;
export const sessionKey = 'marketflow.session';
