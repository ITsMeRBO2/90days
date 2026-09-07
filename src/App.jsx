import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  UtensilsCrossed, Dumbbell, Flame, Footprints, Activity,
  ChevronDown, Check, Scale, Sunrise, Sun, Moon, Cloud, RefreshCw, Lock
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

/* ---------------------------------------------------------------------- */
/* Polyfill window.storage & Cloud Storage API (PIN 0000 Cloud Sync)      */
/* ---------------------------------------------------------------------- */
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      const val = localStorage.getItem(key);
      return val !== null ? { value: val } : null;
    },
    set: async (key, val) => {
      localStorage.setItem(key, val);
    },
  };
}

const CLOUD_BUCKET = 'v90days_rahil_prod_2026';

async function fetchCloudData(pin, key) {
  const pinKey = `${pin}_${key}`;
  // 1. Try kvdb.io
  try {
    const res = await fetch(`https://kvdb.io/4y9e7ZqR4tX8uW9v3m1k2L/${pinKey}`, { cache: 'no-cache' });
    if (res.ok) {
      const text = await res.text();
      if (text && text.trim() !== '') return JSON.parse(text);
    }
  } catch (e) { /* silencieux */ }

  // 2. Fallback keyval API
  try {
    const res = await fetch(`https://api.keyval.org/get/${CLOUD_BUCKET}_${pinKey}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.value) return JSON.parse(data.value);
    }
  } catch (e) { /* silencieux */ }

  return null;
}

async function saveCloudData(pin, key, value) {
  const pinKey = `${pin}_${key}`;
  const strVal = JSON.stringify(value);

  try {
    await fetch(`https://kvdb.io/4y9e7ZqR4tX8uW9v3m1k2L/${pinKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: strVal,
    });
  } catch (e) { /* silencieux */ }

  try {
    await fetch(`https://api.keyval.org/set/${CLOUD_BUCKET}_${pinKey}/${encodeURIComponent(strVal)}`);
  } catch (e) { /* silencieux */ }
}

/* ---------------------------------------------------------------------- */
/* Constantes & utilitaires de dates                                      */
/* ---------------------------------------------------------------------- */

