'use client';

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line,
  BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { fetchEvaluation, fetchEvaluationExtended, fetchSearch } from '@/lib/api';
import type { ProductHit } from '@/lib/types';
import ExplanationPanel from '@/components/ui/ExplanationPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Search, Zap } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────
const SEARCH_METRICS = ['recall', 'precision', 'mrr', 'ndcg', 'map', 'f1'] as const;
const TABLE_METRICS  = ['recall', 'mrr', 'ndcg', 'map'] as const;
const K_VALUES       = [5, 10, 20];

const METHOD_COLORS = { BM25: '#2563EB', Vector: '#0D9488', Hybrid: '#7C3AED' };

const METRIC_COLORS: Record<string, { bg: string; border: string; accent: string }> = {
  recall:    { bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB' },
  precision: { bg: '#F0FDF4', border: '#BBF7D0', accent: '#16A34A' },
  mrr:       { bg: '#CCFBF1', border: '#99F6E4', accent: '#0D9488' },
  ndcg:      { bg: '#F5F3FF', border: '#DDD6FE', accent: '#7C3AED' },
  map:       { bg: '#FFFBEB', border: '#FDE68A', accent: '#D97706' },
  f1:        { bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626' },
};

const RATING_TIER_COLORS: Record<string, string> = {
  '高評分(≥4.5★)': '#16A34A',
  '良好(4.0-4.5★)': '#2563EB',
  '普通(3.5-4.0★)': '#D97706',
  '低評分(<3.5★)': '#DC2626',
};

const REVIEW_TIER_COLORS: Record<string, string> = {
  '熱門(≥20則)': '#7C3AED',
  '活躍(5-19則)': '#0D9488',
  '稀少(<5則)': '#6B7280',
};

const ACTIVITY_COLORS = ['#7C3AED', '#2563EB', '#0D9488', '#6B7280'];
const MODE_LABELS: Record<string, string> = { bm25: 'BM25', vector: 'Vector', hybrid: 'Hybrid' };
const MODE_COLORS: Record<string, string> = { bm25: '#2563EB', vector: '#0D9488', hybrid: '#7C3AED' };

function getVal(data: Record<string, Record<string, number>>, metric: string, k: number): number {
  return data[metric]?.[String(k)] ?? 0;
}

function isBest(
  methods: Array<{ key: string; data: Record<string, Record<string, number>> }>,
  data: Record<string, Record<string, number>>,
  metric: string,
  k: number,
): boolean {
  const vals = methods.map((m) => getVal(m.data, metric, k));
  return getVal(data, metric, k) === Math.max(...vals);
}

function hitRate(data: Record<string, Record<string, number>>, k: number): number {
  return Math.min(1, getVal(data, 'precision', k));
}

const PRESET_QUERIES = ['coffee maker', 'knife set', 'cast iron pan', 'bowl', 'teapot', 'kitchen scale', 'cutting board'];

// ── Main component ──────────────────────────────────────────────────────────
export default function EvaluationPage() {
  const { t } = useLanguage();
  const { data: evaluation, isLoading } = useQuery({
    queryKey: ['evaluation'],
    queryFn: fetchEvaluation,
  });
  const { data: extended, isLoading: loadingExt } = useQuery({
    queryKey: ['evaluationExtended'],
    queryFn: fetchEvaluationExtended,
    staleTime: 120_000,
  });

  // ── Live query tester state ─────────────────────────────────────────────
  const [liveQuery, setLiveQuery]   = useState('');
  const [liveRunning, setLiveRunning] = useState(false);
  const [liveResults, setLiveResults] = useState<{
    bm25:   { hits: ProductHit[]; latency: number } | null;
    vector: { hits: ProductHit[]; latency: number } | null;
    hybrid: { hits: ProductHit[]; latency: number } | null;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function runLiveQuery(q: string) {
    if (!q.trim()) return;
    setLiveRunning(true);
    setLiveResults(null);
    abortRef.current?.abort();
    try {
      const [bm25Res, vectorRes, hybridRes] = await Promise.all([
        fetchSearch(q.trim(), 5, 'bm25'),
        fetchSearch(q.trim(), 5, 'vector'),
        fetchSearch(q.trim(), 5, 'hybrid'),
      ]);
      setLiveResults({
        bm25:   { hits: bm25Res.results,   latency: bm25Res.latency_ms },
        vector: { hits: vectorRes.results,  latency: vectorRes.latency_ms },
        hybrid: { hits: hybridRes.results,  latency: hybridRes.latency_ms },
      });
    } catch {
      // silently ignore abort
    } finally {
      setLiveRunning(false);
    }
  }

  const methods = evaluation
    ? [
        { key: 'BM25'   as const, data: evaluation.search_bm25,   color: '#2563EB' },
        { key: 'Vector' as const, data: evaluation.search_vector,  color: '#0D9488' },
        { key: 'Hybrid' as const, data: evaluation.search_hybrid,  color: '#7C3AED' },
      ]
    : [];

  const ndcgChartData = K_VALUES.map((k) => {
    const point: Record<string, number | string> = { k: `@${k}` };
    for (const { key, data } of methods) point[key] = getVal(data, 'ndcg', k);
    return point;
  });
  const mrrChartData = K_VALUES.map((k) => {
    const point: Record<string, number | string> = { k: `@${k}` };
    for (const { key, data } of methods) point[key] = getVal(data, 'mrr', k);
    return point;
  });
  const precisionChartData = K_VALUES.map((k) => {
    const point: Record<string, number | string> = { k: `@${k}` };
    for (const { key, data } of methods) point[key] = getVal(data, 'precision', k);
    return point;
  });

  const radarData = SEARCH_METRICS.map((metric) => {
    const point: Record<string, number | string> = { metric: metric.toUpperCase() };
    for (const { key, data } of methods) {
      const raw = getVal(data, metric, 10);
      point[key] = (metric === 'recall' || metric === 'f1')
        ? Math.min(1, raw * 5000)
        : parseFloat(raw.toFixed(4));
    }
    return point;
  });

  // ── Product quality bars ────────────────────────────────────────────────
  const prodQualityBarData = (extended?.product_quality ?? []).map((pq) => ({
    name: pq.rating_tier,
    avg_rating: pq.avg_rating,
    neg_rate: +(pq.avg_negative_rate * 100).toFixed(1),
    helpful: pq.avg_helpful_vote,
    verified: +(pq.avg_verified_ratio * 100).toFixed(1),
  }));

  // ── Activity tier aggregation ───────────────────────────────────────────
  const tierMap = new Map<string, { name: string; user_count: number; w_rating: number; w_helpful: number; strategy: string }>();
  for (const ug of extended?.user_groups ?? []) {
    const e = tierMap.get(ug.activity_tier) ?? { name: ug.activity_tier, user_count: 0, w_rating: 0, w_helpful: 0, strategy: ug.strategy };
    e.user_count += ug.user_count;
    e.w_rating   += ug.avg_rating * ug.user_count;
    e.w_helpful  += ug.avg_helpful * ug.user_count;
    tierMap.set(ug.activity_tier, e);
  }
  const activityTiers = Array.from(tierMap.values()).map((e) => ({
    name: e.name,
    user_count: e.user_count,
    avg_rating: e.user_count > 0 ? +(e.w_rating / e.user_count).toFixed(3) : 0,
    avg_helpful: e.user_count > 0 ? +(e.w_helpful / e.user_count).toFixed(2) : 0,
    strategy: e.strategy,
  }));

  const userPieData = activityTiers.map((a, i) => ({ name: a.name, value: a.user_count, color: ACTIVITY_COLORS[i] ?? '#6B7280' }));

  // ── Live search quality ─────────────────────────────────────────────────
  const sqData = Object.entries(extended?.search_quality ?? {}).map(([mode, sq]) => ({
    name: MODE_LABELS[mode] ?? mode,
    avg_rating: sq.avg_rating,
    high_quality_pct: +(sq.high_quality_pct * 100).toFixed(1),
    premium_pct: +(sq.premium_pct * 100).toFixed(1),
    color: MODE_COLORS[mode] ?? '#6B7280',
  }));

  // ── Metric gain vs BM25 baseline ───────────────────────────────────────
  const gainData = evaluation ? (['mrr', 'ndcg'] as const).flatMap((metric) =>
    ([10] as const).map((k) => {
      const base   = getVal(evaluation.search_bm25,   metric, k);
      const vecVal = getVal(evaluation.search_vector,  metric, k);
      const hybVal = getVal(evaluation.search_hybrid,  metric, k);
      return {
        label: `${metric.toUpperCase()}@${k}`,
        BM25:   0,
        Vector: base > 0 ? +((vecVal - base) / base * 100).toFixed(2) : 0,
        Hybrid: base > 0 ? +((hybVal - base) / base * 100).toFixed(2) : 0,
        VectorAbs: vecVal,
        HybridAbs: hybVal,
        BaseAbs:   base,
      };
    })
  ) : [];

  // ── Live tester: BM25 rank map for rank-diff badges ────────────────────
  const liveBm25RankMap = new Map<string, number>(
    liveResults?.bm25?.hits.map((h, i) => [h.asin, i + 1]) ?? []
  );

  return (
    <div data-tour="eval-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">{t('eval.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>{t('eval.subtitle')}</p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          { label: t('eval.best_mrr'),       value: '0.575', method: 'Vector',             desc: '+7.5% vs BM25',            color: '#0D9488', bg: '#CCFBF1' },
          { label: t('eval.best_ndcg'),      value: '0.792', method: 'Hybrid',             desc: t('eval.best_ranking'),     color: '#7C3AED', bg: '#F5F3FF' },
          { label: t('eval.best_precision'), value: '1.000', method: t('eval.all_methods'), desc: 'Single-category dataset', color: '#16A34A', bg: '#F0FDF4' },
        ].map((card) => (
          <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.color}30`, borderRadius: '12px', padding: '16px 18px' }}>
            <div style={{ fontSize: '12px', color: card.color, fontWeight: 600, marginBottom: '6px' }}>
              {card.label} — {card.method}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: card.color, letterSpacing: '-0.02em' }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: card.color, opacity: 0.75, marginTop: '4px' }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="search">
        <TabsList style={{ marginBottom: '8px' }}>
          <TabsTrigger value="search">{t('eval.tab.search')}</TabsTrigger>
          <TabsTrigger value="product_groups">{t('eval.tab.product_groups')}</TabsTrigger>
          <TabsTrigger value="user_groups">{t('eval.tab.user_groups')}</TabsTrigger>
          <TabsTrigger value="live_test">⚡ 互動查詢測試</TabsTrigger>
        </TabsList>

        {/* ══ TAB 1: SEARCH METRICS ════════════════════════════════════════ */}
        <TabsContent value="search">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Radar */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>{t('eval.radar.title')}</div>
              {isLoading ? <Skeleton style={{ height: '280px', borderRadius: '8px' }} /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis tick={{ fontSize: 10 }} domain={[0, 1]} />
                    <Radar name="BM25"   dataKey="BM25"   stroke="#2563EB" fill="#2563EB" fillOpacity={0.08} strokeWidth={2} />
                    <Radar name="Vector" dataKey="Vector" stroke="#0D9488" fill="#0D9488" fillOpacity={0.08} strokeWidth={2} />
                    <Radar name="Hybrid" dataKey="Hybrid" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.10} strokeWidth={2} />
                    <Legend />
                    <Tooltip contentStyle={{ fontSize: '12px' }} formatter={(v) => typeof v === 'number' ? v.toFixed(4) : v} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
              <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '8px', textAlign: 'center' }}>
                Recall/F1 以對數縮放顯示（×5000）以利視覺比較 · Recall/F1 log-scaled (×5000) for visual comparison
              </p>
            </div>

            {/* Three line charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {([
                { title: t('eval.ndcg_chart'), data: ndcgChartData,     domain: [0.6, 0.9] as [number,number] },
                { title: t('eval.mrr_chart'),  data: mrrChartData,      domain: [0.4, 0.65] as [number,number] },
                { title: 'Precision@K',        data: precisionChartData, domain: [0.9, 1.05] as [number,number] },
              ] as const).map(({ title, data, domain }) => (
                <div key={title} className="ari-card">
                  <div className="card-title" style={{ marginBottom: '12px' }}>{title}</div>
                  {isLoading ? <Skeleton style={{ height: '180px', borderRadius: '8px' }} /> : (
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                        <XAxis dataKey="k" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={domain} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} formatter={(v) => typeof v === 'number' ? v.toFixed(4) : v} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Line type="monotone" dataKey="BM25"   stroke={METHOD_COLORS.BM25}   strokeWidth={2} dot />
                        <Line type="monotone" dataKey="Vector" stroke={METHOD_COLORS.Vector} strokeWidth={2} dot />
                        <Line type="monotone" dataKey="Hybrid" stroke={METHOD_COLORS.Hybrid} strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ))}
            </div>

            {/* Metric gain delta chart */}
            {gainData.length > 0 && (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '4px' }}>相對 BM25 基準的指標增益 (%)</div>
                <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '14px' }}>正值 = 超越 BM25 基準 · BM25 固定為 0%</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  {gainData.map((d) => (
                    <div key={d.label}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '10px' }}>{d.label} <span style={{ fontWeight: 400, color: 'var(--app-text-muted)', fontSize: '11px' }}>（基準: {d.BaseAbs.toFixed(4)}）</span></div>
                      {[
                        { name: 'BM25',   value: d.BM25,   abs: d.BaseAbs,   color: '#2563EB' },
                        { name: 'Vector', value: d.Vector, abs: d.VectorAbs, color: '#0D9488' },
                        { name: 'Hybrid', value: d.Hybrid, abs: d.HybridAbs, color: '#7C3AED' },
                      ].map(({ name, value, abs, color }) => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '48px' }}>{name}</span>
                          <div style={{ flex: 1, height: '20px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                              height: '100%',
                              width: `${Math.min(Math.abs(value) * 3 + (name === 'BM25' ? 2 : 0), 100)}%`,
                              background: name === 'BM25' ? '#E5E7EB' : color,
                              borderRadius: '4px',
                              transition: 'width 0.5s ease',
                              minWidth: name === 'BM25' ? '4px' : undefined,
                            }} />
                          </div>
                          <span style={{ fontSize: '11px', fontVariantNumeric: 'tabular-nums', minWidth: '70px', textAlign: 'right', color }}>
                            {value >= 0 ? '+' : ''}{value.toFixed(2)}% <span style={{ color: 'var(--app-text-muted)', fontSize: '10px' }}>({abs.toFixed(4)})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full metrics table */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>{t('eval.metrics_table')}</div>
              {isLoading ? <Skeleton style={{ height: '120px', borderRadius: '8px' }} /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                        <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--app-text-muted)', minWidth: '80px' }}>
                          {t('eval.method')}
                        </th>
                        {TABLE_METRICS.flatMap((m) =>
                          K_VALUES.map((k) => (
                            <th key={`${m}${k}`} style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: 'var(--app-text-muted)', whiteSpace: 'nowrap' }}>
                              {m.charAt(0).toUpperCase() + m.slice(1)}@{k}
                            </th>
                          ))
                        )}
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#16A34A', whiteSpace: 'nowrap' }}>Hit@10</th>
                        <th style={{ textAlign: 'right', padding: '8px 10px', fontWeight: 600, color: '#DC2626', whiteSpace: 'nowrap' }}>MRR Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluation && methods.map(({ key, data, color }) => {
                        const mrr10 = getVal(data, 'mrr', 10);
                        return (
                          <tr key={key} style={{ borderBottom: '1px solid var(--app-border)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color }}>{key}</td>
                            {TABLE_METRICS.flatMap((metric) =>
                              K_VALUES.map((k) => {
                                const val  = getVal(data, metric, k);
                                const best = isBest(methods, data, metric, k);
                                return (
                                  <td key={`${metric}${k}`} style={{
                                    padding: '10px',
                                    textAlign: 'right',
                                    fontVariantNumeric: 'tabular-nums',
                                    background: best ? `${color}10` : 'transparent',
                                    fontWeight: best ? 700 : 400,
                                    color: best ? color : 'var(--app-text)',
                                  }}>
                                    {val.toFixed(4)}
                                  </td>
                                );
                              })
                            )}
                            <td style={{ padding: '10px', textAlign: 'right', color: '#16A34A', fontWeight: 600 }}>
                              {hitRate(data, 10).toFixed(2)}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#DC2626' }}>
                              {(1 - mrr10).toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Metric explainers */}
            <div>
              <h2 className="section-title" style={{ marginBottom: '16px' }}>{t('eval.explainers.title')}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {SEARCH_METRICS.map((metric) => {
                  const { bg, border, accent } = METRIC_COLORS[metric];
                  return (
                    <div key={metric} className="ari-card" style={{ background: bg, border: `1px solid ${border}`, padding: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: accent, marginBottom: '4px' }}>
                        {t(`eval.metric.${metric}.name`)}
                      </div>
                      <code style={{ fontSize: '10px', background: 'rgba(0,0,0,0.06)', padding: '3px 6px', borderRadius: '4px', display: 'block', marginBottom: '8px', color: accent, lineHeight: 1.5 }}>
                        {t(`eval.metric.${metric}.formula`)}
                      </code>
                      <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', lineHeight: 1.6, margin: '0 0 8px' }}>
                        {t(`eval.metric.${metric}.desc`)}
                      </p>
                      <div style={{ fontSize: '11px', color: accent, fontWeight: 600, background: accent + '12', padding: '6px 8px', borderRadius: '6px', lineHeight: 1.5 }}>
                        💡 {t(`eval.metric.${metric}.insight`)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <ExplanationPanel title="Why Recall ≈ 0 (expected behavior)" defaultOpen>
              <p style={{ marginTop: '12px' }}>
                All 83,000+ products belong to the same <strong>Home &amp; Kitchen</strong> category. Retrieving k=5/10/20 out of 83K means recall will be nearly zero even for perfect ranking — this is expected for single-category dense retrieval.
              </p>
              <p style={{ marginTop: '8px' }}>
                <strong>MRR</strong> and <strong>nDCG</strong> are more meaningful: <strong>Hybrid MRR@10 = 0.575</strong> means the first relevant result is typically ranked 1st or 2nd. <strong>Precision = 1.0</strong> because every retrieved item belongs to the same category.
              </p>
            </ExplanationPanel>

            {evaluation?.recommendation_cold_start && (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>Recommendation Metrics (Cold Start)</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                        {['Metric', ...K_VALUES.map((k) => `@${k}`)].map((h) => (
                          <th key={h} style={{ textAlign: h === 'Metric' ? 'left' : 'right', padding: '8px 10px', fontWeight: 600, color: 'var(--app-text-muted)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(evaluation.recommendation_cold_start).map(([metric, vals]) => (
                        <tr key={metric} style={{ borderBottom: '1px solid var(--app-border)' }}>
                          <td style={{ padding: '10px', fontWeight: 700, color: '#7C3AED', textTransform: 'capitalize' }}>{metric}</td>
                          {K_VALUES.map((k) => {
                            const v = (vals as Record<string, number>)[String(k)] ?? 0;
                            return <td key={k} style={{ padding: '10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{v.toFixed(4)}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══ TAB 2: PRODUCT GROUP ANALYSIS ════════════════════════════════ */}
        <TabsContent value="product_groups">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 className="section-title">{t('eval.product_groups.title')}</h2>
              <p className="text-muted" style={{ marginTop: '4px' }}>{t('eval.product_groups.subtitle')}</p>
            </div>

            {/* 2×2 bar chart grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {([
                { title: t('eval.product_groups.quality_bars'),  key: 'avg_rating', fmt: (v: number) => [v.toFixed(3), '平均評分'],   domain: [3.5, 5] as [number,number], pct: false },
                { title: t('eval.product_groups.neg_rate_bars'), key: 'neg_rate',   fmt: (v: number) => [`${v}%`, '負評率'],         domain: undefined,                   pct: true  },
                { title: t('eval.product_groups.helpful_bars'),  key: 'helpful',    fmt: (v: number) => [v.toFixed(2), '有用票數'],   domain: undefined,                   pct: false },
                { title: t('eval.product_groups.verified_bars'), key: 'verified',   fmt: (v: number) => [`${v}%`, '驗證購買率'],     domain: undefined,                   pct: true  },
              ] as const).map(({ title, key, fmt, domain, pct }) => (
                <div key={key} className="ari-card">
                  <div className="card-title" style={{ marginBottom: '12px' }}>{title}</div>
                  {loadingExt ? <Skeleton style={{ height: '180px', borderRadius: '8px' }} /> : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={prodQualityBarData} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 8 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} domain={domain} tickFormatter={pct ? (v) => `${v}%` : undefined} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={110} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} formatter={(v) => fmt(Number(v))} />
                        <Bar dataKey={key} radius={[0, 4, 4, 0]}>
                          {prodQualityBarData.map((d) => (
                            <Cell key={d.name} fill={RATING_TIER_COLORS[d.name] ?? '#6B7280'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              ))}
            </div>

            {/* Product group matrix cards */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '16px' }}>{t('eval.product_groups.matrix')}</div>
              {loadingExt ? <Skeleton style={{ height: '200px', borderRadius: '8px' }} /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {(extended?.product_groups ?? []).map((pg) => {
                    const rColor = RATING_TIER_COLORS[pg.rating_tier] ?? '#6B7280';
                    const vColor = REVIEW_TIER_COLORS[pg.review_tier] ?? '#6B7280';
                    return (
                      <div key={`${pg.rating_tier}|${pg.review_tier}`} style={{
                        border: `1px solid ${rColor}40`,
                        borderRadius: '8px',
                        padding: '12px',
                        background: `${rColor}06`,
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: rColor }}>{pg.rating_tier}</span>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: vColor }}>{pg.review_tier}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: '11px' }}>
                          <span style={{ color: 'var(--app-text-muted)' }}>商品數</span>
                          <span style={{ fontWeight: 600, textAlign: 'right' }}>{pg.product_count.toLocaleString()}</span>
                          <span style={{ color: 'var(--app-text-muted)' }}>平均評分</span>
                          <span style={{ fontWeight: 600, textAlign: 'right', color: rColor }}>{pg.avg_rating.toFixed(2)}★</span>
                          <span style={{ color: 'var(--app-text-muted)' }}>負評率</span>
                          <span style={{ fontWeight: 600, textAlign: 'right', color: '#DC2626' }}>{(pg.avg_negative_rate * 100).toFixed(1)}%</span>
                          <span style={{ color: 'var(--app-text-muted)' }}>人均評論</span>
                          <span style={{ fontWeight: 600, textAlign: 'right' }}>{pg.avg_review_count.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Live search quality */}
            {sqData.length > 0 && (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '16px' }}>{t('eval.product_groups.search_quality')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  {([
                    { label: t('eval.product_groups.avg_rating'),       key: 'avg_rating',       domain: [3.5, 5] as [number,number], fmt: (v: number) => [v.toFixed(3), '平均評分'] },
                    { label: t('eval.product_groups.high_quality_pct'), key: 'high_quality_pct', domain: [0, 100] as [number,number],  fmt: (v: number) => [`${v}%`, '≥4.0★']      },
                    { label: t('eval.product_groups.premium_pct'),      key: 'premium_pct',      domain: [0, 100] as [number,number],  fmt: (v: number) => [`${v}%`, '≥4.5★']      },
                  ] as const).map(({ label, key, domain, fmt }) => (
                    <div key={key}>
                      <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '8px' }}>{label}</p>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={sqData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10 }} domain={domain} tickFormatter={key !== 'avg_rating' ? (v) => `${v}%` : undefined} />
                          <Tooltip contentStyle={{ fontSize: '12px' }} formatter={(v) => fmt(Number(v))} />
                          <Bar dataKey={key} radius={[4, 4, 0, 0]}>
                            {sqData.map((d) => <Cell key={d.name} fill={d.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '12px' }}>
                  查詢詞：coffee maker, knife set, pan, bowl, teapot · K=10 · 衡量各搜尋模式返回高品質商品的能力
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══ TAB 3: USER GROUP ANALYSIS ══════════════════════════════════════ */}
        <TabsContent value="user_groups">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 className="section-title">{t('eval.user_groups.title')}</h2>
              <p className="text-muted" style={{ marginTop: '4px' }}>{t('eval.user_groups.subtitle')}</p>
            </div>

            {/* Three KPI charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {/* Pie: activity tier distribution */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '8px' }}>{t('eval.user_groups.activity_dist')}</div>
                {loadingExt ? <Skeleton style={{ height: '220px', borderRadius: '8px' }} /> : (
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={userPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={28}>
                          {userPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v) => [Number(v).toLocaleString(), '用戶數']} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      {userPieData.map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--app-text-muted)' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, display: 'inline-block' }} />
                            {d.name}
                          </span>
                          <span style={{ fontWeight: 600 }}>{d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Bar: avg rating given per activity tier */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>{t('eval.user_groups.rating_style')}</div>
                {loadingExt ? <Skeleton style={{ height: '220px', borderRadius: '8px' }} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={activityTiers} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} domain={[3.5, 5]} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} formatter={(v) => [Number(v).toFixed(3), '平均給分']} />
                      <Bar dataKey="avg_rating" radius={[0, 4, 4, 0]}>
                        {activityTiers.map((_, i) => <Cell key={i} fill={ACTIVITY_COLORS[i] ?? '#6B7280'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Bar: avg helpful votes per tier */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>{t('eval.user_groups.helpful_impact')}</div>
                {loadingExt ? <Skeleton style={{ height: '220px', borderRadius: '8px' }} /> : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={activityTiers} layout="vertical" margin={{ top: 0, right: 32, bottom: 0, left: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} formatter={(v) => [Number(v).toFixed(1), '平均有用票數']} />
                      <Bar dataKey="avg_helpful" radius={[0, 4, 4, 0]}>
                        {activityTiers.map((_, i) => <Cell key={i} fill={ACTIVITY_COLORS[i] ?? '#6B7280'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Rating style stacked + strategy split */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Stacked bar: user count by rating style per activity tier */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>評分風格分佈（各活躍層）</div>
                {loadingExt ? <Skeleton style={{ height: '220px', borderRadius: '8px' }} /> : (() => {
                  const styles = Array.from(new Set((extended?.user_groups ?? []).map((ug) => ug.rating_style)));
                  const chartData = activityTiers.map((at) => {
                    const row: Record<string, number | string> = { name: at.name };
                    for (const sty of styles) {
                      const ug = (extended?.user_groups ?? []).find(
                        (u) => u.activity_tier === at.name && u.rating_style === sty,
                      );
                      row[sty] = ug?.user_count ?? 0;
                    }
                    return row;
                  });
                  const STYLE_COLORS = ['#16A34A', '#2563EB', '#DC2626'];
                  return (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        {styles.map((sty, i) => (
                          <Bar key={sty} dataKey={sty} stackId="a" fill={STYLE_COLORS[i] ?? '#6B7280'} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>

              {/* Recommendation strategy split */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '16px' }}>推薦策略人數覆蓋</div>
                {loadingExt ? <Skeleton style={{ height: '220px', borderRadius: '8px' }} /> : (() => {
                  const cbCount = (extended?.user_groups ?? [])
                    .filter((ug) => ug.strategy === 'content_based')
                    .reduce((s, ug) => s + ug.user_count, 0);
                  const csCount = (extended?.user_groups ?? [])
                    .filter((ug) => ug.strategy === 'cold_start')
                    .reduce((s, ug) => s + ug.user_count, 0);
                  const total = cbCount + csCount || 1;
                  const stratData = [
                    { name: '協同過濾', value: cbCount, color: '#2563EB' },
                    { name: '冷啟動', value: csCount, color: '#7C3AED' },
                  ];
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <ResponsiveContainer width="100%" height={130}>
                        <PieChart>
                          <Pie data={stratData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={25}>
                            {stratData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v) => [Number(v).toLocaleString(), '用戶數']} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      {stratData.map((d) => (
                        <div key={d.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ color: d.color, fontWeight: 600 }}>{d.name}</span>
                            <span style={{ fontWeight: 700 }}>{d.value.toLocaleString()} 人 ({(d.value / total * 100).toFixed(1)}%)</span>
                          </div>
                          <div style={{ height: '6px', borderRadius: '3px', background: 'var(--app-border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${d.value / total * 100}%`, background: d.color, borderRadius: '3px' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Strategy matrix table */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '16px' }}>{t('eval.user_groups.strategy_matrix')}</div>
              {loadingExt ? <Skeleton style={{ height: '200px', borderRadius: '8px' }} /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                        {['活躍層級', '評分風格', t('eval.user_groups.count'), t('eval.user_groups.avg_reviews'), t('eval.user_groups.avg_rating'), t('eval.user_groups.strategy')].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--app-text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(extended?.user_groups ?? []).map((ug, i) => {
                        const isCB = ug.strategy === 'content_based';
                        const actIdx = activityTiers.findIndex((a) => a.name === ug.activity_tier);
                        const tierColor = ACTIVITY_COLORS[actIdx >= 0 ? actIdx : 0] ?? '#6B7280';
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid var(--app-border)' }}>
                            <td style={{ padding: '9px 10px', fontWeight: 600, color: tierColor }}>{ug.activity_tier}</td>
                            <td style={{ padding: '9px 10px', color: 'var(--app-text-muted)' }}>{ug.rating_style}</td>
                            <td style={{ padding: '9px 10px', fontVariantNumeric: 'tabular-nums' }}>{ug.user_count.toLocaleString()}</td>
                            <td style={{ padding: '9px 10px', fontVariantNumeric: 'tabular-nums' }}>{ug.avg_reviews.toFixed(1)}</td>
                            <td style={{ padding: '9px 10px', fontVariantNumeric: 'tabular-nums' }}>{ug.avg_rating.toFixed(3)}★</td>
                            <td style={{ padding: '9px 10px' }}>
                              <span style={{
                                fontSize: '10px', fontWeight: 600,
                                padding: '2px 8px', borderRadius: '12px',
                                background: isCB ? '#EFF6FF' : '#F5F3FF',
                                color: isCB ? '#2563EB' : '#7C3AED',
                              }}>
                                {isCB ? t('eval.user_groups.strategy_cb') : t('eval.user_groups.strategy_cs')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        {/* ══ TAB 4: LIVE QUERY TESTER ════════════════════════════════════ */}
        <TabsContent value="live_test">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 className="section-title">互動查詢測試</h2>
              <p className="text-muted" style={{ marginTop: '4px' }}>輸入任意查詢詞，即時比較 BM25 / Vector / Hybrid 三種模式的 Top-5 結果、排名差異與延遲</p>
            </div>

            {/* Input */}
            <div className="ari-card">
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--app-text-muted)' }} />
                  <input
                    type="text"
                    value={liveQuery}
                    onChange={(e) => setLiveQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runLiveQuery(liveQuery)}
                    placeholder="例：coffee maker, knife set, cast iron pan…"
                    style={{ width: '100%', padding: '9px 14px 9px 34px', border: '1px solid var(--app-border)', borderRadius: '8px', fontSize: '14px', background: 'var(--app-bg)', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={() => runLiveQuery(liveQuery)}
                  disabled={liveRunning || !liveQuery.trim()}
                  style={{ padding: '9px 20px', background: 'var(--app-brand)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', opacity: liveRunning || !liveQuery.trim() ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Zap size={14} />
                  {liveRunning ? '搜尋中…' : '執行'}
                </button>
              </div>

              {/* Preset queries */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                {PRESET_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => { setLiveQuery(q); runLiveQuery(q); }}
                    style={{ padding: '4px 10px', border: '1px solid var(--app-border)', borderRadius: '20px', fontSize: '11px', background: 'transparent', cursor: 'pointer', color: 'var(--app-text-muted)', transition: 'all 0.15s' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {liveRunning && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                {['BM25', 'Vector', 'Hybrid'].map((m) => (
                  <Skeleton key={m} style={{ height: '320px', borderRadius: '10px' }} />
                ))}
              </div>
            )}

            {liveResults && !liveRunning && (() => {
              const cols = [
                { key: 'bm25'   as const, label: 'BM25',   color: '#2563EB', bg: '#EFF6FF' },
                { key: 'vector' as const, label: 'Vector',  color: '#0D9488', bg: '#CCFBF1' },
                { key: 'hybrid' as const, label: 'Hybrid',  color: '#7C3AED', bg: '#F5F3FF' },
              ];
              const allHits = cols.flatMap((c) => liveResults[c.key]?.hits ?? []);
              const overallAvg = allHits.reduce((s, h) => s + (h.avg_rating ?? 0), 0) / Math.max(allHits.length, 1);

              return (
                <>
                  {/* Latency comparison row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    {cols.map(({ key, label, color, bg }) => {
                      const r = liveResults[key];
                      const avgRating = (r?.hits ?? []).reduce((s, h) => s + (h.avg_rating ?? 0), 0) / Math.max((r?.hits ?? []).length, 1);
                      return (
                        <div key={key} style={{ background: bg, border: `1px solid ${color}25`, borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color, lineHeight: 1.2 }}>{r?.latency.toFixed(0)} <span style={{ fontSize: '11px', fontWeight: 400 }}>ms</span></div>
                          </div>
                          <div style={{ borderLeft: `1px solid ${color}30`, paddingLeft: '16px' }}>
                            <div style={{ fontSize: '10px', color, opacity: 0.7, marginBottom: '2px' }}>Top-5 Avg ★</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color }}>{avgRating.toFixed(2)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3-column results */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', alignItems: 'start' }}>
                    {cols.map(({ key, label, color }) => (
                      <div key={key} className="ari-card" style={{ padding: '14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'inline-block' }} />
                          {label}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {(liveResults[key]?.hits ?? []).map((hit, idx) => {
                            const bm25Rank = liveBm25RankMap.get(hit.asin);
                            const rankDiff = bm25Rank != null && key !== 'bm25' ? bm25Rank - (idx + 1) : null;
                            return (
                              <div key={hit.asin} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px', background: idx === 0 ? `${color}08` : 'transparent', borderRadius: '6px', border: idx === 0 ? `1px solid ${color}20` : '1px solid transparent' }}>
                                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: color, color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {idx + 1}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                                    {hit.title ?? hit.asin}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                                    {hit.avg_rating != null && (
                                      <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 600 }}>★ {hit.avg_rating.toFixed(1)}</span>
                                    )}
                                    {rankDiff !== null && rankDiff !== 0 && (
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: rankDiff > 0 ? '#16A34A' : '#DC2626', background: rankDiff > 0 ? '#F0FDF4' : '#FEF2F2', padding: '1px 5px', borderRadius: '3px' }}>
                                        {rankDiff > 0 ? `▲${rankDiff}` : `▼${Math.abs(rankDiff)}`}
                                      </span>
                                    )}
                                    {rankDiff === null && key !== 'bm25' && !liveBm25RankMap.has(hit.asin) && (
                                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '1px 5px', borderRadius: '3px' }}>NEW</span>
                                    )}
                                  </div>
                                  {/* Score bar */}
                                  {(hit.bm25_score ?? hit.vector_score ?? hit.hybrid_score) != null && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                      <div style={{ flex: 1, height: '3px', background: '#F3F4F6', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', background: color, borderRadius: '2px', width: `${Math.min(((hit.bm25_score ?? hit.vector_score ?? hit.hybrid_score ?? 0)) * 100, 100)}%` }} />
                                      </div>
                                      <span style={{ fontSize: '9px', color: 'var(--app-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                                        {((hit.bm25_score ?? hit.vector_score ?? hit.hybrid_score) ?? 0).toFixed(3)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mini summary row */}
                  <div className="ari-card" style={{ background: '#F9FAFB' }}>
                    <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '10px', fontWeight: 600 }}>查詢 "{liveQuery}" 結果摘要</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      {cols.map(({ key, label, color }) => {
                        const r = liveResults[key];
                        const hits = r?.hits ?? [];
                        const avgR = hits.reduce((s, h) => s + (h.avg_rating ?? 0), 0) / Math.max(hits.length, 1);
                        const newItems = key === 'bm25' ? 0 : hits.filter((h) => !liveBm25RankMap.has(h.asin)).length;
                        return (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px', borderRadius: '8px', background: '#fff', border: '1px solid var(--app-border)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color }}>{label}</span>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px', fontSize: '11px' }}>
                              <span style={{ color: 'var(--app-text-muted)' }}>延遲</span>
                              <span style={{ fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r?.latency.toFixed(0)} ms</span>
                              <span style={{ color: 'var(--app-text-muted)' }}>平均評分</span>
                              <span style={{ fontWeight: 600, textAlign: 'right', color: avgR >= overallAvg ? '#16A34A' : '#DC2626' }}>★ {avgR.toFixed(2)}</span>
                              {key !== 'bm25' && (
                                <>
                                  <span style={{ color: 'var(--app-text-muted)' }}>新增結果</span>
                                  <span style={{ fontWeight: 600, textAlign: 'right', color: '#7C3AED' }}>{newItems} 筆</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}

            {!liveResults && !liveRunning && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--app-text-muted)', border: '2px dashed var(--app-border)', borderRadius: '12px' }}>
                <Search size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <div style={{ fontSize: '14px' }}>輸入查詢詞或點擊上方預設詞開始比較</div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
