'use client';

import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchEvaluation } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

const METRICS = ['recall', 'mrr', 'ndcg'];
const K_VALUES = [5, 10, 20];

function metricKey(metric: string, k: number) {
  return `${metric}@${k}`;
}

function getValue(data: Record<string, Record<string, number>>, metric: string, k: number): number {
  const key = metricKey(metric, k);
  // Try different key patterns
  for (const [mk, mv] of Object.entries(data)) {
    if (typeof mv === 'object') {
      if (mv[key] !== undefined) return mv[key];
      if (mv[`${metric}_at_${k}`] !== undefined) return mv[`${metric}_at_${k}`];
    }
  }
  // Direct access
  const direct = data[key] ?? data[`${metric}_at_${k}`];
  if (typeof direct === 'number') return direct;
  return 0;
}

function flattenMetrics(data: Record<string, Record<string, number>>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(data)) {
    if (typeof v === 'object') {
      Object.assign(out, v);
    } else if (typeof v === 'number') {
      out[k] = v;
    }
  }
  return out;
}

export default function EvaluationPage() {
  const { data: evaluation, isLoading } = useQuery({
    queryKey: ['evaluation'],
    queryFn: fetchEvaluation,
  });

  const methods = evaluation
    ? [
        { key: 'BM25', data: evaluation.search_bm25, color: '#2563EB' },
        { key: 'Vector', data: evaluation.search_vector, color: '#0D9488' },
        { key: 'Hybrid', data: evaluation.search_hybrid, color: '#7C3AED' },
      ]
    : [];

  // Build nDCG chart data
  const ndcgChartData = K_VALUES.map((k) => {
    const point: Record<string, number | string> = { k: `@${k}` };
    for (const { key, data } of methods) {
      const flat = flattenMetrics(data);
      point[key] = flat[`ndcg@${k}`] ?? flat[`nDCG@${k}`] ?? flat[`NDCG@${k}`] ?? 0;
    }
    return point;
  });

  // Build eval table rows
  function buildRow(label: string, data: Record<string, Record<string, number>>) {
    const flat = flattenMetrics(data);
    const cells: (string | number)[] = [label];
    for (const metric of METRICS) {
      for (const k of K_VALUES) {
        const candidates = [
          `${metric}@${k}`,
          `${metric.toUpperCase()}@${k}`,
          `${metric}_at_${k}`,
        ];
        let val = 0;
        for (const c of candidates) {
          if (flat[c] !== undefined) { val = flat[c]; break; }
        }
        cells.push(val.toFixed(4));
      }
    }
    return cells;
  }

  const colHeaders = METRICS.flatMap((m) => K_VALUES.map((k) => `${m.charAt(0).toUpperCase() + m.slice(1)}@${k}`));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">Evaluation</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          Search and recommendation model performance metrics
        </p>
      </div>

      {/* Search Evaluation Table */}
      <div className="ari-card">
        <div className="card-title" style={{ marginBottom: '12px' }}>Search Evaluation Metrics</div>
        {isLoading ? (
          <Skeleton style={{ height: '120px', borderRadius: '8px' }} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--app-text-muted)', minWidth: '80px' }}>
                    Method
                  </th>
                  {colHeaders.map((h) => (
                    <th key={h} style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: 'var(--app-text-muted)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluation && methods.map(({ key, data, color }) => {
                  const row = buildRow(key, data);
                  return (
                    <tr key={key} style={{ borderBottom: '1px solid var(--app-border)' }}>
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          style={{
                            padding: '10px 10px',
                            textAlign: i === 0 ? 'left' : 'right',
                            fontWeight: i === 0 ? 700 : 400,
                            color: i === 0 ? color : 'var(--app-text)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* nDCG line chart */}
      <div className="ari-card">
        <div className="card-title" style={{ marginBottom: '12px' }}>nDCG@K Comparison</div>
        {isLoading ? (
          <Skeleton style={{ height: '240px', borderRadius: '8px' }} />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ndcgChartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <XAxis dataKey="k" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} />
              <Tooltip contentStyle={{ fontSize: '12px' }} />
              <Legend />
              <Line type="monotone" dataKey="BM25" stroke="#2563EB" strokeWidth={2} dot />
              <Line type="monotone" dataKey="Vector" stroke="#0D9488" strokeWidth={2} dot />
              <Line type="monotone" dataKey="Hybrid" stroke="#7C3AED" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Methodology note */}
      <div
        className="ari-card"
        style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
        }}
      >
        <div className="card-title" style={{ marginBottom: '8px', color: '#92400E' }}>
          Methodology Note — Why Recall ≈ 0
        </div>
        <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#78350F' }}>
          All 83,000+ products belong to the same <strong>Home &amp; Kitchen</strong> category.
          When evaluating retrieval recall, the &ldquo;relevant&rdquo; set for any product query
          is effectively the entire catalog. With only k=5/10/20 retrieved results out of 83K
          candidates, recall will be near zero even for perfect ranking — this is expected
          behavior for single-category dense retrieval. MRR and nDCG are more meaningful
          metrics here since they reward correct first-rank placement.
        </p>
      </div>

      {/* Recommendation metrics */}
      {evaluation?.recommendation_cold_start && (
        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '12px' }}>
            Recommendation Metrics (Cold Start)
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                  {['Strategy', ...colHeaders].map((h) => (
                    <th key={h} style={{ textAlign: h === 'Strategy' ? 'left' : 'right', padding: '8px 10px', fontWeight: 600, color: 'var(--app-text-muted)', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(evaluation.recommendation_cold_start).map(([strategy, metrics]) => {
                  const flat = typeof metrics === 'object' ? metrics as Record<string, number> : {};
                  return (
                    <tr key={strategy} style={{ borderBottom: '1px solid var(--app-border)' }}>
                      <td style={{ padding: '10px', fontWeight: 700, color: '#7C3AED' }}>{strategy}</td>
                      {METRICS.flatMap((m) =>
                        K_VALUES.map((k) => {
                          const candidates = [`${m}@${k}`, `${m.toUpperCase()}@${k}`, `${m}_at_${k}`];
                          let val = 0;
                          for (const c of candidates) {
                            if (flat[c] !== undefined) { val = flat[c]; break; }
                          }
                          return (
                            <td key={`${m}${k}`} style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                              {val.toFixed(4)}
                            </td>
                          );
                        })
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
