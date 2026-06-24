'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Package, FileText, Star, Users, Database, Search, Sparkles, Activity, Cpu, HardDrive } from 'lucide-react';
import { fetchOverview, fetchTrends, fetchTopProducts, fetchRatingDistribution, fetchRecentQueries } from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import ScenarioCard from '@/components/ui/ScenarioCard';
import { Skeleton } from '@/components/ui/skeleton';
import StarRating from '@/components/ui/StarRating';
import { useTour } from '@/components/tour/GuidedTourContext';
import { useLanguage } from '@/contexts/LanguageContext';

const RATING_COLORS: Record<number, string> = {
  1: '#DC2626',
  2: '#F97316',
  3: '#D97706',
  4: '#84CC16',
  5: '#16A34A',
};

export default function OverviewPage() {
  const { start: startTour } = useTour();
  const { t } = useLanguage();

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  });

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['trends'],
    queryFn: fetchTrends,
  });

  const { data: topProducts, isLoading: loadingTop } = useQuery({
    queryKey: ['topProducts', 10],
    queryFn: () => fetchTopProducts(10),
  });

  const { data: ratingDist, isLoading: loadingRating } = useQuery({
    queryKey: ['ratingDist'],
    queryFn: fetchRatingDistribution,
  });

  const { data: recentQueries } = useQuery({
    queryKey: ['recentQueries'],
    queryFn: () => fetchRecentQueries(10),
    staleTime: 30_000,
  });

  const filteredTrends = trends?.filter((t) => t.month >= '2018-01') ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">{t('overview.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>{t('overview.subtitle')}</p>
      </div>

      {/* KPI cards */}
      <div data-tour="kpi-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {loadingOverview ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ height: '110px', borderRadius: '12px' }} />
          ))
        ) : (
          <>
            <KpiCard icon={<Package size={20} color="#2563EB" />} value={overview?.products_count ?? 0} label={t('kpi.products')} iconBg="#EFF6FF" />
            <KpiCard icon={<FileText size={20} color="#0D9488" />} value={overview?.reviews_count ?? 0} label={t('kpi.reviews')} iconBg="#CCFBF1" />
            <KpiCard icon={<Star size={20} color="#D97706" />} value={overview?.avg_rating?.toFixed(2) ?? '0.00'} label={t('kpi.avg_rating')} iconBg="#FFFBEB" />
            <KpiCard icon={<Users size={20} color="#7C3AED" />} value={overview?.unique_reviewers ?? 0} label={t('kpi.unique_reviewers')} iconBg="#F5F3FF" />
            <KpiCard icon={<Database size={20} color="#DC2626" />} value={overview?.embeddings_count ?? 0} label={t('kpi.embeddings')} iconBg="#FEF2F2" />
          </>
        )}
      </div>

      {/* System Health row */}
      <div data-tour="health-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          {
            icon: <Activity size={18} color="#2563EB" />,
            bg: '#EFF6FF',
            label: 'BM25 索引',
            value: overview?.bm25_doc_count != null
              ? `${overview.bm25_doc_count.toLocaleString()} 文件`
              : `${(overview?.products_count ?? 83119).toLocaleString()} 文件`,
            sub: 'rank-bm25 · 7.7 MB · 詞彙匹配',
            color: '#2563EB',
          },
          {
            icon: <Cpu size={18} color="#7C3AED" />,
            bg: '#F5F3FF',
            label: '向量嵌入庫',
            value: `${(overview?.vector_doc_count ?? overview?.embeddings_count ?? 0).toLocaleString()} 向量`,
            sub: 'all-MiniLM-L6-v2 · 384 維 · 餘弦相似',
            color: '#7C3AED',
          },
          {
            icon: <HardDrive size={18} color="#0D9488" />,
            bg: '#F0FDF4',
            label: 'DuckDB 資料庫',
            value: '322 MB · 單檔',
            sub: `${(overview?.products_count ?? 0).toLocaleString()} 商品 · ${(overview?.reviews_count ?? 0).toLocaleString()} 評論`,
            color: '#0D9488',
          },
        ].map(({ icon, bg, label, value, sub, color }) => (
          <div key={label} className="ari-card" style={{ background: bg, border: `1px solid ${color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ padding: '6px', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>{icon}</div>
              <span style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              <span style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#16A34A', display: 'inline-block', flexShrink: 0 }} title="運行中" />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color, marginBottom: '3px' }}>{value}</div>
            <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '16px' }}>{t('overview.monthly_volume')}</div>
          {loadingTrends ? (
            <Skeleton style={{ height: '240px', borderRadius: '8px' }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={filteredTrends} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <Tooltip contentStyle={{ fontSize: '12px', border: '1px solid var(--app-border)' }} formatter={(v) => [Number(v).toLocaleString(), t('kpi.reviews')]} />
                <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} fill="url(#blueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '16px' }}>{t('overview.rating_dist')}</div>
          {loadingRating ? (
            <Skeleton style={{ height: '240px', borderRadius: '8px' }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ratingDist?.slice().sort((a, b) => b.rating - a.rating)} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                <YAxis type="category" dataKey="rating" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}★`} />
                <Tooltip contentStyle={{ fontSize: '12px', border: '1px solid var(--app-border)' }} formatter={(v) => [Number(v).toLocaleString(), t('kpi.reviews')]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {ratingDist?.slice().sort((a, b) => b.rating - a.rating).map((entry) => (
                    <Cell key={entry.rating} fill={RATING_COLORS[entry.rating] ?? '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products table */}
      <div className="ari-card">
        <div className="card-title" style={{ marginBottom: '16px' }}>{t('overview.top_products')}</div>
        {loadingTop ? (
          <Skeleton style={{ height: '240px', borderRadius: '8px' }} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                {[t('common.rank'), t('common.title'), t('common.avg_rating'), t('common.reviews'), t('overview.popularity_score')].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--app-text-muted)', fontSize: '12px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts?.map((p, i) => (
                <tr key={p.asin} style={{ borderBottom: '1px solid var(--app-border)', lineHeight: '1.4' }}>
                  <td style={{ padding: '10px 12px', color: 'var(--app-text-muted)', fontWeight: 600 }}>#{i + 1}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ maxWidth: '340px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {p.title ?? p.asin}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>{p.asin}</div>
                  </td>
                  <td style={{ padding: '10px 12px' }}><StarRating rating={p.avg_rating} /></td>
                  <td style={{ padding: '10px 12px', color: 'var(--app-text-muted)' }}>{p.rating_number.toLocaleString()}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                      {p.popularity_score.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Queries section */}
      <div data-tour="recent-queries" className="ari-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <div className="card-title" style={{ margin: 0 }}>搜尋記錄</div>
          <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
            {(overview?.query_log_count ?? 0).toLocaleString()} 筆
          </span>
        </div>
        {!recentQueries || recentQueries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-text-muted)', fontSize: '13px' }}>
            尚無搜尋記錄
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                {['查詢關鍵字', '模式', '延遲', '結果數'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 12px', fontWeight: 600, color: 'var(--app-text-muted)', fontSize: '11px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentQueries.map((q, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--app-border)' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 500, maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.query}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: q.mode === 'hybrid' ? '#FEF3C7' : q.mode === 'vector' ? '#F5F3FF' : '#EFF6FF',
                      color: q.mode === 'hybrid' ? '#D97706' : q.mode === 'vector' ? '#7C3AED' : '#2563EB',
                      padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    }}>{q.mode}</span>
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--app-text-muted)', fontVariantNumeric: 'tabular-nums' }}>{q.latency_ms.toFixed(0)} ms</td>
                  <td style={{ padding: '8px 12px', color: 'var(--app-text-muted)' }}>{q.results_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick-start section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 className="section-title">{t('overview.quick_start')}</h2>
          <button
            onClick={startTour}
            style={{
              padding: '7px 16px',
              background: 'var(--app-brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {t('overview.start_tour')}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <ScenarioCard title={t('scenario.search_coffee.title')} description={t('scenario.search_coffee.desc')} tag="Search" icon={<Search size={18} />} href="/search?q=coffee+maker" />
          <ScenarioCard title={t('scenario.review.title')} description={t('scenario.review.desc')} tag="Review" icon={<FileText size={18} />} href="/reviews" />
          <ScenarioCard title={t('scenario.reco.title')} description={t('scenario.reco.desc')} tag="Reco" icon={<Sparkles size={18} />} href="/recommendations" />
          <ScenarioCard title={t('scenario.analytics.title')} description={t('scenario.analytics.desc')} tag="Analytics" icon={<Database size={18} />} href="/analytics" />
          <ScenarioCard title={t('scenario.search_skillet.title')} description={t('scenario.search_skillet.desc')} tag="Search" icon={<Search size={18} />} href="/search?q=cast+iron+skillet" />
          <ScenarioCard title={t('scenario.evaluation.title')} description={t('scenario.evaluation.desc')} tag="Analytics" icon={<Database size={18} />} href="/evaluation" />
        </div>
      </div>
    </div>
  );
}
