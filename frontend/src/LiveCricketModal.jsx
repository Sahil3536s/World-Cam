import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────
   IPL 2026 STATIC SEED DATA  (mocked realistic)
───────────────────────────────────────────────*/
const TEAM_META = {
  MI:  { name: 'Mumbai Indians',       abbr: 'MI',  color: '#005DA0', logo: '🔵' },
  CSK: { name: 'Chennai Super Kings',  abbr: 'CSK', color: '#F5A623', logo: '🟡' },
  RCB: { name: 'Royal Challengers B.', abbr: 'RCB', color: '#C8102E', logo: '🔴' },
  KKR: { name: 'Kolkata Knight Riders',abbr: 'KKR', color: '#3A225D', logo: '🟣' },
  SRH: { name: 'Sunrisers Hyderabad', abbr: 'SRH',  color: '#FF822A', logo: '🟠' },
  DC:  { name: 'Delhi Capitals',       abbr: 'DC',  color: '#0078BC', logo: '💙' },
  PBKS:{ name: 'Punjab Kings',         abbr: 'PBKS',color: '#AA2033', logo: '❤️'  },
  RR:  { name: 'Rajasthan Royals',     abbr: 'RR',  color: '#EA1A85', logo: '💗' },
  GT:  { name: 'Gujarat Titans',       abbr: 'GT',  color: '#1C4670', logo: '🔷' },
  LSG: { name: 'Lucknow Super Giants', abbr: 'LSG', color: '#A72B2A', logo: '🟥' },
};

/*
  Each match carries a `startISO` (Asia/Kolkata = UTC+05:30).
  resolveStatus() checks current time:
    • currentTime < startISO           → UPCOMING
    • startISO ≤ currentTime < endISO  → LIVE
    • currentTime ≥ endISO             → FINISHED
  The stored `status` field is used ONLY as a fallback for
  matches whose startISO we cannot automatically compute
  (i.e. already-completed historical entries).
*/
function resolveStatus(match) {
  // Historical completed matches keep their status
  if (match.status === 'COMPLETED') return 'FINISHED';
  if (!match.startISO) return match.status;
  const now = Date.now();
  const start = new Date(match.startISO).getTime();
  // T20 innings ~3.5 h total; use 4 h as safe match-end window
  const end = start + 4 * 60 * 60 * 1000;
  if (now < start) return 'UPCOMING';
  if (now >= end)  return 'FINISHED';
  return 'LIVE';
}

