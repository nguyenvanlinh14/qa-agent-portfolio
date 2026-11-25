// MarketFlow (demo) static reference data. Everything here is invented for testing demos.
// VN30 constituents as commonly listed in 2025–2026; composition changes semi-annually.
// Reference prices are in VND, market cap in VND billions, P/E is a plausible-looking fake.
// None of these numbers are real market data and none of this is investment advice.

export const DISCLAIMER = 'Simulated data for testing demos — not real prices, not investment advice.';

export const SECTORS = [
  'Banking',
  'Real estate',
  'Consumer',
  'Energy',
  'Industrial',
  'Technology',
  'Aviation',
  'Financial services',
  'Retail',
  'Materials',
];

// [ticker, company, sector, reference price (VND), P/E, market cap (VND bn)]
const ROWS = [
  ['ACB', 'Asia Commercial Bank', 'Banking', 24500, 7.8, 125000],
  ['BCM', 'Becamex IDC', 'Industrial', 62000, 24.5, 64000],
  ['BID', 'BIDV', 'Banking', 38500, 10.8, 270000],
  ['BVH', 'Bao Viet Holdings', 'Financial services', 55000, 18.9, 40800],
  ['CTG', 'VietinBank', 'Banking', 36000, 8.9, 193000],
  ['FPT', 'FPT Corp', 'Technology', 98000, 20.3, 145000],
  ['GAS', 'PV Gas', 'Energy', 71000, 15.4, 163000],
  ['GVR', 'Vietnam Rubber Group', 'Materials', 34500, 25.1, 138000],
  ['HDB', 'HDBank', 'Banking', 26000, 7.1, 90000],
  ['HPG', 'Hoa Phat Group', 'Materials', 27500, 13.6, 175000],
  ['LPB', 'LPBank', 'Banking', 33000, 11.2, 99000],
  ['MBB', 'MB Bank', 'Banking', 26500, 6.9, 160000],
  ['MSN', 'Masan Group', 'Consumer', 72000, 38.5, 103000],
  ['MWG', 'Mobile World', 'Retail', 65000, 17.2, 95000],
  ['PLX', 'Petrolimex', 'Energy', 40000, 16.0, 51000],
  ['SAB', 'Sabeco', 'Consumer', 52000, 17.5, 33300],
  ['SHB', 'SHB', 'Banking', 15500, 6.8, 56000],
  ['SSB', 'SeABank', 'Banking', 18500, 9.5, 52000],
  ['SSI', 'SSI Securities', 'Financial services', 33000, 18.6, 66000],
  ['STB', 'Sacombank', 'Banking', 55000, 9.1, 104000],
  ['TCB', 'Techcombank', 'Banking', 35500, 9.4, 250000],
  ['TPB', 'TPBank', 'Banking', 17500, 8.3, 46000],
  ['VCB', 'Vietcombank', 'Banking', 62000, 14.2, 515000],
  ['VHM', 'Vinhomes', 'Real estate', 95000, 8.8, 390000],
  ['VIB', 'VIB', 'Banking', 19500, 7.5, 58000],
  ['VIC', 'Vingroup', 'Real estate', 150000, 55.0, 580000],
  ['VJC', 'Vietjet', 'Aviation', 105000, 21.7, 57000],
  ['VNM', 'Vinamilk', 'Consumer', 62500, 15.9, 130000],
  ['VPB', 'VPBank', 'Banking', 20500, 10.7, 162000],
  ['VRE', 'Vincom Retail', 'Real estate', 28000, 14.8, 65000],
];

export const STOCKS = ROWS.map(([t, name, sector, ref, pe, mcap]) => ({
  t,
  name,
  sector,
  ref,
  pe,
  mcap,
  shares: (mcap * 1e9) / ref, // implied share count, used for index weights and volume scale
}));

export const BY_TICKER = new Map(STOCKS.map((s) => [s.t, s]));

/** Reference level of the simulated VN30 index (previous close). */
export const INDEX_BASE = 1950;
