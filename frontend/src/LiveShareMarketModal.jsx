import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API = 'http://localhost:5050';

/* ─────────────────────────────────
   Symbol config
─────────────────────────────────*/
const INDEX_SYMBOLS  = ['^BSESN', '^NSEI'];
const STOCK_SYMBOLS  = ['TCS.NS','INFY.NS','RELIANCE.NS','HDFCBANK.NS','WIPRO.NS','BAJFINANCE.NS'];
const WATCHLIST_SYMS = ['TCS.NS','RELIANCE.NS','HDFCBANK.NS'];

// Indian companies listed in the US (ADRs) — Finnhub covers these well
const ADR_META = {
  INFY: { name: 'Infosys Ltd (NYSE)', flag: '🇮🇳' },
  WIT:  { name: 'Wipro Ltd (NYSE)',   flag: '🇮🇳' },
  HDB:  { name: 'HDFC Bank (NYSE)',   flag: '🇮🇳' },
  IBN:  { name: 'ICICI Bank (NYSE)',  flag: '🇮🇳' },
  RDY:  { name: "Dr Reddy's (NYSE)",  flag: '🇮🇳' },
};

function cleanSym(s) { return s.replace(/\.(NS|BO)$/, '').replace('^', ''); }
function displayName(q) { return q?.shortName || q?.longName || q?.symbol || ''; }

// Detect Indian IPOs by exchange name or symbol suffix
function isIndianIPO(ipo) {
  const ex  = (ipo.exchange || '').toUpperCase();
  const sym = (ipo.symbol   || '').toUpperCase();
  return (
    ex.includes('NSE') ||
    ex.includes('BSE') ||
    ex.includes('INDIA') ||
    ex.includes('NATIONAL STOCK') ||
    ex.includes('BOMBAY') ||
    sym.endsWith('.NS') ||
    sym.endsWith('.BO')
  );
}

