'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useState } from 'react';
import { Package, FileText, Star, Users, Database, TrendingUp } from 'lucide-react';
import {
  fetchOverview,
  fetchTrends,
  fetchRatingDistribution,
  fetchTopProducts,
  fetchReviewDensity,
  fetchProductIntelligence,
  fetchReviewerSegments,
} from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import StarRating from '@/components/ui/StarRating';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';

const RATING_COLORS: Record<number, string> = {
  1: '#DC2626',
  2: '#F97316',
  3: '#D97706',
  4: '#84CC16',
  5: '#16A34A',
};

function brandQualityColor(rating: number): string {
  if (rating >= 4.5) return '#16A34A';
  if (rating >= 4.0) return '#84CC16';
  if (rating >= 3.5) return '#D97706';
  return '#F97316';
}

function ratingBadge(rating: number) {
  const color = brandQualityColor(rating);
  return (
    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, background: color + '18', color }}>
      {rating.toFixed(2)} ★
    </span>
  );
}

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [ratingLogScale, setRatingLogScale] = useState(false);

  const { data: overview, isLoading: loadingOverview } = useQuery({ queryKey: ['overview'], queryFn: fetchOverview });
  const { data: productIntel, isLoading: loadingIntel } = useQuery({ queryKey: ['productIntel', 20], queryFn: () => fetchProductIntelligence(20), staleTime: 60_000 });
  const { data: reviewerSegments, isLoading: loadingSegments } = useQuery({ queryKey: ['reviewerSegments'], queryFn: fetchReviewerSegments, staleTime: 60_000 });
  const { data: trends, isLoading: loadingTrends } = useQuery({ queryKey: ['trends'], queryFn: fetchTrends });
  const { data: ratingDist, isLoading: loadingRating } = useQuery({ queryKey: ['ratingDist'], queryFn: fetchRatingDistribution });
  const { data: topProducts, isLoading: loadingTop } = useQuery({ queryKey: ['topProducts', 5], queryFn: () => fetchTopProducts(5), staleTime: 60_000 });
  const { data: reviewDensity, isLoading: loadingDensity } = useQuery({ queryKey: ['reviewDensity'], queryFn: fetchReviewDensity, staleTime: 60_000 });

  const totalRatings = ratingDist?.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const fiveStarCount = ratingDist?.find((r) => r.rating === 5)?.count ?? 0;
  const fiveStarPct = totalRatings > 0 ? ((fiveStarCount / totalRatings) * 100).toFixed(1) : '0';
  const weightedSum = ratingDist?.reduce((sum, r) => sum + r.rating * r.count, 0) ?? 0;
  const meanRating = totalRatings > 0 ? (weightedSum / totalRatings).toFixed(2) : '0';
  const fourPlusCount = ratingDist?.filter((r) => r.rating >= 4).reduce((s, r) => s + r.count, 0) ?? 0;
  const fourPlusPct = totalRatings > 0 ? ((fourPlusCount / totalRatings) * 100).toFixed(1) : '0';

  const filteredTrends = trends?.filter((tr) => tr.month >= '2015-01') ?? [];
  const byYear = filteredTrends.reduce<Record<string, number>>((acc, tr) => {
    const year = tr.month.slice(0, 4);
    acc[year] = (acc[year] ?? 0) + tr.count;
    return acc;
  }, {});
  const yearEntries = Object.entries(byYear).sort(([a], [b]) => a.localeCompare(b));
  const peakYear = yearEntries.reduce((max, e) => (e[1] > max[1] ? e : max), ['', 0]);
  const latestYear = yearEntries[yearEntries.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">{t('analytics.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>{t('analytics.subtitle')}</p>
      </div>

      <Tabs defaultValue="overview" data-tour="analytics-tabs">
        <TabsList>
          <TabsTrigger value="overview">{t('analytics.tab.overview')}</TabsTrigger>
          <TabsTrigger value="brands">{t('analytics.tab.brands')}</TabsTrigger>
          <TabsTrigger value="ratings">{t('analytics.tab.ratings')}</TabsTrigger>
          <TabsTrigger value="trends">{t('analytics.tab.trends')}</TabsTrigger>
        </TabsList>

        {/* ─── Overview ─── */}
        <TabsContent value="overview" style={{ marginTop: '16px' }}>
          <div data-tour="analytics-overview" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              {loadingOverview ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: '110px', borderRadius: '12px' }} />)
              ) : (
                <>
                  <KpiCard icon={<Package size={20} color="#2563EB" />} value={overview?.products_count ?? 0} label={t('kpi.products')} iconBg="#EFF6FF" />
                  <KpiCard icon={<FileText size={20} color="#0D9488" />} value={overview?.reviews_count ?? 0} label={t('kpi.reviews')} iconBg="#CCFBF1" />
                  <KpiCard icon={<Star size={20} color="#D97706" />} value={overview?.avg_rating?.toFixed(2) ?? '0'} label={t('kpi.avg_rating')} iconBg="#FFFBEB" />
                  <KpiCard icon={<Users size={20} color="#7C3AED" />} value={overview?.unique_reviewers ?? 0} label={t('kpi.unique_reviewers')} iconBg="#F5F3FF" />
                  <KpiCard icon={<Database size={20} color="#DC2626" />} value={overview?.embeddings_count ?? 0} label={t('kpi.embeddings')} iconBg="#FEF2F2" />
                </>
              )}
            </div>

            {/* Review density — custom bar (log scale) + insights */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '4px' }}>{t('analytics.review_density.title')}</div>
              <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '16px' }}>{t('analytics.review_density.desc')}</p>
              {loadingDensity ? <Skeleton style={{ height: '180px', borderRadius: '8px' }} /> : (() => {
                const total = reviewDensity?.reduce((s, b) => s + b.product_count, 0) ?? 1;
                const COLORS = ['#1D4ED8', '#2563EB', '#60A5FA', '#BFDBFE'];
                const logMax = Math.log10(Math.max(...(reviewDensity?.map(b => b.product_count) ?? [1])) + 1);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {reviewDensity?.map((b, i) => {
                      const pct = (b.product_count / total) * 100;
                      const logPct = (Math.log10(b.product_count + 1) / logMax) * 100;
                      const color = COLORS[i] ?? '#2563EB';
                      return (
                        <div key={b.bucket}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text)' }}>
                              {b.bucket} {t('analytics.review_density.suffix')}
                            </span>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
                                {b.product_count.toLocaleString()}
                              </span>
                              <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
                                ({pct.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div style={{ height: '10px', background: '#F1F5F9', borderRadius: '5px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${logPct}%`, background: color, borderRadius: '5px', transition: 'width 0.6s ease' }} />
                          </div>
                        </div>
                      );
                    })}
                    <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '4px', borderTop: '1px solid var(--app-border)', paddingTop: '10px' }}>
                      📊 {t('analytics.review_density.footnote')}
                    </p>
                  </div>
                );
              })()}
            </div>

            {/* Density insight cards + Top 5 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              {!loadingDensity && reviewDensity?.map((b, i) => {
                const total = reviewDensity.reduce((s, x) => s + x.product_count, 0);
                const COLORS = ['#1D4ED8', '#2563EB', '#60A5FA', '#93C5FD'];
                const color = COLORS[i] ?? '#2563EB';
                return (
                  <div key={b.bucket} className="ari-card" style={{ padding: '14px 16px', borderTop: `3px solid ${color}` }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color }}>{b.product_count.toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '3px' }}>
                      {b.bucket} {t('analytics.review_density.suffix')}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color, marginTop: '6px' }}>
                      {((b.product_count / (reviewDensity.reduce((s, x) => s + x.product_count, 0))) * 100).toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>
              {/* Log-scale BarChart for comparison */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '4px' }}>{t('analytics.review_density.chart_title')}</div>
                <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '12px' }}>{t('analytics.review_density.chart_desc')}</p>
                {loadingDensity ? <Skeleton style={{ height: '180px', borderRadius: '8px' }} /> : (() => {
                  const logData = reviewDensity?.map(b => ({
                    ...b,
                    log_count: Math.round(Math.log10(b.product_count + 1) * 100) / 100,
                  }));
                  return (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={logData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                        <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: string) => `${v}則`} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `10^${v.toFixed(1)}`} />
                        <Tooltip
                          contentStyle={{ fontSize: '12px' }}
                          formatter={(val, _name, props) => [
                            `${props.payload.product_count.toLocaleString()} 件商品`,
                            `log₁₀(商品數)`
                          ]}
                        />
                        <Bar dataKey="log_count" radius={[4, 4, 0, 0]}>
                          {logData?.map((_, i) => (
                            <Cell key={i} fill={['#1D4ED8', '#2563EB', '#60A5FA', '#93C5FD'][i] ?? '#2563EB'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>

              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>{t('analytics.top5.title')}</div>
                {loadingTop ? <Skeleton style={{ height: '180px', borderRadius: '8px' }} /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {topProducts?.map((p, i) => (
                      <div key={p.asin} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-muted)', minWidth: '18px', paddingTop: '2px' }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.title ?? p.asin}
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                            <StarRating rating={p.avg_rating} />
                            <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>({p.rating_number.toLocaleString()})</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── Product Intelligence (replaces Brands) ─── */}
        <TabsContent value="brands" style={{ marginTop: '16px' }}>
          <div data-tour="product-intel" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Reputation Leaderboard */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '4px' }}>{t('analytics.intel.reputation_chart')}</div>
              <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '12px' }}>{t('analytics.intel.reputation_desc')}</p>
              {loadingIntel ? <Skeleton style={{ height: '400px', borderRadius: '8px' }} /> : (() => {
                const TIER_COLOR: Record<string, string> = { high: '#16A34A', medium: '#D97706', low: '#6B7280' };
                const chartData = (productIntel ?? []).slice(0, 20).map((p) => ({
                  name: (p.title ?? p.asin).slice(0, 28) + ((p.title ?? p.asin).length > 28 ? '…' : ''),
                  score: p.reputation_score,
                  tier: p.reputation_tier,
                })).reverse();
                return (
                  <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 20)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 180 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toFixed(0)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={180} />
                      <Tooltip
                        formatter={(v) => [`${Number(v).toFixed(2)}`, '聲譽分數']}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                        {chartData.map((d, i) => (
                          <Cell key={i} fill={TIER_COLOR[d.tier] ?? '#6B7280'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>

            {/* Tier pie + Segments bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Tier distribution */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>{t('analytics.intel.tier_chart')}</div>
                {loadingIntel ? <Skeleton style={{ height: '220px', borderRadius: '8px' }} /> : (() => {
                  const tierCounts = (productIntel ?? []).reduce<Record<string, number>>((acc, p) => {
                    acc[p.reputation_tier] = (acc[p.reputation_tier] ?? 0) + 1;
                    return acc;
                  }, {});
                  const TIER_LABELS: Record<string, string> = {
                    high: t('analytics.intel.tier_high'),
                    medium: t('analytics.intel.tier_medium'),
                    low: t('analytics.intel.tier_low'),
                  };
                  const TIER_COLOR: Record<string, string> = { high: '#16A34A', medium: '#D97706', low: '#6B7280' };
                  const pieData = Object.entries(tierCounts).map(([key, count]) => ({
                    name: TIER_LABELS[key] ?? key,
                    value: count,
                    color: TIER_COLOR[key] ?? '#6B7280',
                  }));
                  const total = pieData.reduce((s, d) => s + d.value, 0);
                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={28}>
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip formatter={(v) => [Number(v).toLocaleString(), '']} contentStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                        {pieData.map((d) => (
                          <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color, display: 'inline-block' }} />
                              {d.name}
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: d.color }}>
                              {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Reviewer segments */}
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '4px' }}>{t('analytics.intel.segments_chart')}</div>
                <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '12px' }}>{t('analytics.intel.segments_desc')}</p>
                {loadingSegments ? <Skeleton style={{ height: '220px', borderRadius: '8px' }} /> : (() => {
                  const SEG_COLORS = ['#1D4ED8', '#2563EB', '#60A5FA', '#93C5FD', '#BFDBFE'];
                  return (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={reviewerSegments} layout="vertical" margin={{ top: 0, right: 50, bottom: 0, left: 52 }}>
                        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <YAxis type="category" dataKey="segment" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={52} />
                        <Tooltip
                          formatter={(v, name) => [Number(v).toLocaleString(), name === 'reviewer_count' ? '評論者數' : '']}
                          contentStyle={{ fontSize: '12px' }}
                        />
                        <Bar dataKey="reviewer_count" radius={[0, 4, 4, 0]}>
                          {(reviewerSegments ?? []).map((_, i) => <Cell key={i} fill={SEG_COLORS[i] ?? '#2563EB'} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>
            </div>

            {/* Intelligence table */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>{t('analytics.intel.reputation_chart')}</div>
              {loadingIntel ? <Skeleton style={{ height: '200px', borderRadius: '8px' }} /> : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                        {['#', t('common.title'), t('kpi.avg_rating'), t('common.reviews'), '聲譽分數', t('analytics.intel.negative_rate'), t('analytics.intel.verified_ratio')].map((h) => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 10px', fontWeight: 600, color: 'var(--app-text-muted)', fontSize: '11px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(productIntel ?? []).slice(0, 15).map((p, i) => {
                        const TIER_COLOR: Record<string, string> = { high: '#16A34A', medium: '#D97706', low: '#6B7280' };
                        const color = TIER_COLOR[p.reputation_tier] ?? '#6B7280';
                        return (
                          <tr key={p.asin} style={{ borderBottom: '1px solid var(--app-border)' }}>
                            <td style={{ padding: '8px 10px', color: 'var(--app-text-muted)', fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.title ?? p.asin}
                            </td>
                            <td style={{ padding: '8px 10px' }}>{ratingBadge(p.avg_rating)}</td>
                            <td style={{ padding: '8px 10px', color: 'var(--app-text-muted)' }}>{p.rating_number.toLocaleString()}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 700, color }}>
                              {p.reputation_score.toFixed(1)}
                            </td>
                            <td style={{ padding: '8px 10px', color: p.negative_rate > 0.2 ? '#DC2626' : 'var(--app-text-muted)' }}>
                              {(p.negative_rate * 100).toFixed(1)}%
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--app-text-muted)' }}>
                              {(p.verified_ratio * 100).toFixed(1)}%
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

        {/* ─── Ratings ─── */}
        <TabsContent value="ratings" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <KpiCard icon={<Star size={20} color="#D97706" />} value={meanRating} label={t('kpi.mean_rating')} iconBg="#FFFBEB" />
              <KpiCard icon={<Star size={20} color="#16A34A" />} value={`${fiveStarPct}%`} label={t('kpi.five_star')} iconBg="#F0FDF4" />
              <KpiCard icon={<FileText size={20} color="#2563EB" />} value={totalRatings.toLocaleString()} label={t('kpi.total_reviews')} iconBg="#EFF6FF" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
              <div className="ari-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div className="card-title">{t('analytics.rating_chart.title')}</div>
                  <button
                    onClick={() => setRatingLogScale((v) => !v)}
                    style={{
                      padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--app-border)',
                      fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                      background: ratingLogScale ? '#2563EB' : 'var(--app-surface)',
                      color: ratingLogScale ? '#fff' : 'var(--app-text-muted)',
                    }}
                  >
                    {ratingLogScale ? '對數尺度' : '線性尺度'}
                  </button>
                </div>
                {loadingRating ? <Skeleton style={{ height: '240px', borderRadius: '8px' }} /> : (() => {
                  const sorted = ratingDist?.slice().sort((a, b) => b.rating - a.rating) ?? [];
                  const chartData = sorted.map((r) => ({
                    ...r,
                    displayCount: ratingLogScale ? Math.round(Math.log10(r.count + 1) * 100) / 100 : r.count,
                  }));
                  return (
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 16 }}>
                        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}
                          tickFormatter={(v: number) => ratingLogScale ? `10^${v.toFixed(1)}` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                        <YAxis type="category" dataKey="rating" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v} ★`} />
                        <Tooltip formatter={(val, _n, props) => {
                          const realCount = props.payload?.count ?? val;
                          return [Number(realCount).toLocaleString(), t('kpi.reviews')];
                        }} contentStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="displayCount" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry) => (
                            <Cell key={entry.rating} fill={RATING_COLORS[entry.rating] ?? '#6B7280'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </div>

              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>{t('analytics.rating_breakdown.title')}</div>
                {loadingRating ? <Skeleton style={{ height: '200px', borderRadius: '8px' }} /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {ratingDist?.slice().sort((a, b) => b.rating - a.rating).map((r) => {
                      const pct = totalRatings > 0 ? (r.count / totalRatings) * 100 : 0;
                      const color = RATING_COLORS[r.rating] ?? '#6B7280';
                      return (
                        <div key={r.rating}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', color }}>{'★'.repeat(r.rating)}</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color }}>{pct.toFixed(1)}%</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--app-border)', borderRadius: '3px' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '2px', textAlign: 'right' }}>{r.count.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '16px 20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#16A34A' }}>{fourPlusPct}%</div>
                <div style={{ fontSize: '12px', color: '#15803D' }}>{t('analytics.insights.fourplus')}</div>
              </div>
              <div style={{ width: '1px', background: '#BBF7D0', alignSelf: 'stretch' }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#16A34A' }}>{meanRating}</div>
                <div style={{ fontSize: '12px', color: '#15803D' }}>{t('analytics.insights.meanrating')}</div>
              </div>
              <div style={{ width: '1px', background: '#BBF7D0', alignSelf: 'stretch' }} />
              <div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#D97706' }}>{fiveStarPct}%</div>
                <div style={{ fontSize: '12px', color: '#92400E' }}>{t('analytics.insights.fivestar')}</div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── Trends ─── */}
        <TabsContent value="trends" style={{ marginTop: '16px' }}>
          <div data-tour="trends-chart" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!loadingTrends && yearEntries.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div className="ari-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{t('kpi.peak_year')}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--app-brand)' }}>{peakYear[0]}</div>
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>{peakYear[1].toLocaleString()} {t('kpi.reviews')}</div>
                </div>
                <div className="ari-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{latestYear?.[0]}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#0D9488' }}>{latestYear?.[1].toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>{t('kpi.reviews')}</div>
                </div>
                <div className="ari-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{t('kpi.years_covered')}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#7C3AED' }}>{yearEntries.length}</div>
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>{yearEntries[0]?.[0]} – {latestYear?.[0]}</div>
                </div>
                <div className="ari-card" style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    <TrendingUp size={11} style={{ display: 'inline', marginRight: '3px' }} />{t('kpi.annual_avg')}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#D97706' }}>
                    {yearEntries.length > 0 ? Math.round(yearEntries.reduce((s, e) => s + e[1], 0) / yearEntries.length).toLocaleString() : 0}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>{t('kpi.reviews')} / {t('kpi.year')}</div>
                </div>
              </div>
            )}

            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '4px' }}>{t('analytics.trends.monthly')}</div>
              <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '14px' }}>{t('analytics.trends.monthly_desc')}</p>
              {loadingTrends ? <Skeleton style={{ height: '300px', borderRadius: '8px' }} /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={filteredTrends} margin={{ top: 4, right: 48, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      domain={[3.5, 5]} tickFormatter={(v: number) => v.toFixed(1)} />
                    <Tooltip
                      contentStyle={{ fontSize: '12px' }}
                      formatter={(v, name) => {
                        if (name === 'count') return [Number(v).toLocaleString(), t('kpi.reviews')];
                        if (name === 'avg_rating') return [Number(v).toFixed(3), t('analytics.trends.avg_rating_line')];
                        return [v, name];
                      }}
                    />
                    <ReferenceLine yAxisId="right" y={4.0} stroke="#D97706" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Area yAxisId="left" type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} fill="url(#trendGrad)" name="count" />
                    <Line yAxisId="right" type="monotone" dataKey="avg_rating" stroke="#D97706" strokeWidth={2} dot={false} name="avg_rating" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Negative rate bar chart */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '4px' }}>{t('analytics.trends.negative_bar')}</div>
              <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '12px' }}>{t('analytics.trends.negative_desc')}</p>
              {loadingTrends ? <Skeleton style={{ height: '120px', borderRadius: '8px' }} /> : (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={filteredTrends} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip
                      contentStyle={{ fontSize: '12px' }}
                      formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, '負評率']}
                    />
                    <Bar dataKey="negative_rate" radius={[2, 2, 0, 0]}>
                      {filteredTrends.map((d, i) => (
                        <Cell key={i} fill={(d.negative_rate ?? 0) > 0.15 ? '#DC2626' : '#F97316'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>{t('analytics.trends.annual')}</div>
              {loadingTrends ? <Skeleton style={{ height: '180px', borderRadius: '8px' }} /> : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={yearEntries.map(([year, count]) => ({ year, count }))} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString(), t('kpi.reviews')]} contentStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {yearEntries.map(([year]) => (
                        <Cell key={year} fill={year === peakYear[0] ? '#2563EB' : '#BFDBFE'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