const seedMatches = () => [
  /* ── LIVE (started today ~15:47 IST, end ~19:47) ─────────────── */
  {
    id: 1,
    startISO: '2026-03-29T09:30:00Z',
    team1: 'MI',  score1: '189/4', overs1: '17.2',
    team2: 'CSK', score2: '165/6', overs2: '16.0',
    venue: 'Wankhede Stadium, Mumbai', date: '29 Mar 2026', time: '15:00',
    crr: '9.82', rrr: '13.20',
    toss: { winner: 'MI', decision: 'bat' },
    commentary: [
      '17.2: Bumrah bowls a yorker — full and straight. Jadeja fails to get under it. OUT! Caught behind.',
      '17.1: Slower ball takes the outer edge. Wide of third slip — four!',
      '16.6: Brilliant over by Jadeja — only 5 runs from it.'
    ],
    topBatsmen: [{ name: 'Rohit Sharma', runs: 78, balls: 48, fours: 9, sixes: 4 }, { name: 'Ishan Kishan', runs: 45, balls: 32, fours: 5, sixes: 2 }],
    topBowlers: [{ name: 'Jadeja', overs: '4-0-28-2' }, { name: 'Chahar', overs: '3-0-31-1' }],
  },
  {
    id: 2,
    startISO: '2026-03-29T07:30:00Z',
    team1: 'RCB', score1: '142/2', overs1: '13.4',
    team2: 'KKR', score2: null, overs2: null,
    venue: 'Eden Gardens, Kolkata', date: '29 Mar 2026', time: '13:00',
    crr: '10.39', rrr: null,
    toss: { winner: 'KKR', decision: 'field' },
    commentary: [
      '13.4: Kohli drives straight — classic cover drive for four!',
      '13.3: Short delivery, Faf pulls it over midwicket — SIX!',
      '13.2: Dot ball — tight line outside off stump.'
    ],
    topBatsmen: [{ name: 'Virat Kohli', runs: 63, balls: 41, fours: 7, sixes: 3 }, { name: 'Faf du Plessis', runs: 55, balls: 38, fours: 6, sixes: 2 }],
    topBowlers: [{ name: 'Starc', overs: '3-0-22-1' }, { name: 'Russell', overs: '2-0-19-0' }],
  },

  /* ── UPCOMING ─────────────────────────────────────────────────── */
  {
    id: 3,
    startISO: '2026-03-30T14:00:00Z',
    team1: 'SRH', score1: null, overs1: null,
    team2: 'DC',  score2: null, overs2: null,
    venue: 'Rajiv Gandhi Intl. Stadium, Hyderabad', date: '30 Mar 2026', time: '19:30',
    toss: null,
    crr: null, rrr: null, commentary: [], topBatsmen: [], topBowlers: [],
  },
  {
    id: 4,
    startISO: '2026-03-31T10:00:00Z',
    team1: 'PBKS', score1: null, overs1: null,
    team2: 'RR',   score2: null, overs2: null,
    venue: 'Punjab Cricket Association Stadium, Mohali', date: '31 Mar 2026', time: '15:30',
    toss: null,
    crr: null, rrr: null, commentary: [], topBatsmen: [], topBowlers: [],
  },
  {
    id: 5,
    startISO: '2026-04-01T14:00:00Z',
    team1: 'GT',  score1: null, overs1: null,
    team2: 'LSG', score2: null, overs2: null,
    venue: 'Narendra Modi Stadium, Ahmedabad', date: '1 Apr 2026', time: '19:30',
    toss: null,
    crr: null, rrr: null, commentary: [], topBatsmen: [], topBowlers: [],
  },

  /* ── COMPLETED (historical — no startISO needed) ────────────── */
  {
    id: 6, status: 'COMPLETED', winner: 'KKR',
    team1: 'KKR', score1: '215/4', overs1: '20.0',
    team2: 'MI',  score2: '212/6', overs2: '20.0',
    venue: 'Eden Gardens, Kolkata', date: '28 Mar 2026', time: '19:30',
    toss: { winner: 'MI', decision: 'bat' },
    crr: null, rrr: null, commentary: [],
    topBatsmen: [{ name: 'Russell', runs: 92, balls: 38, fours: 6, sixes: 8 }],
    topBowlers: [{ name: 'Narine', overs: '4-0-22-3' }],
  },
  {
    id: 7, status: 'COMPLETED', winner: 'RCB',
    team1: 'RCB', score1: '203/4', overs1: '20.0',
    team2: 'SRH', score2: '201/9', overs2: '20.0',
    venue: 'M. Chinnaswamy Stadium, Bengaluru', date: '27 Mar 2026', time: '19:30',
    toss: { winner: 'SRH', decision: 'field' },
    crr: null, rrr: null, commentary: [],
    topBatsmen: [{ name: 'Kohli', runs: 101, balls: 62, fours: 9, sixes: 5 }],
    topBowlers: [{ name: 'Natarajan', overs: '4-0-45-2' }],
  },
  {
    id: 8, status: 'COMPLETED', winner: 'CSK',
    team1: 'CSK', score1: '178/5', overs1: '20.0',
    team2: 'PBKS', score2: '174/8', overs2: '20.0',
    venue: 'MA Chidambaram Stadium, Chennai', date: '26 Mar 2026', time: '19:30',
    toss: { winner: 'CSK', decision: 'bat' },
    crr: null, rrr: null, commentary: [],
    topBatsmen: [{ name: 'Gaikwad', runs: 82, balls: 53, fours: 8, sixes: 3 }],
    topBowlers: [{ name: 'Pathirana', overs: '4-0-24-3' }],
  },
  {
    id: 9, status: 'COMPLETED', winner: 'DC',
    team1: 'DC', score1: '196/6', overs1: '20.0',
    team2: 'LSG', score2: '190/7', overs2: '20.0',
    venue: 'Arun Jaitley Stadium, Delhi', date: '25 Mar 2026', time: '15:30',
    toss: { winner: 'LSG', decision: 'field' },
    crr: null, rrr: null, commentary: [],
    topBatsmen: [{ name: 'Warner', runs: 87, balls: 55, fours: 10, sixes: 4 }],
    topBowlers: [{ name: 'Axar', overs: '4-0-28-2' }],
  },
];

/* ─────────────────────────
   Simulate live score drift
──────────────────────────*/
const TABS = ['Summary', 'Scorecard', 'Live Blog', 'Commentary', 'Stats', 'Graphs'];

function simulateLiveUpdate(matches) {
  return matches.map(m => {
    // Only update score if the match is genuinely LIVE right now
    if (resolveStatus(m) !== 'LIVE') return m;
    const addRuns = () => Math.floor(Math.random() * 14); // 0-13 runs per poll
    const [r1, w1] = (m.score1 || '0/0').split('/').map(Number);
    const newR1 = r1 + addRuns();
    const [o, b] = m.overs1.split('.').map(Number);
    const newB = b >= 5 ? 0 : b + 1;
    const newO = b >= 5 ? o + 1 : o;
    return {
      ...m,
      score1: `${newR1}/${w1}`,
      overs1: `${newO}.${newB}`,
    };
  });
}

/* ─────────────────────────
   MINI COMPONENTS
──────────────────────────*/
function LiveBadge() {
  return (
    <span className="ipl-live-badge">
      <span className="ipl-live-dot" />
      LIVE
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === 'LIVE')     return <LiveBadge />;
  if (status === 'UPCOMING') return <span className="ipl-status-badge ipl-upcoming">UPCOMING</span>;
  if (status === 'FINISHED') return <span className="ipl-status-badge ipl-completed">FT</span>;
  return null;
}

/* ── COUNTDOWN TIMER ── */
function useCountdown(startISO) {
  const calc = () => {
    if (!startISO) return null;
    const diff = new Date(startISO).getTime() - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { h, m, s, total: diff };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [startISO]);
  return time;
}

function CountdownTimer({ startISO }) {
  const time = useCountdown(startISO);
  if (!time) return null;
  const pad = n => String(n).padStart(2, '0');
  return (
    <div className="ipl-countdown">
      <span className="ipl-countdown-label">Starts in</span>
      <div className="ipl-countdown-blocks">
        {time.h > 0 && (
          <>
            <div className="ipl-cd-block">
              <span className="ipl-cd-num">{pad(time.h)}</span>
              <span className="ipl-cd-unit">HRS</span>
            </div>
            <span className="ipl-cd-sep">:</span>
          </>
        )}
        <div className="ipl-cd-block">
          <span className="ipl-cd-num">{pad(time.m)}</span>
          <span className="ipl-cd-unit">MIN</span>
        </div>
        <span className="ipl-cd-sep">:</span>
        <div className="ipl-cd-block">
          <span className="ipl-cd-num">{pad(time.s)}</span>
          <span className="ipl-cd-unit">SEC</span>
        </div>
      </div>
    </div>
  );
}

