import { useApp } from '../context/AppContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Dot
} from 'recharts';
import { CHALLENGE_DAYS, INITIAL_WEIGHT } from '../utils/data';

const TOTAL_WEEKS = Math.ceil(CHALLENGE_DAYS / 7);

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e293b',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 10,
      padding: '10px 14px',
      fontSize: '0.85rem',
      color: 'var(--text-primary)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontSize: '0.75rem' }}>{label}</div>
      <div style={{ fontWeight: 700, color: '#06b6d4' }}>
        {payload[0].value ? `${payload[0].value} kg` : '—'}
      </div>
    </div>
  );
}

export default function WeightChart({ compact = false }) {
  const { weights } = useApp();

  const data = Array.from({ length: TOTAL_WEEKS }, (_, i) => ({
    name: `S${i + 1}`,
    week: i + 1,
    weight: weights[i] ? Number(weights[i]) : null,
  })).filter((_, i) => weights[i] != null || i === 0);

  // Fill first week with initial weight if not set
  if (data[0] && !data[0].weight) data[0].weight = INITIAL_WEIGHT;

  const hasData = data.some(d => d.weight != null);

  if (!hasData) {
    return (
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>
          📊 Évolution du poids
        </div>
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '32px 0', fontSize: '0.9rem' }}>
          Remplis le poids hebdomadaire pour voir le graphique
        </div>
      </div>
    );
  }

  const allWeights = data.map(d => d.weight).filter(Boolean);
  const minW = Math.floor(Math.min(...allWeights)) - 2;
  const maxW = Math.ceil(Math.max(...allWeights)) + 2;

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>
        📊 Évolution du poids
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 16 }}>
        Semaine 1 : {INITIAL_WEIGHT} kg · Objectif : poids réduit progressivement
      </div>
      <ResponsiveContainer width="100%" height={compact ? 160 : 220}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            domain={[minW, maxW]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={INITIAL_WEIGHT} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="url(#weightGrad)"
            strokeWidth={2.5}
            dot={{ fill: '#06b6d4', r: 5, strokeWidth: 0 }}
            activeDot={{ r: 7, fill: '#8b5cf6', strokeWidth: 0 }}
            connectNulls={false}
          />
          <defs>
            <linearGradient id="weightGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