const TOTAL_DAYS = 90;
const START_DATE = new Date(2026, 8, 7); // 07/09/2026

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtDate(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateShort(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtWeekday(date) {
  return capitalize(date.toLocaleDateString('fr-FR', { weekday: 'long' }));
}

const ALL_DAYS = Array.from({ length: TOTAL_DAYS }, (_, i) => {
  const d = addDays(START_DATE, i);
  return { index: i + 1, date: d };
});

const END_DATE = ALL_DAYS[TOTAL_DAYS - 1].date;

// Regroupement en semaines de 7 jours (la dernière semaine peut être plus courte)
const WEEKS = (() => {
  const w = [];
  for (let i = 0; i < ALL_DAYS.length; i += 7) {
    w.push(ALL_DAYS.slice(i, i + 7));
  }
  return w;
})();

function todayDayIndex() {
  const now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((t0 - START_DATE) / 86400000) + 1;
  if (diff < 1) return 1;
  if (diff > TOTAL_DAYS) return TOTAL_DAYS;
  return diff;
}

function weekIndexForDay(dayIndex) {
  return Math.floor((dayIndex - 1) / 7); // index 0-based dans WEEKS
}

const WORKOUT_TYPES = [
  { id: 'push', label: 'Push' },
  { id: 'pull', label: 'Pull' },
  { id: 'legs', label: 'Legs' },
  { id: 'repos', label: 'Repos' },
];

const emptyDay = () => ({
  breakfast: '', lunch: '', dinner: '',
  cardioOn: false, cardioMin: '',
  type: '', caloriesBurnt: '', steps: '',
});

function isDayComplete(d) {
  if (!d) return false;
  return Boolean(d.breakfast && d.lunch && d.dinner && d.steps && d.type);
}

function isDayStarted(d) {
  if (!d) return false;
  return Boolean(
    d.breakfast || d.lunch || d.dinner || d.cardioOn || d.cardioMin ||
    d.type || d.caloriesBurnt || d.steps
  );
}

function num(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

/* ---------------------------------------------------------------------- */
/* Composant principal                                                    */
/* ---------------------------------------------------------------------- */

export default function App() {
  const [daysData, setDaysData] = useState({});
  const [weeklyWeights, setWeeklyWeights] = useState({ 1: '82' });
  const [loaded, setLoaded] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);

  /* --- Code PIN Cloud (Défaut : 0000) --- */
  const [pinCode, setPinCode] = useState(() => localStorage.getItem('pin_code') || '0000');
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'loading' | 'saving' | 'error'
  const [syncing, setSyncing] = useState(false);

  const defaultDay = todayDayIndex();
  const defaultWeek = weekIndexForDay(defaultDay);

  const [openWeek, setOpenWeek] = useState(defaultWeek);
  const [openDay, setOpenDay] = useState(defaultDay);

  const saveTimer = useRef(null);
  const saveHideTimer = useRef(null);

  const flashSaved = useCallback(() => {
    setSaveVisible(true);
    if (saveHideTimer.current) clearTimeout(saveHideTimer.current);
    saveHideTimer.current = setTimeout(() => setSaveVisible(false), 1400);
  }, []);

  /* --- Chargement depuis Cloud + Local --- */
  const loadFromCloud = useCallback(async (pinToUse) => {
    const targetPin = pinToUse || pinCode || '0000';
    setSyncing(true);
    setSyncStatus('loading');
    try {
      const [cloudJours, cloudPoids] = await Promise.all([
        fetchCloudData(targetPin, 'jours'),
        fetchCloudData(targetPin, 'poids')
      ]);

      let hasCloudData = false;

      if (cloudJours && typeof cloudJours === 'object' && Object.keys(cloudJours).length > 0) {
        setDaysData(cloudJours);
        localStorage.setItem('jours', JSON.stringify(cloudJours));
        hasCloudData = true;
      }

      if (cloudPoids && typeof cloudPoids === 'object' && Object.keys(cloudPoids).length > 0) {
        setWeeklyWeights(cloudPoids);
        localStorage.setItem('poids', JSON.stringify(cloudPoids));
        hasCloudData = true;
      }

      setSyncStatus('synced');
      return hasCloudData;
    } catch (e) {
      setSyncStatus('error');
      return false;
    } finally {
      setSyncing(false);
    }
  }, [pinCode]);

  /* --- initialisation --- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Chargement instantané depuis localStorage
      try {
        const localJours = localStorage.getItem('jours');
        if (localJours) setDaysData(JSON.parse(localJours));
      } catch (e) {}
      try {
        const localPoids = localStorage.getItem('poids');
        if (localPoids) setWeeklyWeights(JSON.parse(localPoids));
      } catch (e) {}

      if (!cancelled) setLoaded(true);

      // 2. Synchro automatique avec le Cloud (PIN 0000)
      if (!cancelled) {
        await loadFromCloud(pinCode);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* --- Changement du code PIN --- */
  const handlePinChange = (newPin) => {
    setPinCode(newPin);
    localStorage.setItem('pin_code', newPin);
  };

  /* --- Sauvegarde automatique (Debounce Local + Cloud) --- */
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(async () => {
      try {
        // Local
        localStorage.setItem('jours', JSON.stringify(daysData));
        localStorage.setItem('poids', JSON.stringify(weeklyWeights));

        // Cloud
        setSyncStatus('saving');
        const activePin = pinCode || '0000';
        await saveCloudData(activePin, 'jours', daysData);
        await saveCloudData(activePin, 'poids', weeklyWeights);
        setSyncStatus('synced');
        flashSaved();
      } catch (e) {
        setSyncStatus('error');
      }
    }, 600);

    return () => clearTimeout(saveTimer.current);
  }, [daysData, weeklyWeights, loaded, pinCode, flashSaved]);

  const updateDay = (index, patch) => {
    setDaysData(prev => ({
      ...prev,
      [index]: { ...emptyDay(), ...prev[index], ...patch },
    }));
  };

  const updateWeight = (weekNum, value) => {
    setWeeklyWeights(prev => ({ ...prev, [weekNum]: value }));
  };

  /* --- statistiques globales --- */
  const stats = useMemo(() => {
    let calIn = 0, calOut = 0, stepsSum = 0, stepsDays = 0, logged = 0;
    for (const day of ALL_DAYS) {
      const d = daysData[day.index];
      if (!d) continue;
      calIn += num(d.breakfast) + num(d.lunch) + num(d.dinner);
      calOut += num(d.caloriesBurnt);
      if (d.steps) { stepsSum += num(d.steps); stepsDays += 1; }
      if (isDayStarted(d)) logged += 1;
    }
    const weightEntries = Object.entries(weeklyWeights)
      .filter(([, v]) => v !== '' && v !== undefined)
      .sort((a, b) => Number(a[0]) - Number(b[0]));
    const startWeight = weightEntries.length ? num(weightEntries[0][1]) : null;
    const lastWeight = weightEntries.length ? num(weightEntries[weightEntries.length - 1][1]) : null;
    const delta = (startWeight !== null && lastWeight !== null) ? (lastWeight - startWeight) : null;
    return {
      calIn, calOut, avgSteps: stepsDays ? Math.round(stepsSum / stepsDays) : 0,
      logged, lastWeight, delta,
    };
  }, [daysData, weeklyWeights]);

  const chartData = useMemo(() => {
    return Object.entries(weeklyWeights)
      .filter(([, v]) => v !== '' && v !== undefined && v !== null)
      .map(([wk, v]) => ({ semaine: `S${wk}`, poids: num(v) }))
      .sort((a, b) => Number(a.semaine.slice(1)) - Number(b.semaine.slice(1)));
  }, [weeklyWeights]);

  const currentDayIdx = todayDayIndex();

  return (
    <div className="challenge-app">
      <style>{STYLES}</style>

      {/* ---------- HERO ---------- */}
      <header className="hero">
        <h1 className="hero-title">Défi 90 jours<br />musculation &amp; régime</h1>
        <div className="hero-dates">
          <span>{fmtDate(START_DATE)}</span>
          <span className="arrow">&rarr;</span>
          <span>{fmtDate(END_DATE)}</span>
          <span className="dot">&middot;</span>
          <span>Jour {currentDayIdx} sur {TOTAL_DAYS}</span>
        </div>

        {/* BARRE DE SYNCHRONISATION CLOUD (PIN 0000) */}
        <div className="cloud-sync-bar">
          <div className="cloud-pin-wrap">
            <span className="cloud-icon"><Cloud size={17} /></span>
            <span className="cloud-label">Code PIN Cloud :</span>
            <input
              type="text"
              className="pin-input"
              value={pinCode}
              maxLength={6}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder="0000"
              title="Code PIN pour synchroniser entre plusieurs navigateurs ou appareils"
            />
            <button
              type="button"
              className="sync-btn"
              onClick={() => loadFromCloud(pinCode)}
              disabled={syncing}
              title="Charger les données enregistrées dans le Cloud"
            >
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              {syncing ? 'Synchro...' : 'Recharger'}
            </button>
          </div>

          <div className="cloud-status">
            {syncStatus === 'synced' && <><Check size={14} className="status-check" /> Synchronisé Cloud (PIN: <strong>{pinCode || '0000'}</strong>)</>}
            {syncStatus === 'loading' && <><RefreshCw size={14} className="spin" /> Connexion au Cloud...</>}
            {syncStatus === 'saving' && <><Cloud size={14} /> Enregistrement Cloud...</>}
            {syncStatus === 'error' && <span className="error-text">Synchro Cloud indisponible (mode local actif)</span>}
          </div>
        </div>

        <div className="tick-overview" aria-hidden="true">
          {ALL_DAYS.map((day, i) => {
            const d = daysData[day.index];
            const complete = isDayComplete(d);
            const started = isDayStarted(d);
            return (
              <div
                key={day.index}
                className={
                  'tick' +
                  (complete ? ' done' : started ? ' partial' : '') +
                  (day.index === currentDayIdx ? ' today' : '')
                }
                style={{ animationDelay: `${i * 4}ms` }}
                title={`Jour ${day.index} — ${fmtDateShort(day.date)}`}
                onClick={() => {
                  setOpenWeek(weekIndexForDay(day.index));
                  setOpenDay(day.index);
                  const el = document.getElementById(`day-${day.index}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            );
          })}
        </div>

        <div className="stats-row">
          <Stat value={`${stats.logged}/${TOTAL_DAYS}`} label="Jours renseignés" />
          <Stat value={stats.calIn.toLocaleString('fr-FR')} label="Kcal consommées (total)" />
          <Stat value={stats.calOut.toLocaleString('fr-FR')} label="Kcal brûlées (total)" />
          <Stat value={stats.avgSteps.toLocaleString('fr-FR')} label="Pas / jour en moyenne" />
          <Stat
            value={stats.lastWeight !== null ? `${stats.lastWeight} kg` : '—'}
            label="Poids actuel"
            sub={stats.delta !== null ? `${stats.delta > 0 ? '+' : ''}${stats.delta.toFixed(1)} kg depuis S1` : null}
          />
        </div>
      </header>

      {/* ---------- COURBE DE POIDS ---------- */}
      {chartData.length > 0 && (
        <section className="weight-section">
          <h2 className="section-title">Évolution du poids</h2>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
                <XAxis dataKey="semaine" stroke="#5B6067" fontSize={12} tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.12)' }} />
                <YAxis stroke="#5B6067" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{ background: '#21252B', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, fontFamily: 'Manrope' }}
                  labelStyle={{ color: '#8B9098' }}
                  formatter={(v) => [`${v} kg`, 'Poids']}
                />
                <Line type="monotone" dataKey="poids" stroke="#4C8DFF" strokeWidth={2.5} dot={{ r: 4, fill: '#4C8DFF', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ---------- SEMAINES / JOURS ---------- */}
      <section className="weeks">
        {WEEKS.map((week, wIdx) => {
          const weekNum = wIdx + 1;
          const first = week[0], last = week[week.length - 1];
          const isOpen = openWeek === wIdx;
          const doneCount = week.filter(d => isDayComplete(daysData[d.index])).length;

          return (
            <div key={wIdx} className={'week' + (isOpen ? ' open' : '')}>
              <div className="week-header" onClick={() => setOpenWeek(isOpen ? -1 : wIdx)}>
                <div className="week-heading">
                  <span className="week-title">Semaine {weekNum}</span>
                  <span className="week-range">{fmtDateShort(first.date)} – {fmtDateShort(last.date)}</span>
                </div>

                <div className="week-weight" onClick={(e) => e.stopPropagation()}>
                  <Scale size={15} strokeWidth={2} />
                  <input
                    type="number"
                    inputMode="decimal"
                    className="weight-input"
                    placeholder="—"
                    aria-label={`Poids semaine ${weekNum}`}
                    value={weeklyWeights[weekNum] ?? ''}
                    onChange={(e) => updateWeight(weekNum, e.target.value)}
                  />
                  <span className="unit">kg</span>
                </div>

                <div className="week-right">
                  <span className="week-progress">{doneCount}/{week.length} jours</span>
                  <ChevronDown size={18} className="week-chevron" />
                </div>
              </div>

              <div className="week-body">
                {week.map((day) => (
                  <DayCard
                    key={day.index}
                    day={day}
                    data={daysData[day.index]}
                    isOpen={openDay === day.index}
                    isToday={day.index === currentDayIdx}
                    onToggle={() => setOpenDay(openDay === day.index ? -1 : day.index)}
                    onUpdate={(patch) => updateDay(day.index, patch)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <div className={'save-badge' + (saveVisible ? ' show' : '')}>
        <Check size={14} strokeWidth={3} />
        <span>Enregistré &amp; Synchro</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Sous-composants                                                        */
/* ---------------------------------------------------------------------- */

function Stat({ value, label, sub }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

function DayCard({ day, data, isOpen, isToday, onToggle, onUpdate }) {
  const d = { ...emptyDay(), ...data };
  const complete = isDayComplete(d);
  const started = isDayStarted(d);
  const totalIn = num(d.breakfast) + num(d.lunch) + num(d.dinner);
  const balance = totalIn - num(d.caloriesBurnt);

  return (
    <div id={`day-${day.index}`} className={'day' + (isOpen ? ' open' : '')}>
      <div className="day-header" onClick={onToggle}>
        <div className="day-heading">
          <span className={'day-status' + (complete ? ' complete' : started ? ' partial' : '')}>
            {complete ? <Check size={13} strokeWidth={3} /> : <span className="day-status-dot" />}
          </span>
          <span className="day-name">Jour {day.index}{isToday ? <em className="today-flag">aujourd'hui</em> : null}</span>
          <span className="day-date">{fmtWeekday(day.date)} {fmtDateShort(day.date)}</span>
        </div>
        <ChevronDown size={17} className="day-chevron" />
      </div>

      <div className="day-body">
        <div className="day-columns">
          {/* ---- Régime ---- */}
          <div className="panel diet">
            <div className="panel-title diet"><UtensilsCrossed size={16} /> Alimentation</div>

            <MealRow icon={<Sunrise size={15} />} label="Petit-déjeuner" value={d.breakfast}
              onChange={(v) => onUpdate({ breakfast: v })} />
            <MealRow icon={<Sun size={15} />} label="Déjeuner" value={d.lunch}
              onChange={(v) => onUpdate({ lunch: v })} />
            <MealRow icon={<Moon size={15} />} label="Dîner" value={d.dinner}
              onChange={(v) => onUpdate({ dinner: v })} />

            <div className="meal-total">
              <span>Total consommé</span>
              <span className="value">{totalIn.toLocaleString('fr-FR')} kcal</span>
            </div>
          </div>

          {/* ---- Musculation ---- */}
          <div className="panel train">
            <div className="panel-title train"><Dumbbell size={16} /> Entraînement</div>

            <div className="cardio-toggle-row">
              <span className="field-label"><Activity size={14} /> Cardio effectué</span>
              <div className={'toggle' + (d.cardioOn ? ' on' : '')} onClick={() => onUpdate({ cardioOn: !d.cardioOn })}>
                <div className="toggle-knob" />
              </div>
            </div>
            {d.cardioOn && (
              <div className="field-row">
                <span className="field-label sub">Durée</span>
                <div className="field-input-wrap">
                  <input type="number" inputMode="numeric" className="field-input" placeholder="0"
                    value={d.cardioMin} onChange={(e) => onUpdate({ cardioMin: e.target.value })} />
                  <span className="unit">min</span>
                </div>
              </div>
            )}

            <div className="type-select">
              {WORKOUT_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={'type-btn' + (d.type === t.id ? ' active' : '')}
                  onClick={() => onUpdate({ type: d.type === t.id ? '' : t.id })}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="field-row">
              <span className="field-label"><Flame size={14} /> Calories brûlées (est.)</span>
              <div className="field-input-wrap">
                <input type="number" inputMode="numeric" className="field-input" placeholder="0"
                  value={d.caloriesBurnt} onChange={(e) => onUpdate({ caloriesBurnt: e.target.value })} />
                <span className="unit">kcal</span>
              </div>
            </div>

            <div className="field-row">
              <span className="field-label"><Footprints size={14} /> Pas (jour complet)</span>
              <div className="field-input-wrap">
                <input type="number" inputMode="numeric" className="field-input" placeholder="0"
                  value={d.steps} onChange={(e) => onUpdate({ steps: e.target.value })} />
              </div>
            </div>

            <div className="meal-total train-total">
              <span>Bilan calorique</span>
              <span className="value train-value">{balance >= 0 ? '+' : ''}{balance.toLocaleString('fr-FR')} kcal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MealRow({ icon, label, value, onChange }) {
  return (
    <div className="meal-row">
      <span className="meal-label">{icon} {label}</span>
      <div className="field-input-wrap">
        <input type="number" inputMode="numeric" className="meal-input" placeholder="0"
          aria-label={`Calories — ${label}`}
          value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="unit">kcal</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* Styles                                                                  */
/* ---------------------------------------------------------------------- */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@500;600;700;800;900&family=Manrope:wght@400;500;600;700;800&display=swap');

.challenge-app {
  --bg: #15171b;
  --surface: #1b1e23;
  --surface-2: #21252b;
  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.18);
  --text: #edeeec;
  --text-dim: #8b9098;
  --text-faint: #5b6067;
  --amber: #e0a438;
  --amber-soft: rgba(224,164,56,0.12);
  --amber-border: rgba(224,164,56,0.28);
  --blue: #4c8dff;
  --blue-soft: rgba(76,141,255,0.12);
  --blue-border: rgba(76,141,255,0.28);
  --green: #6fbf73;

  background: var(--bg);
  color: var(--text);
  font-family: 'Manrope', -apple-system, sans-serif;
  min-height: 100vh;
  padding: 28px 20px 64px;
}
.challenge-app *, .challenge-app *::before, .challenge-app *::after { box-sizing: border-box; }
.challenge-app button { font-family: inherit; }

@media (prefers-reduced-motion: reduce) {
  .challenge-app * { animation: none !important; transition: none !important; }
}

/* ---------- hero ---------- */
.hero { max-width: 1080px; margin: 0 auto 30px; }
.hero-title {
  font-family: 'Big Shoulders Display', sans-serif;
  font-weight: 800;
  font-size: clamp(2rem, 5.6vw, 3.6rem);
  line-height: 0.98;
  letter-spacing: 0.2px;
  margin: 0 0 14px;
}
.hero-dates {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  color: var(--text-dim); font-size: 14.5px; margin-bottom: 18px;
}
.hero-dates .arrow { color: var(--text-faint); }
.hero-dates .dot { color: var(--text-faint); }

/* ---------- cloud sync bar ---------- */
.cloud-sync-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  background: var(--surface-2); border: 1px solid var(--border-strong);
  border-radius: 10px; padding: 10px 16px; margin-bottom: 22px; flex-wrap: wrap;
}
.cloud-pin-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.cloud-icon { color: var(--blue); display: flex; align-items: center; }
.cloud-label { font-size: 13.5px; font-weight: 600; color: var(--text); }
.pin-input {
  width: 65px; background: var(--surface); border: 1px solid var(--amber-border);
  border-radius: 6px; padding: 4px 6px; color: var(--amber);
  font-family: 'Big Shoulders Display', sans-serif; font-size: 16px; font-weight: 800;
  text-align: center; letter-spacing: 1px;
}
.pin-input:focus { outline: none; border-color: var(--amber); }
.sync-btn {
  display: flex; align-items: center; gap: 6px; background: var(--blue-soft);
  color: var(--blue); border: 1px solid var(--blue-border); border-radius: 6px;
  padding: 5px 12px; font-size: 12.5px; font-weight: 700; cursor: pointer;
  transition: all 0.15s ease;
}
.sync-btn:hover { background: var(--blue); color: #0b0d10; }
.sync-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.cloud-status { font-size: 12.5px; color: var(--text-dim); display: flex; align-items: center; gap: 6px; }
.status-check { color: var(--green); }
.error-text { color: #ff6b6b; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.tick-overview {
  display: grid;
  grid-template-columns: repeat(30, 1fr);
  gap: 4px;
  margin-bottom: 26px;
}
@media (max-width: 720px) {
  .tick-overview { grid-template-columns: repeat(15, 1fr); }
}
.tick {
  aspect-ratio: 1;
  border-radius: 3px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  cursor: pointer;
  opacity: 0;
  animation: tickIn 0.35s ease forwards;
  transition: transform 0.15s ease;
}
.tick:hover { transform: scale(1.35); }
.tick.partial { background: rgba(224,164,56,0.35); border-color: transparent; }
.tick.done { background: linear-gradient(135deg, var(--amber), var(--blue)); border-color: transparent; }
.tick.today { box-shadow: 0 0 0 2px var(--text); }
@keyframes tickIn { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }

.stats-row {
  display: flex; flex-wrap: wrap; gap: 30px;
  padding: 20px 0; border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
}
.stat-value {
  font-family: 'Big Shoulders Display', sans-serif;
  font-weight: 700; font-size: 1.9rem; line-height: 1;
}
.stat-label { color: var(--text-dim); font-size: 12.5px; margin-top: 5px; }
.stat-sub { color: var(--text-faint); font-size: 12px; margin-top: 2px; }

/* ---------- weight chart ---------- */
.weight-section { max-width: 1080px; margin: 0 auto 30px; }
.section-title {
  font-family: 'Big Shoulders Display', sans-serif;
  font-weight: 700; font-size: 1.5rem; margin: 0 0 12px;
}
.chart-wrap {
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  padding: 14px 10px 4px;
}

/* ---------- weeks / days ---------- */
.weeks { max-width: 1080px; margin: 0 auto; }
.week {
  border: 1px solid var(--border); border-radius: 12px; margin-bottom: 12px;
  background: var(--surface); overflow: hidden;
}
.week-header {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 15px 18px; cursor: pointer; flex-wrap: wrap;
  transition: background 0.15s ease;
}
.week-header:hover { background: var(--surface-2); }
.week-heading { display: flex; flex-direction: column; min-width: 130px; }
.week-title { font-family: 'Big Shoulders Display', sans-serif; font-weight: 700; font-size: 1.25rem; }
.week-range { color: var(--text-dim); font-size: 12.5px; }

.week-weight { display: flex; align-items: center; gap: 6px; color: var(--text-dim); }
.weight-input {
  width: 58px; background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 6px; padding: 5px 6px; color: var(--text); text-align: right;
  font-family: 'Big Shoulders Display', sans-serif; font-size: 15px;
}
.weight-input:focus { outline: none; border-color: var(--blue); }
.week-weight .unit { font-size: 12px; color: var(--text-faint); }

.week-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.week-progress { font-size: 12.5px; color: var(--text-dim); white-space: nowrap; }
.week-chevron { transition: transform 0.25s ease; color: var(--text-dim); }
.week.open .week-chevron { transform: rotate(180deg); }

.week-body {
  max-height: 0; opacity: 0; overflow: hidden;
  transition: max-height 0.4s ease, opacity 0.3s ease;
}
.week.open .week-body { max-height: 4000px; opacity: 1; }

.day { border-top: 1px solid var(--border); }
.day-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 13px 18px; cursor: pointer; gap: 10px; transition: background 0.15s ease;
}
.day-header:hover { background: var(--surface-2); }
.day-heading { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.day-status {
  width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--border-strong);
  display: flex; align-items: center; justify-content: center; color: var(--text-faint); flex-shrink: 0;
}
.day-status.complete { background: var(--green); border-color: var(--green); color: #0b0d0b; }
.day-status.partial { border-color: var(--amber); }
.day-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: 0.5; }
.day-name { font-weight: 600; font-size: 14.5px; }
.today-flag {
  font-style: normal; font-size: 11px; color: var(--blue); margin-left: 8px;
  background: var(--blue-soft); padding: 2px 7px; border-radius: 10px; font-weight: 700;
}
.day-date { color: var(--text-dim); font-size: 13px; }
.day-chevron { color: var(--text-dim); transition: transform 0.25s ease; flex-shrink: 0; }
.day.open .day-chevron { transform: rotate(180deg); }

.day-body {
  max-height: 0; opacity: 0; overflow: hidden; padding: 0 18px;
  transition: max-height 0.35s ease, opacity 0.3s ease, padding 0.3s ease;
}
.day.open .day-body { max-height: 1400px; opacity: 1; padding: 6px 18px 22px; }

.day-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 680px) {
  .day-columns { grid-template-columns: 1fr; }
}

.panel { border-radius: 10px; padding: 16px; border: 1px solid transparent; }
.panel.diet { background: var(--amber-soft); border-color: var(--amber-border); }
.panel.train { background: var(--blue-soft); border-color: var(--blue-border); }
.panel-title { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 13.5px; margin-bottom: 12px; }
.panel-title.diet { color: var(--amber); }
.panel-title.train { color: var(--blue); }

.meal-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 0; border-bottom: 1px dashed rgba(255,255,255,0.14); gap: 10px;
}
.meal-row:last-of-type { border-bottom: none; }
.meal-label { font-size: 13.5px; display: flex; align-items: center; gap: 7px; color: var(--text); }
.meal-input, .field-input {
  width: 66px; background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  padding: 6px 7px; color: var(--text); text-align: right;
  font-family: 'Big Shoulders Display', sans-serif; font-size: 15px;
}
.meal-input:focus, .field-input:focus, .weight-input:focus { outline: none; border-color: var(--amber); }
.panel.train .field-input:focus { border-color: var(--blue); }
.field-input-wrap { display: flex; align-items: center; gap: 6px; }
.unit { font-size: 11.5px; color: var(--text-faint); }

.meal-total {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-top: 8px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.16);
  font-size: 13px; color: var(--text-dim);
}
.meal-total .value { font-family: 'Big Shoulders Display', sans-serif; font-size: 19px; color: var(--amber); font-weight: 700; }
.meal-total.train-total .value.train-value { color: var(--blue); }

.cardio-toggle-row, .field-row {
  display: flex; align-items: center; justify-content: space-between; padding: 7px 0;
}
.field-label { font-size: 13.5px; display: flex; align-items: center; gap: 7px; color: var(--text); }
.field-label.sub { color: var(--text-dim); font-size: 12.5px; padding-left: 22px; }

.toggle {
  width: 40px; height: 23px; border-radius: 20px; background: var(--surface);
  border: 1px solid var(--border); position: relative; cursor: pointer; transition: background 0.2s ease; flex-shrink: 0;
}
.toggle.on { background: var(--blue); border-color: var(--blue); }
.toggle-knob {
  position: absolute; top: 2px; left: 2px; width: 17px; height: 17px; border-radius: 50%;
  background: #fff; transition: transform 0.2s ease;
}
.toggle.on .toggle-knob { transform: translateX(17px); }

.type-select { display: flex; gap: 7px; margin: 10px 0 14px; flex-wrap: wrap; }
.type-btn {
  flex: 1 1 0; min-width: 58px; padding: 9px 6px; border-radius: 8px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text-dim);
  font-weight: 700; font-size: 12.5px; cursor: pointer;
  transition: transform 0.12s ease, background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.type-btn:active { transform: scale(0.94); }
.type-btn.active { background: var(--blue); color: #0b0d10; border-color: var(--blue); }

/* ---------- save badge ---------- */
.save-badge {
  position: fixed; bottom: 18px; right: 18px; z-index: 40;
  background: var(--surface-2); border: 1px solid var(--border-strong);
  color: var(--green); padding: 8px 14px; border-radius: 30px; font-size: 12.5px; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
  opacity: 0; transform: translateY(10px); pointer-events: none;
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.save-badge.show { opacity: 1; transform: translateY(0); }
`;
