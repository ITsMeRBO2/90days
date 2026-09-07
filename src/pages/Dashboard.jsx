import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Target, Footprints, ChevronRight, Scale, Activity } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  generateDates, getCurrentDayIndex, formatDisplayDate,
  isDayCompleted, getTotalCaloriesIn, getTotalCaloriesOut, getNetCalories,
  getCompletedCount, CHALLENGE_DAYS, INITIAL_WEIGHT, getWeekNumber
} from '../utils/data';
import WeightChart from '../components/WeightChart';
import WeeklyWeight from '../components/WeeklyWeight';

const DATES = generateDates();

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: 'easeOut' },
});

function StatCard({ icon: Icon, label, value, unit, color, delay }) {
  return (
    <motion.div className="glass-card stat-card" {...fadeUp(delay)}>
      <div className="section-icon-wrapper" style={{ background: `${color}18`, color }}>
        <Icon size={18} />
      </div>
      <div className="stat-value" style={{ backgroundImage: `linear-gradient(135deg, ${color}, ${color}99)` }}>
        {value}
        {unit && <span style={{ fontSize: '1rem', fontWeight: 600 }}>{unit}</span>}
      </div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { days, weights } = useApp();
  const currentIdx = getCurrentDayIndex();
  const todayStr   = DATES[currentIdx];

  // Stats
  const completed = getCompletedCount();
  const streak = (() => {
    let s = 0;
    for (let i = currentIdx; i >= 0; i--) {
      if (isDayCompleted(days[DATES[i]])) s++; else break;
    }
    return s;
  })();

  const todayData = days[todayStr];
  const calIn     = todayData ? getTotalCaloriesIn(todayData) : 0;
  const calOut    = todayData ? getTotalCaloriesOut(todayData) : 0;
  const netCal    = calIn - calOut;

  const steps = todayData?.workout?.steps || 0;
  const progressPct = Math.round((completed / CHALLENGE_DAYS) * 100);

  // Last weight
  const currentWeek = getWeekNumber(currentIdx);
  let lastWeight = INITIAL_WEIGHT;
  for (let w = currentWeek; w >= 0; w--) {
    if (weights[w]) { lastWeight = weights[w]; break; }
  }

  // Recent days
  const recentDays = [];
  for (let i = Math.max(0, currentIdx - 4); i <= Math.min(currentIdx, DATES.length - 1); i++) {
    recentDays.push({ dateStr: DATES[i], idx: i });
  }

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>

        {/* HERO BANNER */}
        <motion.div {...fadeUp(0)} style={{ marginBottom: 28 }}>
          <div className="hero-banner">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', padding: '3px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Challenge 90 Jours
                </span>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '3px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700 }}>
                  <span className="flame-icon">🔥</span> Jour {currentIdx + 1} / 90
                </span>
              </div>
              <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', color: 'white', marginBottom: 4 }}>
                Tableau de bord 🏋️
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: '0.92rem' }}>
                {formatDisplayDate(todayStr)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div className="glass-card" {...fadeUp(0.05)} style={{ padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text-primary)' }}>
              📈 Progression du challenge
            </span>
            <span style={{ background: 'var(--accent-violet-light)', color: 'var(--accent-violet)', fontWeight: 800, fontSize: '1rem', padding: '3px 12px', borderRadius: 99 }}>
              {progressPct}%
            </span>
          </div>
          <div className="progress-bar">
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: 'easeOut' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            <span>🚀 07 Sept 2026</span>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{completed} / {CHALLENGE_DAYS} jours complétés</span>
            <span>🏁 05 Déc 2026</span>
          </div>
        </motion.div>

        {/* Stat cards */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <StatCard icon={Flame}    label="Streak actuel"   value={streak}        unit=" j"   color="#ff8c00" delay={0.1} />
          <StatCard icon={Target}   label="Jours complétés" value={completed}      unit=""     color="#6c47ff" delay={0.15} />
          <StatCard icon={Activity} label="Calories nettes" value={netCal || '–'}  unit=" kcal" color={netCal <= 0 ? '#00c48c' : '#ff4d6d'} delay={0.2} />
          <StatCard icon={Scale}    label="Poids actuel"    value={lastWeight}     unit=" kg"  color="#00b4d8" delay={0.25} />
        </div>

        {/* Today CTA + Steps */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <motion.div {...fadeUp(0.3)}>
            <Link to={`/day/${todayStr}`} style={{ textDecoration: 'none' }}>
              <motion.div
                className="glass-card"
                whileHover={{ scale: 1.02, boxShadow: '0 16px 48px rgba(108,71,255,0.2)' }}
                style={{
                  padding: 24,
                  background: 'linear-gradient(135deg, #ede9ff 0%, #e0f7fc 100%)',
                  border: '1.5px solid rgba(108,71,255,0.2)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: 'var(--accent-violet)', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                      📓 Entrée du jour
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', marginBottom: 4, color: 'var(--text-primary)' }}>
                      Remplir Jour {currentIdx + 1}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {todayData?.saved ? '✅ Déjà rempli – modifier' : '⏳ Pas encore rempli aujourd\'hui'}
                    </div>
                  </div>
                  <ChevronRight size={28} color="var(--accent-violet)" />
                </div>
              </motion.div>
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.35)} className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div className="section-icon-wrapper section-icon-cyan"><Footprints size={18} /></div>
              <span style={{ fontWeight: 700, fontSize: '1rem' }}>Pas d'aujourd'hui</span>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {steps ? Number(steps).toLocaleString('fr-FR') : '—'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
              {steps ? `${Math.round(steps * 0.00075)} km environ` : 'À remplir dans le journal du jour'}
            </div>
          </motion.div>
        </div>

        {/* Calories today */}
        {todayData?.saved && (
          <motion.div {...fadeUp(0.38)} className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              🍽️ Bilan calorique d'aujourd'hui
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}>
              {[
                { label: 'Ingérées', value: calIn, color: 'var(--accent-amber)', emoji: '🍴' },
                { label: 'Brûlées', value: calOut, color: 'var(--accent-red)', emoji: '🔥' },
                { label: 'Bilan net', value: netCal, color: netCal <= 0 ? 'var(--accent-green)' : 'var(--accent-red)', emoji: '⚖️' },
              ].map(({ label, value, color, emoji }) => (
                <div key={label} style={{ padding: 16, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{emoji}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800, color }}>{value} kcal</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Weight tracker */}
        <motion.div {...fadeUp(0.4)} style={{ marginBottom: 24 }}>
          <WeeklyWeight />
        </motion.div>

        {/* Weight chart */}
        <motion.div {...fadeUp(0.45)} style={{ marginBottom: 24 }}>
          <WeightChart />
        </motion.div>

        {/* Recent days */}
        <motion.div {...fadeUp(0.5)}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 14 }}>
            📅 Jours récents
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {recentDays.map(({ dateStr, idx }) => {
              const d = days[dateStr];
              const done = isDayCompleted(d);
              const isToday = idx === currentIdx;
              return (
                <Link key={dateStr} to={`/day/${dateStr}`} style={{ textDecoration: 'none', flex: '1 0 140px' }}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className="glass-card"
                    style={{
                      padding: 16,
                      borderColor: isToday ? 'rgba(139,92,246,0.5)' : done ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                      background: isToday ? 'rgba(139,92,246,0.08)' : done ? 'rgba(16,185,129,0.05)' : undefined,
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: isToday ? 'var(--accent-violet)' : 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      Jour {idx + 1} {isToday ? '(Auj.)' : ''}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
                      {new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                      background: done ? 'rgba(16,185,129,0.15)' : d?.saved ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                      color: done ? 'var(--accent-green)' : d?.saved ? 'var(--accent-amber)' : 'var(--text-muted)',
                    }}>
                      {done ? '✅ Complet' : d?.saved ? '⚡ Partiel' : '○ Vide'}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
