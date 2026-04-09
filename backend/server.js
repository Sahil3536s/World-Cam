const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5050;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || 'd7aior9r01qmvlmg4g9gd7aior9r01qmvlmg4ga0';
const FH_BASE = 'https://finnhub.io/api/v1';

/* ─────────────────────────────────────────────────────────────
   Yahoo Finance Session (cookie + crumb) for NSE/BSE data
───────────────────────────────────────────────────────────────*/
let yfSession = { cookie: null, crumb: null, fetchedAt: 0 };
const SESSION_TTL = 25 * 60 * 1000;
const YF_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

async function getYfSession() {
  if (yfSession.crumb && Date.now() - yfSession.fetchedAt < SESSION_TTL) return yfSession;
  console.log('[YF] Refreshing session…');
  const cookieRes = await axios.get('https://fc.yahoo.com', {
    headers: { 'User-Agent': YF_UA }, withCredentials: true, validateStatus: () => true, timeout: 8000,
  });
  const cookie = (cookieRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const crumbRes = await axios.get('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': YF_UA, 'Cookie': cookie, 'Accept': '*/*' }, timeout: 8000,
  });
  const crumb = typeof crumbRes.data === 'string' ? crumbRes.data.trim() : null;
  if (!crumb) throw new Error('Could not obtain YF crumb');
  yfSession = { cookie, crumb, fetchedAt: Date.now() };
  console.log('[YF] Session refreshed.');
  return yfSession;
}

async function yfGet(url, params = {}) {
  const session = await getYfSession();
  const res = await axios.get(url, {
    params: { ...params, crumb: session.crumb },
    headers: { 'User-Agent': YF_UA, 'Cookie': session.cookie, 'Accept': 'application/json' },
    timeout: 10000,
  });
  return res.data;
}

/* ─────────────────────────────────────────────────────────────
   FINNHUB HELPERS
───────────────────────────────────────────────────────────────*/
async function fhGet(path, params = {}) {
  const res = await axios.get(`${FH_BASE}${path}`, {
    params: { ...params, token: FINNHUB_KEY },
    timeout: 8000,
  });
  return res.data;
}

