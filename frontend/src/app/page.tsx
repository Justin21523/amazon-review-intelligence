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
import { Package, FileText, Star, Users, Database } from 'lucide-react';
import { fetchOverview, fetchTrends, fetchTopProducts, fetchRatingDistribution } from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import { Skeleton } from '@/components/ui/skeleton';
import StarRating from '@/components/ui/StarRating';

const RATING_COLORS: Record<number, string> = {
  1: '#DC2626',
  2: '#F97316',
  3: '#D97706',
  4: '#84CC16',
  5: '#16A34A',
};

export default function OverviewPage() {
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

  // Filter trends to last 5+ years (>= 2018-01)
  const filteredTrends = trends?.filter((t) => t.month >= '2018-01') ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Amazon Review Intelligence</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          Home &amp; Kitchen · 100K reviews · 83K products
        </p>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
        {loadingOverview ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ height: '110px', borderRadius: '12px' }} />
          ))
        ) : (
          <>
            <KpiCard
              icon={<Package size={20} color="#2563EB" />}
              value={overview?.products_count ?? 0}
              label="Products"
              iconBg="#EFF6FF"
            />
            <KpiCard
              icon={<FileText size={20} color="#0D9488" />}
              value={overview?.reviews_count ?? 0}
              label="Reviews"
              iconBg="#CCFBF1"
            />
            <KpiCard
              icon={<Star size={20} color="#D97706" />}
              value={overview?.avg_rating?.toFixed(2) ?? '0.00'}
              label="Avg Rating"
              iconBg="#FFFBEB"
            />
            <KpiCard
              icon={<Users size={20} color="#7C3AED" />}
              value={overview?.unique_reviewers ?? 0}
              label="Unique Reviewers"
              iconBg="#F5F3FF"
            />
            <KpiCard
              icon={<Database size={20} color="#DC2626" />}
              value={overview?.embeddings_count ?? 0}
              label="Embeddings"
              iconBg="#FEF2F2"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        {/* Monthly Review Volume */}
        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '16px' }}>
            Monthly Review Volume
          </div>
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
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  contentStyle={{ fontSize: '12px', border: '1px solid var(--app-border)' }}
                  formatter={(v) => [Number(v).toLocaleString(), 'Reviews']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#blueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Rating Distribution */}
        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '16px' }}>
            Rating Distribution
          </div>
          {loadingRating ? (
            <Skeleton style={{ height: '240px', borderRadius: '8px' }} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={ratingDist?.slice().sort((a, b) => b.rating - a.rating)}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 8 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <YAxis
                  type="category"
                  dataKey="rating"
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}★`}
                />
                <Tooltip
                  contentStyle={{ fontSize: '12px', border: '1px solid var(--app-border)' }}
                  formatter={(v) => [Number(v).toLocaleString(), 'Reviews']}
                />
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
        <div className="card-title" style={{ marginBottom: '16px' }}>
          Top Products by Popularity
        </div>
        {loadingTop ? (
          <Skeleton style={{ height: '240px', borderRadius: '8px' }} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                {['Rank', 'Title', 'Avg Rating', 'Reviews', 'Popularity Score'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontWeight: 600,
                      color: 'var(--app-text-muted)',
                      fontSize: '12px',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topProducts?.map((p, i) => (
                <tr
                  key={p.asin}
                  style={{ borderBottom: '1px solid var(--app-border)', lineHeight: '1.4' }}
                >
                  <td style={{ padding: '10px 12px', color: 'var(--app-text-muted)', fontWeight: 600 }}>
                    #{i + 1}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div
                      style={{
                        maxWidth: '340px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                    >
                      {p.title ?? p.asin}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>
                      {p.asin}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <StarRating rating={p.avg_rating} />
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--app-text-muted)' }}>
                    {p.rating_number.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        background: '#EFF6FF',
                        color: '#2563EB',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {p.popularity_score.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