/* ── OVERS PROGRESS BAR ── */
function OversProgressBar({ overs1, overs2, color1, color2, maxOvers = 20 }) {
  const parseOvers = (o) => {
    if (!o) return 0;
    const [ov, balls] = o.split('.').map(Number);
    return ov + (balls || 0) / 6;
  };
  const pct1 = Math.min(100, (parseOvers(overs1) / maxOvers) * 100);
  const pct2 = overs2 ? Math.min(100, (parseOvers(overs2) / maxOvers) * 100) : null;
  return (
    <div className="ipl-overs-wrap">
      <div className="ipl-overs-row">
        <span className="ipl-overs-label" style={{ color: color1 }}>Inn 1</span>
        <div className="ipl-overs-track">
          <motion.div
            className="ipl-overs-fill"
            style={{ background: color1 }}
            initial={{ width: 0 }}
            animate={{ width: `${pct1}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          {[5, 10, 15].map(mark => (
            <div key={mark} className="ipl-overs-mark" style={{ left: `${(mark / maxOvers) * 100}%` }} />
          ))}
        </div>
        <span className="ipl-overs-val">{overs1 || '—'} ov</span>
      </div>
      {pct2 !== null && (
        <div className="ipl-overs-row">
          <span className="ipl-overs-label" style={{ color: color2 }}>Inn 2</span>
          <div className="ipl-overs-track">
            <motion.div
              className="ipl-overs-fill"
              style={{ background: color2 }}
              initial={{ width: 0 }}
              animate={{ width: `${pct2}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
            {[5, 10, 15].map(mark => (
              <div key={mark} className="ipl-overs-mark" style={{ left: `${(mark / maxOvers) * 100}%` }} />
            ))}
          </div>
          <span className="ipl-overs-val">{overs2} ov</span>
        </div>
      )}
    </div>
  );
}

/* ── TOSS INFO BAR ── */
function TossInfo({ toss, team1Key, team2Key }) {
  if (!toss) return null;
  const winner = TEAM_META[toss.winner];
  return (
    <div className="ipl-toss-bar">
      <span className="ipl-toss-icon">🪙</span>
      <span className="ipl-toss-text">
        <strong style={{ color: winner?.color || '#22d3ee' }}>{winner?.name}</strong>
        {' '}won the toss and elected to{' '}
        <strong>{toss.decision === 'bat' ? 'bat first' : 'bowl first'}</strong>
      </span>
    </div>
  );
}

