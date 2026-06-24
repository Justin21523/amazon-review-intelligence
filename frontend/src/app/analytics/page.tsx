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
  Legend,
} from 'recharts';
import { Package, FileText, Star, Users, Database } from 'lucide-react';
import {
  fetchOverview,
  fetchBrands,
  fetchCategories,
  fetchTrends,
  fetchRatingDistribution,
} from '@/lib/api';
import KpiCard from '@/components/ui/KpiCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const RATING_COLORS: Record<number, string> = {
  1: '#DC2626',
  2: '#F97316',
  3: '#D97706',
  4: '#84CC16',
  5: '#16A34A',
};

export default function AnalyticsPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  });

  const { data: brands, isLoading: loadingBrands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => fetchBrands(20),
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ['trends'],
    queryFn: fetchTrends,
  });

  const { data: ratingDist, isLoading: loadingRating } = useQuery({
    queryKey: ['ratingDist'],
    queryFn: fetchRatingDistribution,
  });

  const totalRatings = ratingDist?.reduce((sum, r) => sum + r.count, 0) ?? 0;
  const fiveStarCount = ratingDist?.find((r) => r.rating === 5)?.count ?? 0;
  const fiveStarPct = totalRatings > 0 ? ((fiveStarCount / totalRatings) * 100).toFixed(1) : '0';
  const weightedSum =
    ratingDist?.reduce((sum, r) => sum + r.rating * r.count, 0) ?? 0;
  const meanRating = totalRatings > 0 ? (weightedSum / totalRatings).toFixed(2) : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">Analytics</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          Dataset statistics, brand analysis, and review trends
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
              {loadingOverview ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} style={{ height: '110px', borderRadius: '12px' }} />
                ))
              ) : (
                <>
                  <KpiCard icon={<Package size={20} color="#2563EB" />} value={overview?.products_count ?? 0} label="Products" iconBg="#EFF6FF" />
                  <KpiCard icon={<FileText size={20} color="#0D9488" />} value={overview?.reviews_count ?? 0} label="Reviews" iconBg="#CCFBF1" />
                  <KpiCard icon={<Star size={20} color="#D97706" />} value={overview?.avg_rating?.toFixed(2) ?? '0'} label="Avg Rating" iconBg="#FFFBEB" />
                  <KpiCard icon={<Users size={20} color="#7C3AED" />} value={overview?.unique_reviewers ?? 0} label="Reviewers" iconBg="#F5F3FF" />
                  <KpiCard icon={<Database size={20} color="#DC2626" />} value={overview?.categories_count ?? 0} label="Categories" iconBg="#FEF2F2" />
                </>
              )}
            </div>

            {/* Categories table */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>Categories</div>
              {loadingCategories ? (
                <Skeleton style={{ height: '200px', borderRadius: '8px' }} />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                      {['Category', 'Products', 'Reviews', 'Avg Rating'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--app-text-muted)', fontSize: '12px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categories?.map((c) => (
                      <tr key={c.category} style={{ borderBottom: '1px solid var(--app-border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.category}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--app-text-muted)' }}>{c.product_count.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--app-text-muted)' }}>{c.review_count.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: '#D97706', fontWeight: 600 }}>{c.avg_rating.toFixed(2)} ★</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>Top Brands by Product Count</div>
              {loadingBrands ? (
                <Skeleton style={{ height: '320px', borderRadius: '8px' }} />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={brands?.slice(0, 15)}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 80 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="brand"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Products']} />
                    <Bar dataKey="product_count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>Brand Details</div>
              {loadingBrands ? (
                <Skeleton style={{ height: '200px', borderRadius: '8px' }} />
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                      {['Brand', 'Products', 'Avg Rating'].map((h) => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600, color: 'var(--app-text-muted)', fontSize: '12px' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {brands?.map((b) => (
                      <tr key={b.brand} style={{ borderBottom: '1px solid var(--app-border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{b.brand}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--app-text-muted)' }}>{b.product_count.toLocaleString()}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: '#D97706', fontWeight: 600 }}>{b.avg_rating.toFixed(2)} ★</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Ratings Tab */}
        <TabsContent value="ratings" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <KpiCard icon={<Star size={20} color="#D97706" />} value={meanRating} label="Mean Rating" iconBg="#FFFBEB" />
              <KpiCard icon={<Star size={20} color="#16A34A" />} value={`${fiveStarPct}%`} label="5-Star Reviews" iconBg="#F0FDF4" />
              <KpiCard icon={<FileText size={20} color="#2563EB" />} value={totalRatings} label="Total Ratings" iconBg="#EFF6FF" />
            </div>

            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>Rating Distribution</div>
              {loadingRating ? (
                <Skeleton style={{ height: '240px', borderRadius: '8px' }} />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={ratingDist?.slice().sort((a, b) => b.rating - a.rating)}
                    layout="vertical"
                    margin={{ top: 0, right: 16, bottom: 0, left: 16 }}
                  >
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                    <YAxis type="category" dataKey="rating" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}★`} />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Reviews']} />
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
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" style={{ marginTop: '16px' }}>
          <div className="ari-card">
            <div className="card-title" style={{ marginBottom: '12px' }}>Monthly Review Volume (Full History)</div>
            {loadingTrends ? (
              <Skeleton style={{ height: '300px', borderRadius: '8px' }} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trends} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
                  <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Reviews']} />
                  <Legend />
                  <Area type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} fill="url(#trendGrad)" name="Reviews" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
