// ─── Constants ───────────────────────────────────────────────
export const CHALLENGE_START = new Date(2026, 8, 7);  // Sept 7, 2026 (month is 0-indexed)
export const CHALLENGE_DAYS  = 90;
export const INITIAL_WEIGHT  = 82;

// ─── Generate all 90 dates ────────────────────────────────────
export function generateDates() {
  const dates = [];
  for (let i = 0; i < CHALLENGE_DAYS; i++) {
    const d = new Date(CHALLENGE_START);
    d.setDate(d.getDate() + i);
    dates.push(formatDate(d));
  }
  return dates;
}

// ─── Helpers ──────────────────────────────────────────────────
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function getDayIndex(dateStr) {
  const d = parseDate(dateStr);
  const diff = Math.round((d - CHALLENGE_START) / 86400000);
  return diff;
}

export function getTodayStr() {
  return formatDate(new Date());
}

export function getWeekNumber(dayIndex) {
  return Math.floor(dayIndex / 7);  // 0-indexed week
}

export function formatDisplayDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatShortDate(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─── Default day data ─────────────────────────────────────────
export function createDefaultDay() {
  return {
    diet: {
      breakfast: { desc: '', calories: '' },
      lunch:     { desc: '', calories: '' },
      dinner:    { desc: '', calories: '' },
    },
    workout: {
      type: '',            // push | pull | legs | cardio | rest
      cardioDesc: '',
      estimatedCaloriesBurnt: '',
      steps: '',
    },
    saved: false,
  };
}

// ─── Storage Keys ─────────────────────────────────────────────
export const STORAGE_DAYS    = 'challenge90_days';
export const STORAGE_WEIGHTS = 'challenge90_weights';

// ─── Load / Save ──────────────────────────────────────────────
export function loadDays() {
  try {
    const raw = localStorage.getItem(STORAGE_DAYS);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export function saveDay(dateStr, data) {
  const all = loadDays();
  all[dateStr] = { ...data, saved: true };
  localStorage.setItem(STORAGE_DAYS, JSON.stringify(all));
}

export function loadWeights() {
  try {
    const raw = localStorage.getItem(STORAGE_WEIGHTS);
    const parsed = raw ? JSON.parse(raw) : {};
    // Week 0 defaults to initial weight
    if (!parsed[0]) parsed[0] = INITIAL_WEIGHT;
    return parsed;
  } catch { return { 0: INITIAL_WEIGHT }; }
}

export function saveWeight(weekIndex, weight) {
  const all = loadWeights();
  all[weekIndex] = weight;
  localStorage.setItem(STORAGE_WEIGHTS, JSON.stringify(all));
}

// ─── Stats helpers ────────────────────────────────────────────
export function getTotalCaloriesIn(dayData) {
  const { breakfast, lunch, dinner } = dayData.diet;
  return (Number(breakfast.calories) || 0)
       + (Number(lunch.calories) || 0)
       + (Number(dinner.calories) || 0);
}

export function getTotalCaloriesOut(dayData) {
  return Number(dayData.workout.estimatedCaloriesBurnt) || 0;
}

export function getNetCalories(dayData) {
  return getTotalCaloriesIn(dayData) - getTotalCaloriesOut(dayData);
}

export function isDayCompleted(dayData) {
  if (!dayData || !dayData.saved) return false;
  const hasFood = getTotalCaloriesIn(dayData) > 0;
  const hasWorkout = dayData.workout.type !== '';
  return hasFood && hasWorkout;
}

export function isDayPartial(dayData) {
  if (!dayData || !dayData.saved) return false;
  return !isDayCompleted(dayData);
}

export function getStreakCount(days) {
  const all = loadDays();
  const dates = generateDates();
  const today = getTodayStr();
  let streak = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (dates[i] > today) continue;
    if (isDayCompleted(all[dates[i]])) streak++;
    else break;
  }
  return streak;
}

export function getCompletedCount() {
  const all = loadDays();
  const dates = generateDates();
  return dates.filter(d => isDayCompleted(all[d])).length;
}

export function getCurrentDayIndex() {
  const today = getTodayStr();
  const idx = getDayIndex(today);
  if (idx < 0) return 0;
  if (idx >= CHALLENGE_DAYS) return CHALLENGE_DAYS - 1;
  return idx;
}
