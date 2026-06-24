'use client';

interface ScoreBarProps {
  bm25?: number;
  vector?: number;
  hybrid?: number;
}

interface BarRowProps {
  label: string;
  value: number;
  color: string;
}

function BarRow({ label, value, color }: BarRowProps) {
  const pct = Math.min(100, Math.max(0, value * 100));
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="score-bar-value">{value.toFixed(2)}</span>
    </div>
  );
}

export default function ScoreBar({ bm25, vector, hybrid }: ScoreBarProps) {
  if (bm25 === undefined && vector === undefined && hybrid === undefined) return null;
  return (
    <div className="score-bar-wrap" style={{ marginTop: '8px' }}>
      {bm25 !== undefined && <BarRow label="BM25" value={bm25} color="#2563EB" />}
      {vector !== undefined && <BarRow label="Vector" value={vector} color="#0D9488" />}
      {hybrid !== undefined && <BarRow label="Hybrid" value={hybrid} color="#7C3AED" />}
    </div>
  );
}
