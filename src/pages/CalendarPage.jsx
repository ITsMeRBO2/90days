import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  generateDates, getDayIndex, getTodayStr,
  isDayCompleted, isDayPartial, formatShortDate, CHALLENGE_DAYS
} from '../utils/data';

const DATES = generateDates();
const TODAY = getTodayStr();

// Group into weeks
function groupByWeek(dates) {
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, Math.min(i + 7, dates.length)));
  }
  return weeks;
}

const WEEKS = groupByWeek(DATES);

export default function CalendarPage() {
  const { days } = useApp();
  const [currentWeek, setCurrentWeek] = useState(() => {
    const todayIdx = getDayIndex(TODAY);
    if (todayIdx < 0) return 0;
    return Math.min(Math.floor(todayIdx / 7), WEEKS.length - 1);
  });

  const week = WEEKS[currentWeek];
  const totalWeeks = WEEKS.length;

  // Stats for current view
  const completedInView = week.filter(d => isDayCompleted(days[d])).length;

  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  function getDayStatus(dateStr) {
    if (dateStr > TODAY) return 'future';
    if (isDayCompleted(days[dateStr])) return 'completed';
    if (isDayPartial(days[dateStr])) return 'partial';
    if (dateStr === TODAY) return 'today';
    return 'missed';
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 60 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span className="badge badge-violet">📅 Calendrier</span>
            <span className="badge badge-cyan">{CHALLENGE_DAYS} jours</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.5rem,4vw,2.2rem)' }}>Vue Calendrier 📆</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: 4 }}>
            07 Sep 2026 → 05 Déc 2026
          </p>
        </motion.div>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}
        >
          {[
            { color: 'var(--accent-green)', label: 'Complet' },
            { color: 'var(--accent-amber)', label: 'Partiel' },
            { color: 'var(--accent-violet)', label: "Aujourd'hui" },
            { color: 'var(--text-muted)',    label: 'À venir' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Week Navigator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="glass-card"
          style={{ padding: 20, marginBottom: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <button
              className="week-nav-btn"
              onClick={() => setCurrentWeek(w => Math.max(0, w - 1))}
              disabled={currentWeek === 0}
              style={{ opacity: currentWeek === 0 ? 0.3 : 1 }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                Semaine {currentWeek + 1} / {totalWeeks}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Jours {currentWeek * 7 + 1} – {Math.min((currentWeek + 1) * 7, CHALLENGE_DAYS)} · {completedInView}/{week.length} complétés
              </div>
            </div>

            <button
              className="week-nav-btn"
              onClick={() => setCurrentWeek(w => Math.min(totalWeeks - 1, w + 1))}
              disabled={currentWeek === totalWeeks - 1}
              style={{ opacity: currentWeek === totalWeeks - 1 ? 0.3 : 1 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${week.length}, 1fr)`, gap: 6, marginBottom: 6 }}>
            {week.map((_, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {dayNames[i % 7]}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${week.length}, 1fr)`, gap: 6 }}>
            {week.map((dateStr, i) => {
              const status = getDayStatus(dateStr);
              const idx = getDayIndex(dateStr);
              const d = new Date(dateStr + 'T00:00:00');
              const dayNum = d.getDate();

              return (
                <Link key={dateStr} to={`/day/${dateStr}`} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={{ scale: 1.06, zIndex: 2 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${status === 'completed' ? 'rgba(16,185,129,0.4)' : status === 'today' ? 'rgba(139,92,246,0.6)' : status === 'partial' ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                      background: status === 'completed' ? 'rgba(16,185,129,0.12)' : status === 'today' ? 'rgba(139,92,246,0.18)' : status === 'partial' ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.02)',
                      opacity: status === 'future' ? 0.35 : 1,
                      cursor: 'pointer',
                      boxShadow: status === 'today' ? '0 0 16px rgba(139,92,246,0.25)' : undefined,
                    }}
                  >
                    <span style={{
                      fontWeight: 700,
                      fontSize: 'clamp(0.7rem,2vw,0.85rem)',
                      color: status === 'completed' ? 'var(--accent-green)' : status === 'today' ? 'var(--accent-violet)' : status === 'partial' ? 'var(--accent-amber)' : 'var(--text-muted)',
                    }}>
                      {dayNum}
                    </span>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      J{idx + 1}
                    </span>
                    {status === 'completed' && (
                      <span style={{ fontSize: '0.6rem', marginTop: 1 }}>✅</span>
                    )}
                    {status === 'today' && (
                      <div style={{
                        position: 'absolute', bottom: 4, width: 5, height: 5,
                        borderRadius: '50%', background: 'var(--accent-violet)',
                      }} />
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* All weeks mini view */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card"
          style={{ padding: 20 }}
        >
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>
            Vue d'ensemble — 90 jours
          </div>
          <div className="calendar-grid">
            {DATES.map((dateStr) => {
              const status = getDayStatus(dateStr);
              const idx = getDayIndex(dateStr);
              return (
                <Link key={dateStr} to={`/day/${dateStr}`} style={{ textDecoration: 'none' }}>
                  <motion.div
                    whileHover={{ scale: 1.12 }}
                    className={`day-cell ${status}`}
                    title={`Jour ${idx + 1} – ${dateStr}`}
                  >
                    <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{idx + 1}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>

          {/* Summary row */}
          <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Complétés', count: DATES.filter(d => isDayCompleted(days[d])).length, color: 'var(--accent-green)' },
              { label: 'Partiels',  count: DATES.filter(d => isDayPartial(days[d])).length,   color: 'var(--accent-amber)' },
              { label: 'Restants',  count: DATES.filter(d => d > TODAY).length, color: 'var(--text-muted)' },
            ].map(({ label, count, color }) => (
              <div key={label} style={{ fontSize: '0.82rem' }}>
                <span style={{ fontWeight: 700, color }}>{count}</span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 5 }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