function ScoreDisplay({ score, overs, isWinner, teamColor }) {
  const [animState, setAnimState] = useState('idle'); // idle | bump | settle
  const prevScore = useRef(score);

  useEffect(() => {
    if (score !== prevScore.current) {
      setAnimState('bump');
      const t1 = setTimeout(() => setAnimState('settle'), 250);
      const t2 = setTimeout(() => setAnimState('idle'), 800);
      prevScore.current = score;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [score]);

  return (
    <div
      className={`ipl-score-display ipl-score-anim-${animState}`}
      style={{ borderColor: isWinner ? teamColor : 'transparent' }}
    >
      <span className="ipl-score-runs">{score || '—'}</span>
      {overs && <span className="ipl-score-overs">({overs} ov)</span>}
    </div>
  );
}

function MatchCard({ match, onClick, isSelected }) {
  const t1 = TEAM_META[match.team1];
  const t2 = TEAM_META[match.team2];
  const resolvedStatus = resolveStatus(match);
  const isLive     = resolvedStatus === 'LIVE';
  const isFinished = resolvedStatus === 'FINISHED';
  const isUpcoming = resolvedStatus === 'UPCOMING';

  // Scores visible only when match is in-progress or concluded
  const showScores = isLive || isFinished;

  return (
    <motion.div
      className={`ipl-match-card ${isSelected ? 'ipl-card-selected' : ''} ${isLive ? 'ipl-card-live' : ''}`}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(255,60,60,0.08)' }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={() => onClick(match)}
      layout
    >
      <div className="ipl-card-header">
        <div className="ipl-card-venue" title={match.venue}>📍 {match.venue.split(',')[0]}</div>
        <StatusBadge status={resolvedStatus} />
      </div>

      <div className="ipl-card-body">
        {/* Team 1 */}
        <div className={`ipl-card-team ${match.winner === match.team1 ? 'ipl-team-winner' : ''}`}>
          <span className="ipl-team-logo" style={{ filter: `drop-shadow(0 0 6px ${t1.color}88)` }}>{t1.logo}</span>
          <span className="ipl-team-abbr">{t1.abbr}</span>
          {showScores && match.score1 && (
            <ScoreDisplay score={match.score1} overs={match.overs1} isWinner={match.winner === match.team1} teamColor={t1.color} />
          )}
        </div>

        <div className="ipl-card-vs">
          <span>VS</span>
          {isLive     && <span className="ipl-card-crr">CRR {match.crr}</span>}
          {isUpcoming && <span className="ipl-card-time">Starts {match.time}</span>}
        </div>

        {/* Team 2 */}
        <div className={`ipl-card-team ipl-team-right ${match.winner === match.team2 ? 'ipl-team-winner' : ''}`}>
          {showScores && match.score2 && (
            <ScoreDisplay score={match.score2} overs={match.overs2} isWinner={match.winner === match.team2} teamColor={t2.color} />
          )}
          <span className="ipl-team-abbr">{t2.abbr}</span>
          <span className="ipl-team-logo" style={{ filter: `drop-shadow(0 0 6px ${t2.color}88)` }}>{t2.logo}</span>
        </div>
      </div>

      {isFinished && match.winner && (
        <div className="ipl-card-result">{TEAM_META[match.winner]?.name} won</div>
      )}
    </motion.div>
  );
}

/* ─────────────────────────
   TAB CONTENT PANELS
──────────────────────────*/
function SummaryTab({ match }) {
  const t1 = TEAM_META[match.team1];
  const t2 = TEAM_META[match.team2];
  return (
    <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="ipl-tab-panel">
      {match.topBatsmen.length > 0 && (
        <div className="ipl-panel-section">
          <h4 className="ipl-section-label">⚡ Key Performers</h4>
          <div className="ipl-perf-grid">
            {match.topBatsmen.map((b, i) => (
              <div key={i} className="ipl-perf-card">
                <span className="ipl-perf-name">{b.name}</span>
                <span className="ipl-perf-stat">{b.runs}<small>*</small> ({b.balls})</span>
                <div className="ipl-perf-bar" style={{ width: `${Math.min(100, (b.runs / 120) * 100)}%`, background: `linear-gradient(90deg, ${t1.color}, #22d3ee)` }} />
              </div>
            ))}
            {match.topBowlers.map((b, i) => (
              <div key={`bowl-${i}`} className="ipl-perf-card ipl-bowl-card">
                <span className="ipl-perf-name">🎯 {b.name}</span>
                <span className="ipl-perf-stat">{b.overs}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {match.status === 'LIVE' && (
        <div className="ipl-panel-section">
          <h4 className="ipl-section-label">📊 Run Rate</h4>
          <div className="ipl-rr-row">
            <div className="ipl-rr-pill" style={{ background: 'rgba(34,211,238,0.1)', borderColor: 'rgba(34,211,238,0.3)' }}>
              <span className="ipl-rr-label">CRR</span>
              <span className="ipl-rr-val">{match.crr}</span>
            </div>
            {match.rrr && (
              <div className="ipl-rr-pill" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
                <span className="ipl-rr-label">RRR</span>
                <span className="ipl-rr-val">{match.rrr}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {resolveStatus(match) === 'FINISHED' && match.winner && (
        <div className="ipl-result-banner" style={{ borderColor: TEAM_META[match.winner]?.color }}>
          🏆 {TEAM_META[match.winner]?.name} won the match!
        </div>
      )}

      {resolveStatus(match) === 'UPCOMING' && (
        <div className="ipl-upcoming-info">
          <div className="ipl-upcoming-row"><span>📅 Date</span><span>{match.date}</span></div>
          <div className="ipl-upcoming-row"><span>🕐 Starts at</span><span>{match.time} IST</span></div>
          <div className="ipl-upcoming-row"><span>🏟️ Venue</span><span>{match.venue}</span></div>
          <div className="ipl-upcoming-row"><span>🏆 Series</span><span>IPL 2026 — T20</span></div>
        </div>
      )}
    </motion.div>
  );
}

function CommentaryTab({ match }) {
  return (
    <motion.div key="comm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ipl-tab-panel">
      <h4 className="ipl-section-label">📢 Ball-by-Ball Commentary</h4>
      {match.commentary.length === 0
        ? <p className="ipl-empty-msg">Commentary will be available once the match starts.</p>
        : match.commentary.map((line, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }} className="ipl-comm-line">
            <span className="ipl-comm-over">{line.split(':')[0]}:</span>
            <span className="ipl-comm-text">{line.split(':').slice(1).join(':')}</span>
          </motion.div>
        ))
      }
    </motion.div>
  );
}

function StatsTab({ match }) {
  const t1 = TEAM_META[match.team1];
  const t2 = TEAM_META[match.team2];
  const [r1] = (match.score1 || '0/0').split('/').map(Number);
  const [r2] = (match.score2 || '0/0').split('/').map(Number);
  const total = r1 + r2 || 1;

  return (
    <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ipl-tab-panel">
      <h4 className="ipl-section-label">📊 Score Distribution</h4>
      <div className="ipl-stat-bar-wrap">
        <span>{t1.abbr}</span>
        <div className="ipl-stat-bar-track">
          <div className="ipl-stat-bar-t1" style={{ width: `${(r1 / total) * 100}%`, background: t1.color }} />
          <div className="ipl-stat-bar-t2" style={{ width: `${(r2 / total) * 100}%`, background: t2.color }} />
        </div>
        <span>{t2.abbr}</span>
      </div>
      <div className="ipl-stat-nums">
        <span style={{ color: t1.color }}>{match.score1 || '—'}</span>
        <span style={{ color: t2.color }}>{match.score2 || '—'}</span>
      </div>

      <h4 className="ipl-section-label" style={{ marginTop: 24 }}>🏏 Match Facts</h4>
      <div className="ipl-facts-grid">
        {[
          ['Format', 'T20'],
          ['Series', 'IPL 2026'],
          ['Toss', `${t1.name} (Bat)`],
          ['Umpires', 'K Dharmasena / Michael Gough'],
          ['Match Ref.', 'Ravi Sawant'],
          ['TV Umpire', 'S Ravi'],
        ].map(([label, val]) => (
          <div key={label} className="ipl-fact-item">
            <span className="ipl-fact-label">{label}</span>
            <span className="ipl-fact-val">{val}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function GraphsTab({ match }) {
  const t1 = TEAM_META[match.team1];
  const overData = [12, 8, 14, 11, 17, 9, 15, 22, 13, 19, 8, 14, 18, 21, 16, 11, 24, 13];
  const max = Math.max(...overData);

  return (
    <motion.div key="graphs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ipl-tab-panel">
      <h4 className="ipl-section-label">📈 Runs Per Over — {t1.abbr}</h4>
      <div className="ipl-bar-chart">
        {overData.map((runs, i) => (
          <div key={i} className="ipl-bar-col">
            <div className="ipl-bar-fill" style={{ height: `${(runs / max) * 100}%`, background: `linear-gradient(to top, ${t1.color}, #22d3ee)` }} />
            <span className="ipl-bar-label">{i + 1}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ScorecardTab({ match }) {
  const t1 = TEAM_META[match.team1];
  return (
    <motion.div key="scorecard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ipl-tab-panel">
      <h4 className="ipl-section-label">🏏 Batting — {t1.name}</h4>
      <div className="ipl-scorecard-table">
        <div className="ipl-sc-header">
          <span>Batsman</span><span>R</span><span>B</span><span>4s</span><span>6s</span><span>SR</span>
        </div>
        {match.topBatsmen.map((b, i) => (
          <div key={i} className="ipl-sc-row">
            <span>{b.name}</span>
            <span className="ipl-sc-highlight">{b.runs}</span>
            <span>{b.balls}</span>
            <span>{b.fours ?? '—'}</span>
            <span>{b.sixes ?? '—'}</span>
            <span>{b.balls ? ((b.runs / b.balls) * 100).toFixed(1) : '—'}</span>
          </div>
        ))}
        {match.topBatsmen.length === 0 && <p className="ipl-empty-msg">No batting data yet.</p>}
      </div>
      <h4 className="ipl-section-label" style={{ marginTop: 20 }}>🎯 Bowling</h4>
      <div className="ipl-scorecard-table">
        <div className="ipl-sc-header"><span>Bowler</span><span>O-M-R-W</span></div>
        {match.topBowlers.map((b, i) => (
          <div key={i} className="ipl-sc-row">
            <span>{b.name}</span><span className="ipl-sc-highlight">{b.overs}</span>
          </div>
        ))}
        {match.topBowlers.length === 0 && <p className="ipl-empty-msg">No bowling data yet.</p>}
      </div>
    </motion.div>
  );
}

function LiveBlogTab({ match }) {
  return (
    <motion.div key="blog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ipl-tab-panel">
      <h4 className="ipl-section-label">📝 Live Blog</h4>
      {match.commentary.length === 0
        ? <p className="ipl-empty-msg">Live blog will begin at match start.</p>
        : match.commentary.map((line, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="ipl-blog-entry">
            <div className="ipl-blog-over">{line.split(':')[0]}</div>
            <div className="ipl-blog-content">{line.split(':').slice(1).join(':')}</div>
          </motion.div>
        ))
      }
    </motion.div>
  );
}

/* ─────────────────────────
   MATCH DETAIL PANEL
──────────────────────────*/
function MatchDetail({ match }) {
  const [activeTab, setActiveTab] = useState('Summary');
  const t1 = TEAM_META[match.team1];
  const t2 = TEAM_META[match.team2];
  const resolvedStatus = resolveStatus(match);
  const isLive     = resolvedStatus === 'LIVE';
  const isFinished = resolvedStatus === 'FINISHED';
  const isUpcoming = resolvedStatus === 'UPCOMING';
  const showScores = isLive || isFinished;

  useEffect(() => { setActiveTab('Summary'); }, [match.id]);

  const renderTab = () => {
    switch (activeTab) {
      case 'Summary':    return <SummaryTab match={{ ...match, status: resolvedStatus }} />;
      case 'Scorecard':  return <ScorecardTab match={match} />;
      case 'Live Blog':  return <LiveBlogTab match={match} />;
      case 'Commentary': return <CommentaryTab match={match} />;
      case 'Stats':      return <StatsTab match={match} />;
      case 'Graphs':     return <GraphsTab match={match} />;
      default:           return null;
    }
  };

  return (
    <motion.div className="ipl-detail-panel" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      {/* Hero Header */}
      <div className="ipl-hero-header" style={{ background: `linear-gradient(135deg, ${t1.color}33, #0d0d0d 45%, ${t2.color}33)` }}>
        <div className="ipl-hero-badges">
          <span className="ipl-series-tag">🏆 IPL 2026</span>
          <StatusBadge status={resolvedStatus} />
        </div>

        <div className="ipl-hero-teams">
          {/* Team 1 */}
          <div className="ipl-hero-team">
            <span className="ipl-hero-logo" style={{ filter: `drop-shadow(0 0 20px ${t1.color})` }}>{t1.logo}</span>
            <div className="ipl-hero-team-name">{t1.name}</div>
            <div className="ipl-hero-abbr">{t1.abbr}</div>
          </div>

          <div className="ipl-hero-center">
            {showScores && match.score1
              ? (
                <div className="ipl-hero-scoreboard">
                  <div className="ipl-hero-score-row">
                    <ScoreDisplay score={match.score1} overs={match.overs1} isWinner={match.winner === match.team1} teamColor={t1.color} />
                  </div>
                  {match.score2 && (
                    <div className="ipl-hero-score-row">
                      <ScoreDisplay score={match.score2} overs={match.overs2} isWinner={match.winner === match.team2} teamColor={t2.color} />
                    </div>
                  )}
                </div>
              )
              : <div className="ipl-hero-vs-big">VS</div>
            }
            <div className="ipl-hero-venue">📍 {match.venue}</div>
            {isUpcoming && <div className="ipl-hero-time">🕐 Starts at {match.time} IST · {match.date}</div>}
          </div>

          {/* Team 2 */}
          <div className="ipl-hero-team ipl-hero-team-right">
            <span className="ipl-hero-logo" style={{ filter: `drop-shadow(0 0 20px ${t2.color})` }}>{t2.logo}</span>
            <div className="ipl-hero-team-name">{t2.name}</div>
            <div className="ipl-hero-abbr">{t2.abbr}</div>
          </div>
        </div>

        {/* ── COUNTDOWN (upcoming only) ── */}
        {isUpcoming && match.startISO && <CountdownTimer startISO={match.startISO} />}

        {/* ── TOSS INFO (live / finished) ── */}
        {!isUpcoming && <TossInfo toss={match.toss} team1Key={match.team1} team2Key={match.team2} />}

        {/* ── OVERS PROGRESS BAR (live / finished) ── */}
        {(isLive || isFinished) && match.overs1 && (
          <OversProgressBar
            overs1={match.overs1}
            overs2={match.overs2}
            color1={t1.color}
            color2={t2.color}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="ipl-tabs-bar">
        {TABS.map(tab => (
          <button
            key={tab}
            className={`ipl-tab-pill ${activeTab === tab ? 'ipl-tab-active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {activeTab === tab && (
              <motion.span layoutId="ipl-tab-indicator" className="ipl-tab-indicator" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="ipl-tab-content">
        <AnimatePresence mode="wait">{renderTab()}</AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────
   MATCH LIST SIDEBAR
──────────────────────────*/
function MatchList({ matches, selectedId, onSelect }) {
  // Derive effective status from time at render — no stored status field references
  const liveMatches     = matches.filter(m => resolveStatus(m) === 'LIVE');
  const upcomingMatches = matches.filter(m => resolveStatus(m) === 'UPCOMING');
  const completedMatches= matches.filter(m => resolveStatus(m) === 'FINISHED');

  const Group = ({ title, items, accent }) => items.length > 0 ? (
    <div className="ipl-match-group">
      <div className="ipl-group-label" style={{ color: accent }}>
        {title} <span className="ipl-group-count">{items.length}</span>
      </div>
      {items.map(m => (
        <MatchCard key={m.id} match={m} onClick={onSelect} isSelected={m.id === selectedId} />
      ))}
    </div>
  ) : null;

  return (
    <div className="ipl-match-list no-scrollbar">
      {/* Season Header */}
      <div className="ipl-season-header">
        <span className="ipl-season-logo">🏆</span>
        <div>
          <div className="ipl-season-title">Indian Premier League</div>
          <div className="ipl-season-sub">2026 Season · T20</div>
        </div>
      </div>

      <Group title="🔴 LIVE" items={liveMatches} accent="#ef4444" />
      <Group title="🕐 UPCOMING" items={upcomingMatches} accent="#f59e0b" />
      <Group title="✅ COMPLETED" items={completedMatches} accent="#22c55e" />
    </div>
  );
}

/* ─────────────────────────
   ROOT COMPONENT
──────────────────────────*/
export default function LiveCricketModal() {
  const [matches, setMatches] = useState(seedMatches);
  const [selectedMatch, setSelectedMatch] = useState(() => seedMatches()[0]);
  const lastUpdateRef = useRef(Date.now());

  /* Live polling every 5 seconds */
  useEffect(() => {
    const interval = setInterval(() => {
      setMatches(prev => {
        const updated = simulateLiveUpdate(prev);
        // keep selected match in sync
        setSelectedMatch(sel => {
          const fresh = updated.find(m => m.id === sel.id);
          return fresh || sel;
        });
        return updated;
      });
      lastUpdateRef.current = Date.now();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = useCallback((match) => {
    setSelectedMatch(match);
  }, []);

  // Keep selected match in sync when poll fires
  useEffect(() => {
    const synced = matches.find(m => m.id === selectedMatch.id);
    if (synced) setSelectedMatch(synced);
  }, [matches]);

  return (
    <>
      <style>{IPL_CSS}</style>
      <div className="ipl-root no-scrollbar">
        {/* Left: match list */}
        <div className="ipl-list-col no-scrollbar">
          <MatchList matches={matches} selectedId={selectedMatch.id} onSelect={handleSelect} />
        </div>

        {/* Right: Detail panel */}
        <div className="ipl-detail-col no-scrollbar">
          <AnimatePresence mode="wait">
            <MatchDetail key={selectedMatch.id} match={selectedMatch} />
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────
   SCOPED CSS (injected)
──────────────────────────*/
const IPL_CSS = `
/* no-scrollbar utility */
.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }

/* ROOT LAYOUT */
.ipl-root {
  display: flex;
  width: 100%;
  height: 100%;
  background: #080b12;
  overflow: hidden;
  font-family: 'Inter', 'Segoe UI', sans-serif;
}

.ipl-list-col {
  width: 360px;
  flex-shrink: 0;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid rgba(255,255,255,0.06);
  background: rgba(10,12,20,0.95);
}

.ipl-detail-col {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
}

/* ── SEASON HEADER ── */
.ipl-season-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px 12px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(10,12,20,0.98);
  backdrop-filter: blur(10px);
}
.ipl-season-logo { font-size: 28px; line-height: 1; }
.ipl-season-title { font-size: 0.9rem; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
.ipl-season-sub { font-size: 0.72rem; color: #64748b; margin-top: 2px; }

/* ── GROUP ── */
.ipl-match-group { padding: 12px 12px 4px; }
.ipl-group-label {
  font-size: 0.65rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding: 4px 4px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.ipl-group-count {
  background: rgba(255,255,255,0.08);
  padding: 1px 7px;
  border-radius: 20px;
  font-size: 0.6rem;
  color: #94a3b8;
}

/* ── MATCH CARD ── */
.ipl-match-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
  will-change: transform;
}
.ipl-match-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.12);
}
.ipl-card-selected {
  border-color: rgba(34,211,238,0.4) !important;
  background: rgba(34,211,238,0.04) !important;
  box-shadow: 0 0 0 1px rgba(34,211,238,0.2);
}
.ipl-card-live {
  border-color: rgba(239,68,68,0.25) !important;
}
.ipl-card-live:hover {
  border-color: rgba(239,68,68,0.5) !important;
}

.ipl-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.ipl-card-venue {
  font-size: 0.65rem;
  color: #64748b;
  font-weight: 600;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ipl-card-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ipl-card-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  gap: 4px;
}
.ipl-team-right { align-items: center; }
.ipl-team-winner .ipl-team-abbr { color: #22d3ee; }

.ipl-team-logo { font-size: 22px; line-height: 1; }
.ipl-team-abbr { font-size: 0.75rem; font-weight: 900; color: #e2e8f0; letter-spacing: 0.5px; }

.ipl-card-vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.ipl-card-vs span:first-child {
  font-size: 0.6rem;
  font-weight: 900;
  color: #334155;
  letter-spacing: 0.5px;
}
.ipl-card-crr { font-size: 0.55rem; color: #22d3ee; font-weight: 700; }
.ipl-card-time { font-size: 0.6rem; color: #94a3b8; font-weight: 600; }

.ipl-card-result {
  margin-top: 10px;
  font-size: 0.65rem;
  color: #22c55e;
  font-weight: 700;
  text-align: center;
}

/* ── SCORE DISPLAY ── */
.ipl-score-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 2px solid transparent;
  padding-bottom: 2px;
  transition: border-color 0.3s;
}
.ipl-score-runs { font-size: 0.9rem; font-weight: 900; color: #f1f5f9; line-height: 1; }
.ipl-score-overs { font-size: 0.55rem; color: #64748b; font-weight: 600; margin-top: 2px; }

@keyframes scoreFlash {
  0%   { background: rgba(34,211,238,0.25); }
  100% { background: transparent; }
}
.ipl-score-flash { animation: scoreFlash 0.7s ease-out; border-radius: 4px; }

/* ── BADGE STYLES ── */
.ipl-live-badge {
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(239,68,68,0.15);
  border: 1px solid rgba(239,68,68,0.4);
  color: #ef4444;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 20px;
  letter-spacing: 0.8px;
  animation: livePulseGlow 2s infinite ease-in-out;
}
@keyframes livePulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
  50%       { box-shadow: 0 0 8px 2px rgba(239,68,68,0.4); }
}
.ipl-live-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ef4444;
  animation: blinkDot 1.2s infinite;
}
@keyframes blinkDot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.2; }
}

.ipl-status-badge {
  font-size: 0.6rem;
  font-weight: 900;
  padding: 3px 8px;
  border-radius: 20px;
  letter-spacing: 0.8px;
}
.ipl-upcoming { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.35); color: #f59e0b; }
.ipl-completed { background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #22c55e; }

/* ── DETAIL PANEL ── */
.ipl-detail-panel {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #0a0d16;
}

/* HERO HEADER */
.ipl-hero-header {
  padding: 28px 32px 22px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;
}
.ipl-hero-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03), transparent 70%);
  pointer-events: none;
}
.ipl-hero-badges {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}
.ipl-series-tag {
  font-size: 0.65rem;
  font-weight: 800;
  color: #f59e0b;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.25);
  padding: 3px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}

.ipl-hero-teams {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.ipl-hero-team {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
}
.ipl-hero-team-right { align-items: center; }
.ipl-hero-logo { font-size: 50px; line-height: 1; }
.ipl-hero-team-name { font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-align: center; max-width: 120px; }
.ipl-hero-abbr { font-size: 1.1rem; font-weight: 900; color: #fff; letter-spacing: 1px; }

.ipl-hero-center {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 140px;
}
.ipl-hero-vs-big {
  font-size: 1.8rem;
  font-weight: 900;
  color: #1e293b;
  letter-spacing: 3px;
}
.ipl-hero-scoreboard { display: flex; flex-direction: column; gap: 6px; align-items: center; }
.ipl-hero-score-row .ipl-score-runs { font-size: 1.5rem; }
.ipl-hero-score-row .ipl-score-overs { font-size: 0.7rem; }

.ipl-hero-venue {
  font-size: 0.62rem;
  color: #475569;
  font-weight: 600;
  text-align: center;
  max-width: 200px;
}
.ipl-hero-time { font-size: 0.65rem; color: #f59e0b; font-weight: 700; }

/* TABS BAR */
.ipl-tabs-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  background: rgba(8,11,18,0.9);
  position: sticky;
  top: 0;
  z-index: 5;
  backdrop-filter: blur(10px);
  overflow-x: auto;
  flex-wrap: nowrap;
}
.no-scrollbar.ipl-tabs-bar::-webkit-scrollbar { display: none; }

.ipl-tab-pill {
  position: relative;
  padding: 7px 16px;
  border-radius: 50px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.03);
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s, background 0.2s, border-color 0.2s;
  letter-spacing: 0.3px;
  flex-shrink: 0;
  overflow: hidden;
}
.ipl-tab-pill:hover { color: #e2e8f0; background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.12); }
.ipl-tab-active {
  color: #fff !important;
  background: rgba(34,211,238,0.12) !important;
  border-color: rgba(34,211,238,0.4) !important;
}
.ipl-tab-indicator {
  position: absolute;
  inset: 0;
  border-radius: 50px;
  background: rgba(34,211,238,0.07);
  pointer-events: none;
}

/* TAB CONTENT */
.ipl-tab-content { flex: 1; padding: 20px 28px 32px; }

.ipl-tab-panel { display: flex; flex-direction: column; gap: 6px; }

.ipl-section-label {
  font-size: 0.65rem;
  font-weight: 900;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 10px;
}
.ipl-empty-msg { font-size: 0.8rem; color: #334155; font-style: italic; padding: 20px 0; text-align: center; }

/* PERFORMERS */
.ipl-perf-grid { display: flex; flex-direction: column; gap: 10px; }
.ipl-perf-card {
  background: rgba(255,255,255,0.025);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 12px 14px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ipl-perf-name { font-size: 0.8rem; font-weight: 700; color: #e2e8f0; }
.ipl-perf-stat { font-size: 0.8rem; font-weight: 900; color: #22d3ee; }
.ipl-perf-bar {
  position: absolute;
  bottom: 0; left: 0; height: 2px;
  border-radius: 0 0 0 0;
  transition: width 1s ease;
}
.ipl-bowl-card { border-color: rgba(168,85,247,0.15); }
.ipl-bowl-card .ipl-perf-stat { color: #a855f7; }

/* RUN RATE */
.ipl-rr-row { display: flex; gap: 12px; flex-wrap: wrap; }
.ipl-rr-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid;
  min-width: 90px;
}
.ipl-rr-label { font-size: 0.6rem; font-weight: 900; color: #64748b; letter-spacing: 0.8px; text-transform: uppercase; }
.ipl-rr-val { font-size: 1.4rem; font-weight: 900; color: #fff; margin-top: 4px; }

/* RESULT / UPCOMING */
.ipl-result-banner {
  background: rgba(34,197,94,0.08);
  border: 1px solid;
  border-radius: 12px;
  padding: 16px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #22c55e;
  text-align: center;
  margin-top: 8px;
}
.ipl-upcoming-info { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; }
.ipl-upcoming-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 0.78rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.ipl-upcoming-row:last-child { border-bottom: none; }
.ipl-upcoming-row span:first-child { color: #64748b; font-weight: 600; }
.ipl-upcoming-row span:last-child { color: #e2e8f0; font-weight: 700; }

/* STATS */
.ipl-stat-bar-wrap { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; font-size: 0.7rem; font-weight: 700; color: #94a3b8; }
.ipl-stat-bar-track { flex: 1; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; display: flex; }
.ipl-stat-bar-t1 { height: 100%; border-radius: 4px 0 0 4px; transition: width 1s ease; }
.ipl-stat-bar-t2 { height: 100%; border-radius: 0 4px 4px 0; transition: width 1s ease; }
.ipl-stat-nums { display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 900; margin-bottom: 6px; }
.ipl-facts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ipl-fact-item { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 10px 12px; }
.ipl-fact-label { font-size: 0.6rem; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
.ipl-fact-val { font-size: 0.75rem; color: #e2e8f0; font-weight: 700; display: block; margin-top: 4px; }

/* GRAPHS */
.ipl-bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 140px;
  padding: 0 0 20px;
  position: relative;
}
.ipl-bar-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; height: 100%; }
.ipl-bar-fill { width: 100%; min-height: 4px; border-radius: 3px 3px 0 0; transition: height 0.8s ease; margin-bottom: 4px; }
.ipl-bar-label { font-size: 0.5rem; color: #334155; font-weight: 700; }

/* SCORECARD */
.ipl-scorecard-table { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; overflow: hidden; margin-bottom: 6px; }
.ipl-sc-header, .ipl-sc-row {
  display: grid;
  grid-template-columns: 2fr repeat(5, 1fr);
  padding: 10px 14px;
  font-size: 0.7rem;
  font-weight: 700;
  gap: 4px;
}
.ipl-sc-header { color: #475569; font-size: 0.6rem; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
.ipl-sc-row { color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.04); }
.ipl-sc-row:last-child { border-bottom: none; }
.ipl-sc-highlight { color: #22d3ee; font-weight: 900; }

/* COMMENTARY */
.ipl-comm-line {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 8px;
  margin-bottom: 6px;
  animation: fadeInLine 0.4s ease both;
}
@keyframes fadeInLine { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
.ipl-comm-over { font-size: 0.7rem; font-weight: 800; color: #22d3ee; white-space: nowrap; flex-shrink: 0; }
.ipl-comm-text { font-size: 0.78rem; color: #94a3b8; line-height: 1.5; }

/* LIVE BLOG */
.ipl-blog-entry {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.02);
  border-left: 2px solid rgba(34,211,238,0.3);
  border-radius: 0 8px 8px 0;
  margin-bottom: 8px;
}
.ipl-blog-over { font-size: 0.65rem; font-weight: 900; color: #22d3ee; flex-shrink: 0; width: 36px; }
.ipl-blog-content { font-size: 0.78rem; color: #94a3b8; line-height: 1.5; }

/* MATCH LIST (scroll area) */
.ipl-match-list { padding-bottom: 24px; }
`;