/* ─────────────────────────────────
   SVG Candlestick Chart
─────────────────────────────────*/
function CandlestickChart({ symbol, candles, price, changePercent }) {
  const W = 700, H = 180;
  if (!candles || candles.length < 2) {
    return (
      <div className="sm-chart-wrapper">
        <div className="sm-chart-empty">⏳ Loading chart data…</div>
      </div>
    );
  }
  const prices = candles.flatMap(c => [c.h, c.l]).filter(v => v != null);
  const minP   = Math.min(...prices);
  const maxP   = Math.max(...prices);
  const range  = maxP - minP || 1;
  const toY    = val => H - ((val - minP) / range) * (H - 20) - 8;
  const candleW = Math.min(8, (W / candles.length) * 0.65);
  const step    = W / candles.length;
  const positive = parseFloat(changePercent) >= 0;

  return (
    <div className="sm-chart-wrapper">
      <div className="sm-chart-header">
        <div>
          <span className="sm-chart-symbol">{cleanSym(symbol)}</span>
          <span className={`sm-chart-price ${positive ? 'pos' : 'neg'}`}>
            {price != null ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
          </span>
          {changePercent != null && (
            <span className={`sm-chart-change ${positive ? 'pos' : 'neg'}`}>
              {positive ? '+' : ''}{parseFloat(changePercent).toFixed(2)}%
            </span>
          )}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="sm-candlestick-svg">
        {[0.25, 0.5, 0.75].map(p => (
          <line key={p} x1={0} y1={H * p} x2={W} y2={H * p}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
        ))}
        {candles.map((c, i) => {
          if (c.o == null || c.c == null) return null;
          const x       = i * step + step / 2;
          const isGreen = c.c >= c.o;
          const color   = isGreen ? '#22c55e' : '#ef4444';
          const bodyTop = toY(Math.max(c.o, c.c));
          const bodyBot = toY(Math.min(c.o, c.c));
          const bodyH   = Math.max(bodyBot - bodyTop, 1.5);
          return (
            <g key={i}>
              {c.h != null && c.l != null && (
                <line x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)}
                  stroke={color} strokeWidth={1} opacity={0.8} />
              )}
              <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={bodyH}
                fill={color} rx={1} opacity={0.9} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ─────────────────────────────────
   Index Card (Yahoo Finance — NSE/BSE)
─────────────────────────────────*/
function IndexCard({ quote }) {
  if (!quote) return (
    <motion.div className="sm-index-card" style={{ opacity: 0.35, minWidth: 160 }}>
      <div className="sm-index-name">——</div>
      <div className="sm-index-value">Loading…</div>
    </motion.div>
  );
  const pct  = quote.regularMarketChangePercent;
  const pos  = pct >= 0;
  const name = quote.symbol === '^BSESN' ? 'SENSEX' : quote.symbol === '^NSEI' ? 'NIFTY 50' : cleanSym(quote.symbol);
  return (
    <motion.div className="sm-index-card" whileHover={{ y: -4, scale: 1.02 }}>
      <div className="sm-index-name">{name}</div>
      <div className={`sm-index-value ${pos ? 'pos' : 'neg'}`}>
        {quote.regularMarketPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
      <div className={`sm-index-change ${pos ? 'pos' : 'neg'}`}>
        {pos ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
        <span style={{ fontSize: '0.7rem', marginLeft: 6, opacity: 0.7 }}>
          ({pos ? '+' : ''}{quote.regularMarketChange?.toFixed(2)})
        </span>
      </div>
      <div className={`sm-index-bar ${pos ? 'pos' : 'neg'}`} />
    </motion.div>
  );
}

/* ─────────────────────────────────
   NSE Stock Card (Yahoo Finance)
─────────────────────────────────*/
function StockCard({ quote }) {
  if (!quote) return null;
  const pct = quote.regularMarketChangePercent;
  const pos = pct >= 0;
  return (
    <motion.div className="sm-stock-card" whileHover={{ y: -3, scale: 1.02 }}>
      <div className="sm-stock-symbol">{cleanSym(quote.symbol)}</div>
      <div className="sm-stock-name">{displayName(quote)}</div>
      <div className={`sm-stock-price ${pos ? 'pos' : 'neg'}`}>
        ₹{quote.regularMarketPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
      </div>
      <div className={`sm-stock-pct ${pos ? 'pos' : 'neg'}`}>
        {pos ? '+' : ''}{pct?.toFixed(2)}%
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────
   ADR Card (Finnhub — Indian co. on NYSE)
─────────────────────────────────*/
function AdrCard({ adr }) {
  const pos  = adr.dp >= 0;
  const meta = ADR_META[adr.symbol] || { name: adr.symbol, flag: '🌐' };
  return (
    <motion.div className="sm-adr-card" whileHover={{ y: -3, scale: 1.02 }}>
      <div className="sm-adr-header">
        <span className="sm-adr-flag">{meta.flag}</span>
        <span className="sm-adr-sym">{adr.symbol}</span>
        <span className="sm-adr-tag">NYSE · ADR</span>
      </div>
      <div className="sm-adr-name">{meta.name}</div>
      <div className={`sm-adr-price ${pos ? 'pos' : 'neg'}`}>
        ${adr.c?.toFixed(2)}
      </div>
      <div className={`sm-adr-row`}>
        <span className={pos ? 'pos' : 'neg'}>{pos ? '+' : ''}{adr.d?.toFixed(2)} ({pos ? '+' : ''}{adr.dp?.toFixed(2)}%)</span>
        <span className="sm-adr-pc">PC: ${adr.pc?.toFixed(2)}</span>
      </div>
      <div className="sm-adr-hl">
        <span>H: <b>${adr.h?.toFixed(2)}</b></span>
        <span>L: <b>${adr.l?.toFixed(2)}</b></span>
        <span>O: <b>${adr.o?.toFixed(2)}</b></span>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────
   Watchlist Row
─────────────────────────────────*/
function WatchlistRow({ quote }) {
  if (!quote) return null;
  const pct = quote.regularMarketChangePercent;
  const pos = pct >= 0;
  return (
    <div className="sm-wl-row">
      <div>
        <div className="sm-wl-symbol">{cleanSym(quote.symbol)}</div>
        <div className="sm-wl-name">{displayName(quote)}</div>
      </div>
      <div className="sm-wl-right">
        <div className={`sm-wl-price ${pos ? 'pos' : 'neg'}`}>
          ₹{quote.regularMarketPrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
        </div>
        <div className={`sm-wl-pct ${pos ? 'pos' : 'neg'}`}>
          {pos ? '+' : ''}{pct?.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   Market Sentiment
─────────────────────────────────*/
function SentimentSection({ quotes }) {
  if (!quotes || quotes.length === 0) return null;
  const advancing = quotes.filter(q => (q.regularMarketChangePercent ?? q.dp ?? 0) >= 0).length;
  const total     = quotes.length;
  const bullPct   = Math.round((advancing / total) * 100);
  const bearPct   = 100 - bullPct;
  return (
    <div className="sm-sentiment-card">
      <div className="sm-section-label">📊 Market Sentiment</div>
      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
        Based on {total} tracked instruments
      </div>
      <div className="sm-sentiment-bar-wrap">
        <motion.div className="sm-sentiment-bull"
          animate={{ width: `${bullPct}%` }} transition={{ duration: 0.9, ease: 'easeInOut' }} />
        <motion.div className="sm-sentiment-bear"
          animate={{ width: `${bearPct}%` }} transition={{ duration: 0.9, ease: 'easeInOut' }} />
      </div>
      <div className="sm-sentiment-labels">
        <span className="pos">🟢 Bullish {bullPct}%</span>
        <span className="neg">🔴 Bearish {bearPct}%</span>
      </div>
      <div className="sm-sentiment-stats">
        <div className="sm-sent-stat">
          <span className="sm-sent-num pos">{advancing}</span>
          <span className="sm-sent-label">Advancing</span>
        </div>
        <div className="sm-sent-divider" />
        <div className="sm-sent-stat">
          <span className="sm-sent-num neg">{total - advancing}</span>
          <span className="sm-sent-label">Declining</span>
        </div>
        <div className="sm-sent-divider" />
        <div className="sm-sent-stat">
          <span className="sm-sent-num" style={{ color: '#94a3b8' }}>{total}</span>
          <span className="sm-sent-label">Tracked</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   Market Movers
─────────────────────────────────*/
function MarketMovers({ gainers, losers, loading }) {
  const Skeleton = () => (
    <div className="sm-mover-row" style={{ opacity: 0.25 }}>
      <div><div className="sm-mover-sym">——</div><div className="sm-mover-name">Loading…</div></div>
    </div>
  );
  return (
    <div className="sm-movers-wrap">
      {[['🚀 Top Gainers', gainers, 'gain', true], ['📉 Top Losers', losers, 'lose', false]].map(([title, list, cls, isGain]) => (
        <div key={title} className="sm-movers-col">
          <div className="sm-section-label">{title}</div>
          {loading
            ? Array(5).fill(0).map((_, i) => <Skeleton key={i} />)
            : list.map((s, i) => (
              <motion.div key={s.symbol} className={`sm-mover-row ${cls}`}
                initial={{ opacity: 0, x: isGain ? -10 : 10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <div>
                  <div className="sm-mover-sym">{s.symbol}</div>
                  <div className="sm-mover-name">{s.name}</div>
                </div>
                <div className="sm-mover-right">
                  <div className={`sm-mover-price ${isGain ? 'pos' : 'neg'}`}>
                    ₹{s.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`sm-mover-pct ${isGain ? 'pos' : 'neg'}`}>
                    {isGain ? '+' : ''}{s.change}%
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────
   IPO Section — REAL data from Finnhub
─────────────────────────────────*/
const STATUS_COLOR = { expected: '#facc15', priced: '#22c55e', filed: '#60a5fa', withdrawn: '#ef4444' };
const STATUS_ICON  = { expected: '🟡', priced: '🟢', filed: '🔵', withdrawn: '🔴' };

// Map Finnhub status → filter bucket
const IPO_FILTER_MAP = {
  live:      s => s === 'priced',
  upcoming:  s => s === 'expected' || s === 'filed',
  completed: s => s === 'withdrawn',
};

const IPO_FILTERS = [
  { key: 'all',       label: 'All',       icon: '📋' },
  { key: 'upcoming',  label: 'Upcoming',  icon: '🗓️' },
  { key: 'live',      label: 'Live',      icon: '🚀' },
  { key: 'completed', label: 'Completed', icon: '✅' },
];

function IPOSection({ ipos, loading }) {
  const [ipoFilter, setIpoFilter] = React.useState('all');

  if (loading) {
    return (
      <div className="sm-ipo-grid">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="sm-ipo-card" style={{ opacity: 0.3 }}>
            <div className="sm-ipo-status">⏳ Loading…</div>
            <div className="sm-ipo-name">Fetching IPO data…</div>
          </div>
        ))}
      </div>
    );
  }

  if (!ipos || ipos.length === 0) {
    return (
      <div className="sm-options-note">
        <div className="sm-options-badge">📭 No IPO data found in this period</div>
      </div>
    );
  }

  const filteredIpos = ipoFilter === 'all'
    ? ipos
    : ipos.filter(ipo => IPO_FILTER_MAP[ipoFilter]?.(ipo.status));

  const counts = {
    all:       ipos.length,
    upcoming:  ipos.filter(ipo => IPO_FILTER_MAP.upcoming(ipo.status)).length,
    live:      ipos.filter(ipo => IPO_FILTER_MAP.live(ipo.status)).length,
    completed: ipos.filter(ipo => IPO_FILTER_MAP.completed(ipo.status)).length,
  };

  return (
    <>
      {/* Filter Pills */}
      <div className="sm-ipo-filter-bar">
        {IPO_FILTERS.map(f => (
          <button
            key={f.key}
            className={`sm-ipo-filter-btn ${ipoFilter === f.key ? 'active' : ''}`}
            onClick={() => setIpoFilter(f.key)}
          >
            <span className="sm-ipo-filter-icon">{f.icon}</span>
            {f.label}
            <span className={`sm-ipo-filter-count ${ipoFilter === f.key ? 'active' : ''}`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filteredIpos.length === 0 ? (
        <div className="sm-options-note">
          <div className="sm-options-badge">📭 No {ipoFilter} IPOs found</div>
        </div>
      ) : (
        <div className="sm-ipo-grid">
          {filteredIpos.map((ipo, i) => (
            <motion.div key={`${ipo.symbol}-${i}`} className="sm-ipo-card"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, scale: 1.02 }}
              style={{ borderColor: ipo.status === 'priced' ? 'rgba(34,197,94,0.25)' : undefined }}
            >
              <div className="sm-ipo-status" style={{ color: STATUS_COLOR[ipo.status] || '#facc15' }}>
                {STATUS_ICON[ipo.status] || '📋'} {ipo.status?.toUpperCase()}
              </div>
              <div className="sm-ipo-name">{ipo.name}</div>
              {ipo.symbol && ipo.symbol !== '—' && (
                <div className="sm-ipo-ticker">{ipo.symbol} · {ipo.exchange}</div>
              )}
              <div className="sm-ipo-row"><span>📅 Open</span><span>{ipo.date || '—'}</span></div>
              {ipo.closeDate && (
                <div className="sm-ipo-row"><span>📅 Close</span><span>{ipo.closeDate}</span></div>
              )}
              {ipo.listingDate && (
                <div className="sm-ipo-row"><span>📈 Listing</span><span>{ipo.listingDate}</span></div>
              )}
              {(ipo.priceRange || ipo.price) && (
                <div className="sm-ipo-row">
                  <span>💰 Price</span>
                  <span>{`₹${ipo.priceRange || ipo.price}`}</span>
                </div>
              )}
              {ipo.lotSize && (
                <div className="sm-ipo-row"><span>📦 Lot Size</span><span>{ipo.lotSize}</span></div>
              )}
              {ipo.totalValue > 0 && (
                <div className="sm-ipo-row">
                  <span>💎 Issue Size</span>
                  <span>₹{(ipo.totalValue / 1e7).toFixed(0)} Cr</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}

/* ─────────────────────────────────
   Futures Tab
─────────────────────────────────*/
const FUTURES_BASE = [
  { symbol: 'NIFTY FUT',     expiry: 'Apr 24', yfSym: '^NSEI' },
  { symbol: 'BANKNIFTY FUT', expiry: 'Apr 24', yfSym: null },
  { symbol: 'SENSEX FUT',    expiry: 'Apr 25', yfSym: '^BSESN' },
  { symbol: 'FINNIFTY FUT',  expiry: 'Apr 29', yfSym: null },
];

function FuturesTab({ indexQuotes }) {
  const enriched = FUTURES_BASE.map(f => {
    const q = f.yfSym ? indexQuotes.find(q => q.symbol === f.yfSym) : null;
    return { ...f, price: q?.regularMarketPrice, change: q?.regularMarketChangePercent?.toFixed(2) };
  });

  return (
    <div className="sm-futures-wrap">
      <div className="sm-section-label">📦 Index Futures — Live Spot Prices (NSE/BSE)</div>
      <div className="sm-futures-table">
        <div className="sm-ft-header">
          <span>Contract</span><span>Expiry</span><span>Spot Price</span><span>Change</span><span>Data</span>
        </div>
        {enriched.map((f, i) => (
          <motion.div key={f.symbol} className="sm-ft-row"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
          >
            <span className="sm-ft-sym">{f.symbol}</span>
            <span className="sm-ft-exp">{f.expiry}</span>
            <span className="sm-ft-price">
              {f.price ? `₹${f.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
            </span>
            <span className={`sm-ft-chg ${(f.change ?? 0) >= 0 ? 'pos' : 'neg'}`}>
              {f.change != null ? `${f.change >= 0 ? '+' : ''}${f.change}%` : '—'}
            </span>
            <span className="sm-ft-vol" style={{ color: '#60a5fa', fontSize: '0.7rem' }}>
              {f.yfSym ? 'Yahoo Finance' : 'N/A (free)'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   MAIN MODAL
─────────────────────────────────*/
const TABS = ['Live Stocks', 'Indian ADRs', 'Futures & Options', 'IPOs', 'Watchlist'];
const TIME_FILTERS = ['1m', '5m', '15m', '1H', '1D'];
const TIME_INTERVAL_MAP = { '1m': '1m', '5m': '5m', '15m': '15m', '1H': '60m', '1D': '1d' };
const TIME_RANGE_MAP    = { '1m': '1d', '5m': '1d', '15m': '5d', '1H': '5d', '1D': '1mo' };

function ErrorBanner({ msg }) {
  return (
    <div className="sm-error-banner">
      ⚠️ {msg}
    </div>
  );
}

export default function LiveShareMarketModal() {
  const [activeTab, setActiveTab] = useState('Live Stocks');

  // NSE/BSE quotes (Yahoo Finance)
  const [allQuotes, setAllQuotes]         = useState([]);
  const [quotesLoading, setQuotesLoading] = useState(true);
  const [quotesError, setQuotesError]     = useState(null);

  // Finnhub ADR quotes
  const [adrQuotes, setAdrQuotes]         = useState([]);
  const [adrLoading, setAdrLoading]       = useState(true);

  // Chart
  const [selectedSymbol, setSelectedSymbol] = useState('TCS.NS');
  const [timeFilter, setTimeFilter]         = useState('5m');
  const [chartData, setChartData]           = useState(null);
  const [chartLoading, setChartLoading]     = useState(true);

  // Movers
  const [gainers, setGainers]           = useState([]);
  const [losers, setLosers]             = useState([]);
  const [moversLoading, setMoversLoading] = useState(true);

  // IPOs (Finnhub)
  const [ipos, setIpos]           = useState([]);
  const [ipoLoading, setIpoLoading] = useState(true);

  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedSymbols, setSearchedSymbols] = useState([]);
  const searchRef = useRef(null);

  /* ── Check if Indian Market (NSE) is Open ── */
  const isNSEOpen = () => {
    const now = new Date();
    try {
      // Get current time in IST
      const options = { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit', weekday: 'short' };
      const formatter = new Intl.DateTimeFormat('en-IN', options);
      const parts = formatter.formatToParts(now);
      const getPart = type => parts.find(p => p.type === type)?.value;
      
      const day = getPart('weekday');
      const hour = parseInt(getPart('hour'));
      const min = parseInt(getPart('minute'));
      
      // Weekends closed
      if (['Sat', 'Sun'].includes(day)) return false;
      
      const timeInMins = hour * 60 + min;
      const startMins = 9 * 60 + 15; // 09:15
      const endMins = 15 * 60 + 30;  // 15:30
      
      return timeInMins >= startMins && timeInMins <= endMins;
    } catch { return true; } // Fallback to open if check fails
  };

  const marketOpen = isNSEOpen();

  /* ── Fetch NSE/BSE quotes ── */
  const fetchQuotes = useCallback(async () => {
    const syms = [...INDEX_SYMBOLS, ...STOCK_SYMBOLS, ...WATCHLIST_SYMS, ...searchedSymbols].join(',');
    try {
      const res = await axios.get(`${API}/api/market/quotes`, { params: { symbols: syms }, timeout: 12000 });
      setAllQuotes(res.data);
      setQuotesError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setQuotesError(e.message);
    } finally {
      setQuotesLoading(false);
    }
  }, [searchedSymbols]);

  /* ── Fetch Finnhub ADR quotes ── */
  const fetchAdr = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/market/fh-quotes`, { timeout: 10000 });
      setAdrQuotes(res.data || []);
    } catch {
      setAdrQuotes([]);
    } finally {
      setAdrLoading(false);
    }
  }, []);

  /* ── Fetch chart ── */
  const fetchChart = useCallback(async (symbol, filter) => {
    setChartLoading(true);
    try {
      const res = await axios.get(`${API}/api/market/chart/${symbol}`, {
        params: { interval: TIME_INTERVAL_MAP[filter] || '5m', range: TIME_RANGE_MAP[filter] || '1d' },
        timeout: 10000,
      });
      setChartData(res.data);
    } catch {
      setChartData(null);
    } finally {
      setChartLoading(false);
    }
  }, []);

  /* ── Fetch movers ── */
  const fetchMovers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/market/movers`, { timeout: 14000 });
      setGainers(res.data.gainers || []);
      setLosers(res.data.losers  || []);
    } catch { /* silent */ } finally {
      setMoversLoading(false);
    }
  }, []);

  /* ── Fetch Indian IPOs from BSE India API ── */
  const fetchIpos = useCallback(async () => {
    setIpoLoading(true);
    try {
      const res = await axios.get(`${API}/api/market/india-ipo`, { timeout: 12000 });
      setIpos(res.data || []);
    } catch {
      setIpos([]);
    } finally {
      setIpoLoading(false);
    }
  }, []);

  /* ── Initial loads ── */
  useEffect(() => {
    fetchQuotes();
    fetchAdr();
    fetchMovers();
    fetchIpos();
  }, [fetchQuotes, fetchAdr, fetchMovers, fetchIpos]);

  /* ── Search Dropdown handlers ── */
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await axios.get(`${API}/api/search?q=${searchQuery}`);
        setSearchResults(res.data.items || []);
      } catch(e) { } finally { setIsSearching(false); }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  /* ── Auto-refresh ── */
  useEffect(() => {
    const t1 = setInterval(fetchQuotes, 60000);
    const t2 = setInterval(fetchAdr, 30000);     // Finnhub 30s
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchQuotes, fetchAdr]);

  useEffect(() => { fetchChart(selectedSymbol, timeFilter); }, [selectedSymbol, timeFilter, fetchChart]);

  /* ── Derived ── */
  const indexQuotes = allQuotes.filter(q => INDEX_SYMBOLS.includes(q.symbol));
  const stockQuotes = allQuotes.filter(q => STOCK_SYMBOLS.includes(q.symbol));
  const watchQuotes = allQuotes.filter(q => WATCHLIST_SYMS.includes(q.symbol));
  const searchedQuotes = allQuotes.filter(q => searchedSymbols.includes(q.symbol));
  const chartQuote  = allQuotes.find(q => q.symbol === selectedSymbol);

  // Combine NSE stocks + ADRs for sentiment
  const allForSentiment = [
    ...stockQuotes,
    ...searchedQuotes,
    ...adrQuotes.map(a => ({ regularMarketChangePercent: a.dp })),
  ];

  const formatTime = d => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="sm-wrapper">
      {/* ── HEADER ── */}
      <div className="sm-header">
        <div className="sm-header-left">
          <span className="sm-header-icon">📈</span>
          <div>
            <h1 className="sm-header-title">Live Share Market</h1>
            <p className="sm-header-time">
              {quotesLoading ? 'Connecting…' : `Updated: ${formatTime(lastUpdated)} IST · Yahoo Finance + Finnhub`}
            </p>
          </div>
        </div>
        <div className="sm-header-actions">
          <div className="sm-search-container" ref={searchRef} style={{ position: 'relative' }}>
            <input 
              type="text" 
              className="sm-search-input" 
              placeholder="🔍 Search shares..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                padding: '6px 12px', borderRadius: '12px', color: '#fff', outline: 'none',
                minWidth: '180px', fontSize: '0.85rem'
              }}
            />
            {searchResults.length > 0 && (
              <div className="sm-search-dropdown" style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', marginTop: '4px', zIndex: 100, maxHeight: '250px', overflowY: 'auto'
              }}>
                {searchResults.map((s, idx) => (
                  <div key={idx} className="sm-search-item" style={{
                    padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', fontSize: '0.8rem', textAlign: 'left'
                  }} onClick={() => {
                    if (!searchedSymbols.includes(s.symbol)) {
                      setSearchedSymbols(p => [...p, s.symbol]);
                    }
                    setSelectedSymbol(s.symbol);
                    setActiveTab('Live Stocks');
                    setSearchResults([]);
                    setSearchQuery('');
                  }}>
                    <div style={{ fontWeight: '600' }}>{s.symbol}</div>
                    <div style={{ opacity: 0.6, fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name} · {s.exchange}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`sm-status-badge ${marketOpen ? 'open' : 'closed'}`} title={marketOpen ? 'Trading Hours' : 'After Hours'}>
            <span className={`sm-status-dot ${marketOpen ? 'open' : 'closed'}`} />
            {marketOpen ? 'Market Open' : 'Market Closed'}
          </div>
          <div className="sm-market-badge">
            <span className="sm-market-dot" />
            {quotesLoading ? 'Connecting…' : quotesError ? 'Partial' : 'Live Data'}
          </div>
          <button className="sm-icon-btn"
            onClick={() => { fetchQuotes(); fetchAdr(); fetchMovers(); fetchIpos(); }}
            title="Refresh all"
          >🔄</button>
        </div>
      </div>

      {quotesError && <ErrorBanner msg={`NSE data error: ${quotesError}`} />}

      {/* ── TABS ── */}
      <div className="sm-tab-bar">
        {TABS.map(tab => (
          <button key={tab}
            className={`sm-tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {activeTab === tab && <motion.div layoutId="sm-tab-underline" className="sm-tab-underline" />}
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="sm-body">
        <AnimatePresence mode="wait">

          {/* ── Live Stocks (NSE/BSE via Yahoo Finance) ── */}
          {activeTab === 'Live Stocks' && (
            <motion.div key="stocks"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <section className="sm-section">
                <div className="sm-section-label">🌐 Market Overview — NSE / BSE (Yahoo Finance)</div>
                <div className="sm-overview-row">
                  {quotesLoading
                    ? [1,2,3,4,5,6,7,8].map(i => (
                        <motion.div key={i} className="sm-index-card" style={{ opacity: 0.3, minWidth: 130 }}>
                          <div className="sm-index-name">——</div>
                          <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.3)' }}>Loading…</div>
                        </motion.div>
                      ))
                    : <>
                        {indexQuotes.map(q => <IndexCard key={q.symbol} quote={q} />)}
                        {stockQuotes.map(q => <StockCard key={q.symbol} quote={q} />)}
                        {searchedQuotes.map(q => <StockCard key={q.symbol} quote={q} />)}
                      </>
                  }
                </div>
              </section>

              {/* Chart + Sentiment */}
              <div className="sm-chart-sentiment-row">
                <section className="sm-section sm-chart-section">
                  <div className="sm-section-label">📊 Live Candlestick Chart (Yahoo Finance · NSE)</div>
                  <div className="sm-stock-selector">
                    {STOCK_SYMBOLS.map(sym => (
                      <button key={sym}
                        className={`sm-selector-btn ${selectedSymbol === sym ? 'active' : ''}`}
                        onClick={() => setSelectedSymbol(sym)}
                      >{cleanSym(sym)}</button>
                    ))}
                    {searchedSymbols.map(sym => (
                      <button key={sym}
                        className={`sm-selector-btn ${selectedSymbol === sym ? 'active' : ''}`}
                        onClick={() => setSelectedSymbol(sym)}
                        style={{ borderColor: selectedSymbol === sym ? '#3b82f6' : 'rgba(59, 130, 246, 0.4)' }}
                      >{cleanSym(sym)}</button>
                    ))}
                  </div>
                  <div className="sm-time-filters" style={{ marginBottom: 10 }}>
                    {TIME_FILTERS.map(f => (
                      <button key={f}
                        className={`sm-time-btn ${timeFilter === f ? 'active' : ''}`}
                        onClick={() => setTimeFilter(f)}
                      >{f}</button>
                    ))}
                  </div>
                  {chartLoading
                    ? <div className="sm-chart-wrapper"><div className="sm-chart-empty">⏳ Loading chart…</div></div>
                    : <CandlestickChart
                        symbol={selectedSymbol}
                        candles={chartData?.candles || []}
                        price={chartQuote?.regularMarketPrice ?? chartData?.regularMarketPrice}
                        changePercent={chartQuote?.regularMarketChangePercent}
                      />
                  }
                </section>
                <SentimentSection quotes={allForSentiment} />
              </div>

              {/* Movers */}
              <section className="sm-section">
                <div className="sm-section-label">⚡ Market Movers — NSE (Yahoo Finance)</div>
                <MarketMovers gainers={gainers} losers={losers} loading={moversLoading} />
              </section>
            </motion.div>
          )}

          {/* ── Indian ADRs (Finnhub) ── */}
          {activeTab === 'Indian ADRs' && (
            <motion.div key="adrs"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            >
              <div className="sm-section-label">
                🇮🇳 Indian Companies Listed on NYSE &amp; NASDAQ — Real-time via Finnhub
              </div>
              <div className="sm-adr-info-bar">
                <span>⚡ Prices update every 30 seconds via Finnhub API</span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>Prices in USD</span>
              </div>
              {adrLoading
                ? (
                  <div className="sm-adr-grid">
                    {Array(5).fill(0).map((_, i) => (
                      <div key={i} className="sm-adr-card" style={{ opacity: 0.25 }}>
                        <div className="sm-adr-sym">——</div>
                        <div className="sm-adr-price">Loading…</div>
                      </div>
                    ))}
                  </div>
                )
                : adrQuotes.length > 0
                  ? (
                    <div className="sm-adr-grid">
                      {adrQuotes.map((adr, i) => (
                        <motion.div key={adr.symbol}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                        >
                          <AdrCard adr={adr} />
                        </motion.div>
                      ))}
                    </div>
                  )
                  : (
                    <div className="sm-options-note">
                      <div className="sm-options-badge">⚠️ ADR data unavailable — check backend connection</div>
                    </div>
                  )
              }
            </motion.div>
          )}

          {/* ── Futures & Options ── */}
          {activeTab === 'Futures & Options' && (
            <motion.div key="futures"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="sm-section"
            >
              <FuturesTab indexQuotes={indexQuotes} />
            </motion.div>
          )}

          {/* ── IPOs (Finnhub — India) ── */}
          {activeTab === 'IPOs' && (
            <motion.div key="ipos"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="sm-section"
            >
              <div className="sm-section-label" style={{ marginBottom: 4 }}>
                🇮🇳 IPO Calendar — India (NSE / BSE)
              </div>
              <div className="sm-adr-info-bar" style={{ marginBottom: 14 }}>
                <span>Data via Finnhub · Last 30 days → Next 90 days · NSE &amp; BSE only</span>
                <span className="sm-ipo-legend">
                  <span style={{ color: '#22c55e' }}>● Live</span>
                  <span style={{ color: '#facc15' }}>● Upcoming</span>
                  <span style={{ color: '#ef4444' }}>● Completed</span>
                </span>
              </div>
              <IPOSection ipos={ipos} loading={ipoLoading} />
            </motion.div>
          )}

          {/* ── Watchlist ── */}
          {activeTab === 'Watchlist' && (
            <motion.div key="watchlist"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="sm-section"
            >
              <div className="sm-section-label">⭐ My Watchlist — NSE Live (Yahoo Finance)</div>
              <div className="sm-watchlist">
                {quotesLoading
                  ? <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>Loading…</div>
                  : watchQuotes.length > 0
                    ? watchQuotes.map(q => <WatchlistRow key={q.symbol} quote={q} />)
                    : <div style={{ padding: 20, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>No data</div>
                }
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