/* ─────────────────────────────────────────────────────────────
   ① GET /api/market/quotes   (NSE/BSE via Yahoo Finance)
───────────────────────────────────────────────────────────────*/
app.get('/api/market/quotes', async (req, res) => {
  const symbols = req.query.symbols || '^BSESN,^NSEI,TCS.NS,INFY.NS,RELIANCE.NS,HDFCBANK.NS,WIPRO.NS,BAJFINANCE.NS';
  try {
    const data = await yfGet('https://query1.finance.yahoo.com/v7/finance/quote', {
      symbols,
      fields: 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,regularMarketVolume,shortName,longName,currency',
    });
    res.json(data?.quoteResponse?.result || []);
  } catch (err) {
    yfSession.crumb = null;
    console.error('[market/quotes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   ② GET /api/market/chart/:symbol   (Yahoo Finance candles)
───────────────────────────────────────────────────────────────*/
app.get('/api/market/chart/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const interval   = req.query.interval || '5m';
  const range      = req.query.range    || '1d';
  try {
    const data  = await yfGet(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
      interval, range, includePrePost: false,
    });
    const chart = data?.chart?.result?.[0];
    if (!chart) return res.status(404).json({ error: 'No chart data' });
    const ts      = chart.timestamp || [];
    const q       = chart.indicators?.quote?.[0] || {};
    const candles = ts.map((t, i) => ({
      t: t * 1000, o: q.open?.[i] ?? null, h: q.high?.[i] ?? null,
      l: q.low?.[i] ?? null, c: q.close?.[i] ?? null, v: q.volume?.[i] ?? null,
    })).filter(c => c.o !== null);
    res.json({ symbol, currency: chart.meta?.currency || 'INR', regularMarketPrice: chart.meta?.regularMarketPrice, candles });
  } catch (err) {
    yfSession.crumb = null;
    console.error('[market/chart]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   ③ GET /api/market/movers   (Yahoo Finance basket)
───────────────────────────────────────────────────────────────*/
app.get('/api/market/movers', async (req, res) => {
  const BASKET = 'TCS.NS,INFY.NS,RELIANCE.NS,HDFCBANK.NS,WIPRO.NS,BAJFINANCE.NS,ICICIBANK.NS,LT.NS,KOTAKBANK.NS,AXISBANK.NS,TATAMOTORS.NS,TATAPOWER.NS,ADANIPORTS.NS,COALINDIA.NS,NTPC.NS,TITAN.NS,DIVISLAB.NS,DRREDDY.NS,SUNPHARMA.NS,CIPLA.NS,ONGC.NS,SBIN.NS,MARUTI.NS,NESTLEIND.NS';
  try {
    const data = await yfGet('https://query1.finance.yahoo.com/v7/finance/quote', {
      symbols: BASKET, fields: 'regularMarketPrice,regularMarketChangePercent,shortName',
    });
    const quotes = (data?.quoteResponse?.result || [])
      .filter(q => q.regularMarketChangePercent != null)
      .map(q => ({
        symbol: q.symbol.replace(/\.(NS|BO)$/, ''),
        name:   q.shortName || q.symbol,
        price:  q.regularMarketPrice,
        change: +q.regularMarketChangePercent.toFixed(2),
      }))
      .sort((a, b) => b.change - a.change);
    res.json({ gainers: quotes.slice(0, 5), losers: quotes.slice(-5).reverse() });
  } catch (err) {
    yfSession.crumb = null;
    console.error('[market/movers]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   ④ GET /api/market/fh-quotes   (Finnhub real-time for ticker list)
      Accepts ?symbols=INFY,WIT,HDB,AZRE,IBN (US-listed Indian ADRs)
      Returns array of { symbol, c, d, dp, h, l, o, pc, t }
───────────────────────────────────────────────────────────────*/
const INDIAN_ADRS = ['INFY', 'WIT', 'HDB', 'IBN', 'AZRE', 'RDY', 'SIFY'];

app.get('/api/market/fh-quotes', async (req, res) => {
  const symbols = req.query.symbols
    ? req.query.symbols.split(',')
    : INDIAN_ADRS;

  try {
    const results = await Promise.allSettled(
      symbols.map(sym => fhGet('/quote', { symbol: sym }).then(d => ({ symbol: sym, ...d })))
    );
    const quotes = results
      .filter(r => r.status === 'fulfilled' && r.value.c > 0)
      .map(r => r.value);
    res.json(quotes);
  } catch (err) {
    console.error('[fh-quotes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   ⑤ GET /api/market/ipo   (Finnhub IPO calendar — REAL DATA)
      ?from=YYYY-MM-DD&to=YYYY-MM-DD  (defaults: today → +90 days)
───────────────────────────────────────────────────────────────*/
app.get('/api/market/ipo', async (req, res) => {
  const today  = new Date();
  const future = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const fmt    = d => d.toISOString().split('T')[0];

  const from = req.query.from || fmt(today);
  const to   = req.query.to   || fmt(future);

  try {
    const data = await fhGet('/calendar/ipo', { from, to });
    const ipos = (data.ipoCalendar || [])
      .filter(ipo => ipo.name && ipo.status !== 'withdrawn')   // skip withdrawn / blank
      .map(ipo => ({
        name:           ipo.name,
        symbol:         ipo.symbol || '—',
        exchange:       ipo.exchange || '—',
        date:           ipo.date,
        price:          ipo.price || null,
        numberOfShares: ipo.numberOfShares || null,
        totalValue:     ipo.totalSharesValue || null,
        status:         ipo.status,       // 'expected' | 'priced' | 'filed'
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(ipos);
  } catch (err) {
    console.error('[market/ipo]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   ⑥ GET /api/market/fh-news   (Finnhub market news)
───────────────────────────────────────────────────────────────*/
app.get('/api/market/fh-news', async (req, res) => {
  try {
    const data = await fhGet('/news', { category: 'general' });
    const news = (Array.isArray(data) ? data : []).slice(0, 8).map(n => ({
      headline: n.headline,
      summary:  n.summary,
      url:      n.url,
      datetime: n.datetime,
      source:   n.source,
    }));
    res.json(news);
  } catch (err) {
    console.error('[fh-news]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────────────────────────────────────
   ⑦ GET /api/market/india-ipo   (BSE India + curated fallback)
───────────────────────────────────────────────────────────────*/
const BSE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';
const BSE_HEADERS = {
  'User-Agent':  BSE_UA,
  'Accept':      'application/json, text/plain, */*',
  'Referer':     'https://www.bseindia.com/',
  'Origin':      'https://www.bseindia.com',
};

function normaliseBseStatus(raw = '') {
  const s = raw.toLowerCase();
  if (s.includes('open') || s.includes('subscri'))        return 'priced';
  if (s.includes('upcoming') || s.includes('forthcom'))   return 'expected';
  if (s.includes('allot') || s.includes('listed') || s.includes('closed')) return 'filed';
  if (s.includes('withdrawn') || s.includes('cancelled')) return 'withdrawn';
  return 'expected';
}

// Curated real Indian IPOs — updated periodically as a reliable fallback
const INDIA_IPO_FALLBACK = [
  { name: 'Ather Energy Ltd', symbol: 'ATHER', exchange: 'NSE / BSE', date: '2025-04-28', closeDate: '2025-04-30', listingDate: '2025-05-06', priceRange: '304–321', lotSize: 46, totalValue: 28000000000, status: 'filed', category: 'Mainboard' },
  { name: 'Hexaware Technologies Ltd', symbol: 'HEXAWARE', exchange: 'NSE / BSE', date: '2025-02-12', closeDate: '2025-02-14', listingDate: '2025-02-19', priceRange: '674–708', lotSize: 21, totalValue: 87500000000, status: 'filed', category: 'Mainboard' },
  { name: 'Indira IVF Hospital Ltd', symbol: 'INDIRAIVF', exchange: 'NSE / BSE', date: '2025-03-25', closeDate: '2025-03-27', listingDate: '2025-04-01', priceRange: '425–448', lotSize: 33, totalValue: 22000000000, status: 'filed', category: 'Mainboard' },
  { name: 'Quality Power Electrical Equipments', symbol: 'QUALPOWER', exchange: 'NSE / BSE', date: '2025-02-14', closeDate: '2025-02-18', listingDate: '2025-02-21', priceRange: '401–425', lotSize: 35, totalValue: 8580000000, status: 'filed', category: 'Mainboard' },
  { name: 'Laxmi Dental Ltd', symbol: 'LAXMIDENTAL', exchange: 'NSE / BSE', date: '2025-01-13', closeDate: '2025-01-15', listingDate: '2025-01-20', priceRange: '407–428', lotSize: 35, totalValue: 6980000000, status: 'filed', category: 'Mainboard' },
  { name: 'Standard Glass Lining Technology', symbol: 'SGL', exchange: 'NSE / BSE', date: '2025-01-06', closeDate: '2025-01-08', listingDate: '2025-01-13', priceRange: '133–140', lotSize: 107, totalValue: 4100000000, status: 'filed', category: 'Mainboard' },
  { name: 'Delta Autocorp Ltd', symbol: 'DELTAAUTOCORP', exchange: 'BSE SME', date: '2025-04-14', closeDate: '2025-04-16', listingDate: '2025-04-22', priceRange: '123–130', lotSize: 1000, totalValue: 440000000, status: 'expected', category: 'SME' },
  { name: 'Wagons Learning Ltd', symbol: 'WAGONS', exchange: 'BSE SME', date: '2025-04-11', closeDate: '2025-04-15', listingDate: '2025-04-17', priceRange: '71–75', lotSize: 1600, totalValue: 270000000, status: 'expected', category: 'SME' },
  { name: 'Tankup Engineers Ltd', symbol: 'TANKUP', exchange: 'NSE SME', date: '2025-04-14', closeDate: '2025-04-16', listingDate: '2025-04-22', priceRange: '100–105', lotSize: 1200, totalValue: 320000000, status: 'expected', category: 'SME' },
  { name: 'Iware Techno Solutions', symbol: 'IWARE', exchange: 'BSE SME', date: '2025-04-10', closeDate: '2025-04-14', listingDate: '2025-04-17', priceRange: '60–63', lotSize: 2000, totalValue: 220000000, status: 'expected', category: 'SME' },
];

app.get('/api/market/india-ipo', async (req, res) => {
  try {
    const [r1, r2] = await Promise.allSettled([
      axios.get('https://api.bseindia.com/BseIndiaAPI/api/IPOCurrentIPO/w?flag=1', { headers: BSE_HEADERS, timeout: 8000 }),
      axios.get('https://api.bseindia.com/BseIndiaAPI/api/IPOCurrentIPO/w?flag=0', { headers: BSE_HEADERS, timeout: 8000 }),
    ]);

    const raw = [
      ...(r1.status === 'fulfilled' && Array.isArray(r1.value.data) ? r1.value.data : []),
      ...(r2.status === 'fulfilled' && Array.isArray(r2.value.data) ? r2.value.data : []),
    ];

    if (raw.length > 0) {
      const seen = new Set();
      const ipos = raw
        .filter(ipo => {
          const key = String(ipo.SCRIP_CD || ipo.COMPANY_NAME || '');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map(ipo => ({
          name:        ipo.COMPANY_NAME    || ipo.scrip_name || '—',
          symbol:      ipo.SCRIP_CD        || '—',
          exchange:    'BSE',
          date:        ipo.ISSUE_OPEN_DATE || ipo.LISTING_DATE || '—',
          closeDate:   ipo.ISSUE_CLOSE_DATE || null,
          listingDate: ipo.LISTING_DATE    || null,
          price:       ipo.ISSUE_PRICE     || null,
          priceRange:  ipo.PRICE_BAND      || null,
          lotSize:     ipo.MARKET_LOT      || null,
          totalValue:  ipo.ISSUE_SIZE      ? parseFloat(ipo.ISSUE_SIZE) * 1e7 : null,
          status:      normaliseBseStatus(ipo.STATUS || ''),
          category:    ipo.SEGMENT          || 'Mainboard',
          numberOfShares: null,
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      console.log(`[india-ipo] ${ipos.length} IPOs from BSE API`);
      return res.json(ipos);
    }
  } catch(err) {
    console.warn('[india-ipo] BSE API failed, using fallback:', err.message);
  }

  // Fallback — curated data
  console.log('[india-ipo] Serving curated fallback data');
  res.json(INDIA_IPO_FALLBACK);
});

/* ─────────────────────────────────────────────────────────────
   Cricket (unchanged)
───────────────────────────────────────────────────────────────*/
app.get('/api/cricket/live', async (req, res) => {
  let matches = [];
  try {
    if (process.env.CRICKET_API_KEY && !process.env.CRICKET_API_KEY.includes('EXAMPLE')) {
      const response = await axios.get('https://api.cricapi.com/v1/currentMatches', {
        params: { apikey: process.env.CRICKET_API_KEY, offset: 0 }, timeout: 5000,
      });
      if (response.data.status === 'success') {
        matches = response.data.data
          .filter(m => { const n = (m.name || '').toLowerCase(); return n.includes('ipl') || n.includes('indian premier league'); })
          .map((m, idx) => ({ id: m.id || `api-${idx}`, name: m.name, matchType: m.matchType, status: m.status, venue: m.venue, date: m.date, teams: m.teams, score: m.score || [], teamInfo: m.teamInfo }));
      }
    }
  } catch (err) { console.error('Cricket:', err.message); }

  if (matches.length === 0) {
    matches = [
      { id: 'ipl-mi-kkr', name: 'Mumbai Indians vs Kolkata Knight Riders, Match 2', matchType: 't20', status: 'LIVE - Play in Progress', venue: 'Wankhede Stadium, Mumbai', date: '2026-03-29', teams: ['Mumbai Indians', 'Kolkata Knight Riders'], score: [{ r: 188, w: 4, o: 20, inning: 'Kolkata Knight Riders Inning 1' }, { r: 145, w: 3, o: 14.2, inning: 'Mumbai Indians Inning 1' }], teamInfo: [{ name: 'Mumbai Indians', shortname: 'MI' }, { name: 'Kolkata Knight Riders', shortname: 'KKR' }] },
      { id: 'ipl-rcb-srh', name: 'Royal Challengers Bengaluru vs Sunrisers Hyderabad, Match 1', matchType: 't20', status: 'Royal Challengers Bengaluru won by 6 wickets', venue: 'M. Chinnaswamy Stadium, Bengaluru', date: '2026-03-28', teams: ['Royal Challengers Bengaluru', 'Sunrisers Hyderabad'], score: [{ r: 201, w: 9, o: 20, inning: 'Sunrisers Hyderabad Inning 1' }, { r: 203, w: 4, o: 15.4, inning: 'Royal Challengers Bengaluru Inning 1' }], teamInfo: [{ name: 'Royal Challengers Bengaluru', shortname: 'RCB' }, { name: 'Sunrisers Hyderabad', shortname: 'SRH' }] },
    ];
  }
  res.json(matches);
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json({ items: [] });
  try {
    const response = await axios.get(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`);
    const quotes = response.data.quotes
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'INDEX')
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange
      }));
    res.json({ items: quotes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));