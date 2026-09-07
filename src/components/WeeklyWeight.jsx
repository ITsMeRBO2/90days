import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CHALLENGE_DAYS, getCurrentDayIndex, getWeekNumber, INITIAL_WEIGHT } from '../utils/data';

const TOTAL_WEEKS = Math.ceil(CHALLENGE_DAYS / 7);

export default function WeeklyWeight() {
  const { getWeight, updateWeight } = useApp();
  const currentDayIdx  = getCurrentDayIndex();
  const currentWeekIdx = getWeekNumber(currentDayIdx);

  const [viewWeek, setViewWeek] = useState(currentWeekIdx);
  const [inputVal, setInputVal]  = useState(() => String(getWeight(viewWeek) || ''));
  const [saved, setSaved]        = useState(false);

  const handleWeekChange = (delta) => {
    const nw = viewWeek + delta;
    if (nw < 0 || nw >= TOTAL_WEEKS) return;
    setViewWeek(nw);
    setInputVal(String(getWeight(nw) || ''));
    setSaved(false);
  };

  const handleSave = () => {
    if (!inputVal) return;
    updateWeight(viewWeek, Number(inputVal));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const prevWeight = getWeight(viewWeek - 1);
  const weightDiff = inputVal && prevWeight ? (Number(inputVal) - Number(prevWeight)).toFixed(1) : null;

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div className="section-icon-wrapper section-icon-cyan">
          <Scale size={18} />
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700 }}>
            ⚖️ Poids Hebdomadaire
          </h3>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            À remplir une fois par semaine
          </div>
        </div>
      </div>

      {/* Week selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          className="week-nav-btn"
          onClick={() => handleWeekChange(-1)}
          disabled={viewWeek === 0}
          style={{ opacity: viewWeek === 0 ? 0.3 : 1 }}
        >
          <ChevronLeft size={16} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Semaine {viewWeek + 1}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Jours {viewWeek * 7 + 1} – {Math.min((viewWeek + 1) * 7, CHALLENGE_DAYS)}
            {viewWeek === currentWeekIdx && (
              <span style={{ marginLeft: 6, color: 'var(--accent-violet)', fontWeight: 700 }}>• Actuel</span>
            )}
          </div>
        </div>

        <button
          className="week-nav-btn"
          onClick={() => handleWeekChange(1)}
          disabled={viewWeek >= TOTAL_WEEKS - 1}
          style={{ opacity: viewWeek >= TOTAL_WEEKS - 1 ? 0.3 : 1 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weight input */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          id={`weight-week-${viewWeek}`}
          type="number"
          step="0.1"
          min="30"
          max="300"
          className="input"
          placeholder={viewWeek === 0 ? `${INITIAL_WEIGHT}` : 'Ex: 81.5'}
          value={inputVal}
          onChange={e => { setInputVal(e.target.value); setSaved(false); }}
          style={{ flex: 1, fontSize: '1.1rem', fontWeight: 700 }}
        />
        <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>kg</span>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className="btn btn-primary"
          style={{ padding: '10px 18px', minWidth: 90 }}
        >
          <AnimatePresence mode="wait">
            {saved ? (
              <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Check size={15} /> OK
              </motion.span>
            ) : (
              <motion.span key="save" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                Enregistrer
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* Weight diff */}
      <AnimatePresence>
        {weightDiff !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ marginTop: 10, fontSize: '0.82rem', color: Number(weightDiff) <= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {Number(weightDiff) <= 0 ? '📉' : '📈'} {Number(weightDiff) > 0 ? '+' : ''}{weightDiff} kg vs semaine précédente
          </motion.div>
        )}
      </AnimatePresence>

      {/* All weeks overview */}
      <div style={{ marginTop: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
          const w = getWeight(i);
          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.1 }}
              onClick={() => {
                setViewWeek(i);
                setInputVal(String(getWeight(i) || ''));
                setSaved(false);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: `1px solid ${i === viewWeek ? 'var(--accent-violet)' : 'var(--border)'}`,
                background: i === viewWeek ? 'rgba(139,92,246,0.15)' : w ? 'rgba(16,185,129,0.08)' : 'transparent',
                color: i === viewWeek ? 'var(--accent-violet)' : w ? 'var(--accent-green)' : 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              S{i + 1}{w ? ` · ${w}kg` : ''}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
