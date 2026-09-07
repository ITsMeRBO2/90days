import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Save, Check,
  Coffee, Utensils, Moon, Dumbbell,
  Heart, Footprints, Flame, Activity,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  generateDates, getDayIndex, formatDisplayDate,
  getTotalCaloriesIn, getTotalCaloriesOut, createDefaultDay, CHALLENGE_DAYS
} from '../utils/data';

const DATES = generateDates();

const WORKOUT_TYPES = [
  { id: 'push',   label: 'Push',   emoji: '🔺', desc: 'Chest · Shoulders · Triceps' },
  { id: 'pull',   label: 'Pull',   emoji: '🔻', desc: 'Back · Biceps · Rear Delts' },
  { id: 'legs',   label: 'Legs',   emoji: '🦵', desc: 'Quads · Hams · Calves · Glutes' },
  { id: 'cardio', label: 'Cardio', emoji: '❤️', desc: 'Cardio · HIIT · Vélo · Course' },
  { id: 'rest',   label: 'Repos',  emoji: '😴', desc: 'Récupération active' },
];

function MealSection({ icon: Icon, iconClass, label, value, onChange }) {
  return (
    <div className="meal-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div className={`section-icon-wrapper ${iconClass}`} style={{ width: 32, height: 32 }}>
          <Icon size={15} />
        </div>
        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</span>
        {value.calories && (
          <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>
            {value.calories} kcal
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <input
          id={`${label.toLowerCase()}-desc`}
          className="input"
          placeholder={`Décrire votre ${label.toLowerCase()}…`}
          value={value.desc}
          onChange={e => onChange({ ...value, desc: e.target.value })}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id={`${label.toLowerCase()}-cal`}
            type="number"
            min="0"
            className="input"
            placeholder="Calories (kcal)"
            value={value.calories}
            onChange={e => onChange({ ...value, calories: e.target.value })}
            style={{ flex: 1 }}
          />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>kcal</span>
        </div>
      </div>
    </div>
  );
}

export default function DayView() {
  const { dateStr } = useParams();
  const navigate    = useNavigate();
  const { getDay, updateDay } = useApp();

  const dayIndex = getDayIndex(dateStr);
  const [form, setForm]       = useState(() => {
    const stored = getDay(dateStr);
    return stored || createDefaultDay();
  });
  const [saved,    setSaved]   = useState(false);
  const [ripple,   setRipple]  = useState(false);

  // Re-init when date changes
  useEffect(() => {
    const d = getDay(dateStr);
    setForm(d || createDefaultDay());
    setSaved(false);
  }, [dateStr]);

  // Computed
  const calIn  = getTotalCaloriesIn(form);
  const calOut = getTotalCaloriesOut(form);
  const netCal = calIn - calOut;

  const updateDiet  = (meal, val) => setForm(f => ({ ...f, diet: { ...f.diet, [meal]: val } }));
  const updateWkt   = (field, val) => setForm(f => ({ ...f, workout: { ...f.workout, [field]: val } }));

  const handleSave = () => {
    updateDay(dateStr, form);
    setSaved(true);
    setRipple(true);
    setTimeout(() => { setSaved(false); setRipple(false); }, 2500);
  };

  const prevDate = DATES[dayIndex - 1];
  const nextDate = DATES[dayIndex + 1];

  const today = new Date();
  const thisDay = new Date(dateStr + 'T00:00:00');
  const isFuture = thisDay > today;

  return (
    <div className="page-wrapper">
      <div className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>

        {/* Top Navigation */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}
        >
          <Link to="/calendar" className="btn btn-ghost" style={{ padding: '8px 14px' }}>
            <ArrowLeft size={16} /> Calendrier
          </Link>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            {prevDate && (
              <button onClick={() => navigate(`/day/${prevDate}`)} className="week-nav-btn">
                ← Jour {dayIndex}
              </button>
            )}
            {nextDate && (
              <button onClick={() => navigate(`/day/${nextDate}`)} className="week-nav-btn">
                Jour {dayIndex + 2} →
              </button>
            )}
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span className="badge badge-violet">Jour {dayIndex + 1} / {CHALLENGE_DAYS}</span>
            {isFuture && <span className="badge badge-amber">⏳ À venir</span>}
            {form.saved && !isFuture && <span className="badge badge-green">✅ Sauvegardé</span>}
            {form.workout.type && (
              <span className={`badge badge-${form.workout.type === 'push' ? 'violet' : form.workout.type === 'pull' ? 'cyan' : form.workout.type === 'legs' ? 'amber' : form.workout.type === 'cardio' ? 'red' : 'green'}`}>
                {WORKOUT_TYPES.find(w => w.id === form.workout.type)?.emoji} {form.workout.type.toUpperCase()}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 'clamp(1.3rem,3.5vw,2rem)', textTransform: 'capitalize' }}>
            📅 {formatDisplayDate(dateStr)}
          </h1>
        </motion.div>

        {/* Calorie Summary Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
          style={{ padding: '16px 24px', marginBottom: 28, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'center' }}
        >
          {[
            { label: 'Ingérées', val: calIn, color: 'var(--accent-amber)', emoji: '🍴' },
            { label: 'Brûlées',  val: calOut, color: 'var(--accent-red)',   emoji: '🔥' },
            { label: 'Bilan',    val: netCal, color: netCal <= 0 ? 'var(--accent-green)' : 'var(--accent-red)', emoji: '⚖️' },
          ].map(({ label, val, color, emoji }) => (
            <div key={label}>
              <div style={{ fontSize: '1.1rem' }}>{emoji}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem,3vw,1.6rem)', fontWeight: 800, color }}>
                {val || 0}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {label} kcal
              </div>
            </div>
          ))}
        </motion.div>

        <div style={{ display: 'grid', gap: 24 }}>

          {/* ─── DIET SECTION ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card"
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div className="section-icon-wrapper section-icon-amber">
                <Utensils size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>🥗 Régime alimentaire</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total : {calIn} kcal ingérées</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <MealSection
                icon={Coffee} iconClass="section-icon-amber"
                label="Petit déjeuner"
                value={form.diet.breakfast}
                onChange={v => updateDiet('breakfast', v)}
              />
              <MealSection
                icon={Utensils} iconClass="section-icon-violet"
                label="Déjeuner"
                value={form.diet.lunch}
                onChange={v => updateDiet('lunch', v)}
              />
              <MealSection
                icon={Moon} iconClass="section-icon-cyan"
                label="Dîner"
                value={form.diet.dinner}
                onChange={v => updateDiet('dinner', v)}
              />
            </div>
          </motion.div>

          {/* ─── WORKOUT SECTION ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card"
            style={{ padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div className="section-icon-wrapper section-icon-violet">
                <Dumbbell size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)' }}>💪 Musculation & Cardio</h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sélectionne ton type d'entraînement</div>
              </div>
            </div>

            {/* Workout type selector */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {WORKOUT_TYPES.map(({ id, label, emoji }) => (
                <button
                  key={id}
                  id={`workout-${id}`}
                  className={`workout-btn ${id} ${form.workout.type === id ? 'active' : ''}`}
                  onClick={() => updateWkt('type', id)}
                >
                  <span style={{ fontSize: '1.4rem' }}>{emoji}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Type description */}
            <AnimatePresence mode="wait">
              {form.workout.type && (
                <motion.div
                  key={form.workout.type}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ overflow: 'hidden', marginBottom: 16 }}
                >
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {WORKOUT_TYPES.find(w => w.id === form.workout.type)?.emoji}{' '}
                    <strong style={{ color: 'var(--text-primary)' }}>{WORKOUT_TYPES.find(w => w.id === form.workout.type)?.label}</strong>
                    {' — '}{WORKOUT_TYPES.find(w => w.id === form.workout.type)?.desc}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="divider" />

            {/* Cardio description */}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label className="label" htmlFor="cardio-desc">
                  <Activity size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Description Cardio / Exercice
                </label>
                <input
                  id="cardio-desc"
                  className="input"
                  placeholder="Ex: 30 min vélo, 5 km course, HIIT 20 min…"
                  value={form.workout.cardioDesc}
                  onChange={e => updateWkt('cardioDesc', e.target.value)}
                />
              </div>

              <div className="grid-2">
                <div>
                  <label className="label" htmlFor="calories-burnt">
                    <Flame size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Calories brûlées estimées
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      id="calories-burnt"
                      type="number"
                      min="0"
                      className="input"
                      placeholder="0"
                      value={form.workout.estimatedCaloriesBurnt}
                      onChange={e => updateWkt('estimatedCaloriesBurnt', e.target.value)}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>kcal</span>
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="steps">
                    <Footprints size={12} style={{ display: 'inline', marginRight: 4 }} />
                    Nombre de pas
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      id="steps"
                      type="number"
                      min="0"
                      className="input"
                      placeholder="0"
                      value={form.workout.steps}
                      onChange={e => updateWkt('steps', e.target.value)}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>pas</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── SAVE BUTTON ─── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{ display: 'flex', justifyContent: 'center' }}
          >
            <motion.button
              id="save-day-btn"
              className={`btn btn-primary ${ripple ? 'save-success' : ''}`}
              onClick={handleSave}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              style={{ padding: '14px 36px', fontSize: '1rem', borderRadius: 'var(--radius-md)', minWidth: 200 }}
            >
              <AnimatePresence mode="wait">
                {saved ? (
                  <motion.span
                    key="done"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Check size={18} /> Sauvegardé !
                  </motion.span>
                ) : (
                  <motion.span
                    key="save"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Save size={18} /> Sauvegarder le jour
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>

          {/* Day nav bottom */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
          >
            {prevDate ? (
              <Link to={`/day/${prevDate}`} style={{ textDecoration: 'none', flex: 1 }}>
                <motion.div whileHover={{ x: -4 }} className="glass-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <ArrowLeft size={16} color="var(--text-muted)" />
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Précédent</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Jour {dayIndex}</div>
                  </div>
                </motion.div>
              </Link>
            ) : <div />}
            {nextDate ? (
              <Link to={`/day/${nextDate}`} style={{ textDecoration: 'none', flex: 1 }}>
                <motion.div whileHover={{ x: 4 }} className="glass-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, cursor: 'pointer' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suivant</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Jour {dayIndex + 2}</div>
                  </div>
                  <ArrowRight size={16} color="var(--text-muted)" />
                </motion.div>
              </Link>
            ) : <div />}
          </motion.div>
        </div>

      </div>
    </div>
  );
}
