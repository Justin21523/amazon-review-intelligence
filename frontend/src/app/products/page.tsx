'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchRatingDistribution, fetchProductIntelligence } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const RATING_COLORS = ['#DC2626', '#F97316', '#EAB308', '#22C55E', '#16A34A'];
const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { value: 'popularity', label: '熱門度' },
  { value: 'rating_number', label: '評論數' },
  { value: 'avg_rating', label: '平均評分' },
];

export default function ProductsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [offset, setOffset] = useState(0);
  const [sortBy, setSortBy] = useState('popularity');

  const { data: response, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', offset, sortBy],
    queryFn: () => fetchProducts(PAGE_SIZE, offset, sortBy),
  });
  const products = response?.products ?? [];

  const { data: ratingDist } = useQuery({
    queryKey: ['ratingDistribution'],
    queryFn: fetchRatingDistribution,
  });

  const { data: productIntel } = useQuery({
    queryKey: ['productIntel', 8],
    queryFn: () => fetchProductIntelligence(8),
    staleTime: 60_000,
  });

  const quickStats =
    products.length > 0
      ? {
          maxRating: Math.max(...products.map((p) => p.avg_rating)),
          minRating: Math.min(...products.map((p) => p.avg_rating)),
          avgRating: products.reduce((a, p) => a + p.avg_rating, 0) / products.length,
          totalReviews: products.reduce((a, p) => a + p.rating_number, 0),
        }
      : null;

  const ratingPieData = (ratingDist ?? []).map((b, i) => ({
    name: `${b.rating}★`,
    value: b.count,
    color: RATING_COLORS[i] ?? '#6B7280',
  }));

  const reputationBarData = (productIntel ?? []).map((p) => ({
    name: (p.title ?? p.asin).slice(0, 14) + ((p.title ?? p.asin).length > 14 ? '…' : ''),
    score: p.reputation_score,
    tier: p.reputation_tier,
  }));

  const statItems: Array<{ label: string; value: string; color: string }> = quickStats
    ? [
        { label: t('products.stats.max_rating'), value: `${quickStats.maxRating.toFixed(2)} ★`, color: '#16A34A' },
        { label: t('products.stats.min_rating'), value: `${quickStats.minRating.toFixed(2)} ★`, color: '#DC2626' },
        { label: t('products.stats.avg_rating'), value: `${quickStats.avgRating.toFixed(2)} ★`, color: '#2563EB' },
        { label: t('kpi.total_reviews'), value: quickStats.totalReviews.toLocaleString(), color: '#7C3AED' },
      ]
    : [];

  const totalPages = response ? Math.ceil(response.total / PAGE_SIZE) : 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">{t('products.title')}</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>
            {t('products.subtitle')}
            {response?.total ? ` · 共 ${response.total.toLocaleString()} 個商品` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>排序：</span>
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setOffset(0); }}
            style={{
              padding: '5px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
              border: '1px solid var(--app-border)', background: 'var(--app-surface)',
              color: 'var(--app-text)', cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
        {/* Reputation Bar Chart */}
        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '8px' }}>{t('analytics.intel.reputation_chart')}</div>
          {productIntel ? (() => {
            const TIER_COLOR: Record<string, string> = { high: '#16A34A', medium: '#D97706', low: '#6B7280' };
            return (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={reputationBarData} margin={{ top: 0, right: 4, left: -20, bottom: 24 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v) => [Number(v).toFixed(1), '聲譽分數']} />
                  <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                    {reputationBarData.map((d, i) => (
                      <Cell key={i} fill={TIER_COLOR[d.tier] ?? '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            );
          })() : (
            <Skeleton style={{ height: '160px', borderRadius: '8px' }} />
          )}
        </div>

        {/* Rating Distribution Pie Chart */}
        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '8px' }}>{t('analytics.rating_chart.title')}</div>
          {ratingDist ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie
                    data={ratingPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={52}
                    innerRadius={20}
                  >
                    {ratingPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [Number(v ?? 0).toLocaleString(), '評論數']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  marginTop: '6px',
                }}
              >
                {ratingPieData.map((d) => (
                  <span
                    key={d.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--app-text-muted)',
                    }}
                  >
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '2px',
                        background: d.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <Skeleton style={{ height: '160px', borderRadius: '8px' }} />
          )}
        </div>

        {/* Quick Stats */}
        <div className="ari-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className="card-title">{t('products.stats_title')}</div>
          {quickStats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
              {statItems.map((stat) => (
                <div
                  key={stat.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '7px 10px',
                    background: `${stat.color}12`,
                    borderRadius: '6px',
                    borderLeft: `3px solid ${stat.color}`,
                  }}
                >
                  <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                    {stat.label}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: stat.color }}>
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <Skeleton style={{ height: '140px', borderRadius: '8px' }} />
          )}
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} style={{ height: '100px', borderRadius: '10px' }} />
          ))}
        </div>
      ) : (
        <>
          <div
            data-tour="product-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}
          >
            {products.map((p, i) => (
              <ProductCard
                key={p.asin}
                product={{
                  asin: p.asin,
                  title: p.title,
                  avg_rating: p.avg_rating,
                  rating_number: p.rating_number,
                  main_category: p.main_category ?? undefined,
                  rank: offset + i + 1,
                }}
                onClick={() => router.push(`/products/${p.asin}`)}
              />
            ))}
            {isError && (
              <div style={{ gridColumn: '1 / -1', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '20px 24px' }}>
                <p style={{ fontWeight: 600, color: '#DC2626', marginBottom: '8px' }}>{t('products.api_error')}</p>
                <button
                  onClick={() => refetch()}
                  style={{ padding: '6px 14px', borderRadius: '6px', background: '#DC2626', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                >
                  重新載入
                </button>
              </div>
            )}
            {!isError && products.length === 0 && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', color: 'var(--app-text-muted)', gap: '12px' }}>
                <Package size={40} strokeWidth={1.5} style={{ opacity: 0.4 }} />
                <p>{t('products.empty')}</p>
                <button onClick={() => refetch()} style={{ padding: '6px 16px', borderRadius: '6px', background: 'var(--app-brand)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                  重新載入
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', paddingTop: '8px' }}>
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--app-border)',
                  background: 'var(--app-surface)', cursor: offset === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px', fontWeight: 600, opacity: offset === 0 ? 0.4 : 1,
                  color: 'var(--app-text)',
                }}
              >
                <ChevronLeft size={14} /> 上一頁
              </button>
              <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                第 {currentPage} / {totalPages} 頁
              </span>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={!response?.has_more}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid var(--app-border)',
                  background: 'var(--app-surface)', cursor: !response?.has_more ? 'not-allowed' : 'pointer',
                  fontSize: '12px', fontWeight: 600, opacity: !response?.has_more ? 0.4 : 1,
                  color: 'var(--app-text)',
                }}
              >
                下一頁 <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
