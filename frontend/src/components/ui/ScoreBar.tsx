'use client';

interface ScoreBarProps {
  bm25?: number | null;
  vector?: number | null;
  hybrid?: number | null;
}

function BarRow({ label, value, color }: { label: string; value: number | null; color: string }) {
  const safe = value ?? 0;
  const pct = Math.min(100, Math.max(0, safe * 100));
  return (
    <div className="score-bar-row">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-bar-value">{safe.toFixed(2)}</span>
    </div>
  );
}

export default function ScoreBar({ bm25, vector, hybrid }: ScoreBarProps) {
  if (bm25 == null && vector == null && hybrid == null) return null;
  return (
    <div className="score-bar-wrap" style={{ marginTop: '8px' }}>
      {bm25 != null && <BarRow label="BM25" value={bm25} color="#2563EB" />}
      {vector != null && <BarRow label="Vector" value={vector} color="#0D9488" />}
      {hybrid != null && <BarRow label="Hybrid" value={hybrid} color="#7C3AED" />}
    </div>
  );
}
