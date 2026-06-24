'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { fetchRecommendations, fetchProduct } from '@/lib/api';
import type { RecommendationResponse } from '@/lib/types';
import ProductCard from '@/components/ui/ProductCard';
import UserSampleTable from '@/components/ui/UserSampleTable';
import ExplanationPanel from '@/components/ui/ExplanationPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, Sparkles, TrendingUp } from 'lucide-react';

export default function RecommendationsPage() {
  const router = useRouter();
  const { t }  = useLanguage();
  const [userId,  setUserId]  = useState('');
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function loadRecommendations(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRecommendations(id.trim(), 10);
      setResults(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }

  function selectUser(id: string) {
    setUserId(id);
    loadRecommendations(id);
  }

  function strategyInfo(strategy: string) {
    if (strategy === 'content_based') return { label: t('reco.strategy.returning'), description: t('reco.strategy.returning.desc'), bg: '#EFF6FF', color: '#2563EB' };
    if (strategy === 'popularity')    return { label: t('reco.strategy.new'),       description: t('reco.strategy.new.desc'),       bg: '#FFFBEB', color: '#D97706' };
    return { label: strategy, description: '', bg: '#F3F4F6', color: '#6B7280' };
  }

  const info = results ? strategyInfo(results.strategy) : null;

  // Seed product fetch for content_based
  const seedAsin = results?.seed_product_asin ?? null;
  const { data: seedProduct } = useQuery({
    queryKey: ['product', seedAsin],
    queryFn: () => fetchProduct(seedAsin!),
    enabled: !!seedAsin,
  });

  // Strategy-switch flash animation
  const prevStrategyRef = useRef<string | null>(null);
  const [strategyFlash, setStrategyFlash] = useState(false);
  useEffect(() => {
    if (results?.strategy) {
      const prev = prevStrategyRef.current;
      prevStrategyRef.current = results.strategy;
      if (prev !== null && prev !== results.strategy) {
        setStrategyFlash(true);
        const timer = setTimeout(() => setStrategyFlash(false), 600);
        return () => clearTimeout(timer);
      }
    }
  }, [results?.strategy]);

  // Derived charts data
  const categoryData = (() => {
    if (!results) return [];
    const map: Record<string, number> = {};
    results.recommendations.forEach((r) => {
      const cat = r.main_category ?? 'Other';
      map[cat] = (map[cat] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const avgRating = results
    ? results.recommendations.reduce((s, r) => s + (r.avg_rating ?? 0), 0) / Math.max(results.recommendations.length, 1)
    : 0;

  const strategyPieData = results
    ? [
        { name: results.strategy === 'content_based' ? t('reco.strategy.returning') : t('reco.strategy.new'), value: 100 },
      ]
    : [];

  const PIE_COLORS = ['#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626', '#16A34A'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">{t('reco.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>{t('reco.subtitle')}</p>
      </div>

      {/* Input card */}
      <div className="ari-card" data-tour="user-input" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder={t('reco.user_placeholder')}
            onKeyDown={(e) => e.key === 'Enter' && loadRecommendations(userId)}
            style={{
              flex: 1,
              padding: '9px 14px',
              border: '1px solid var(--app-border)',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'var(--app-bg)',
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => loadRecommendations(userId)}
            disabled={loading || !userId.trim()}
            style={{
              padding: '9px 20px',
              background: 'var(--app-brand)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: loading || !userId.trim() ? 0.6 : 1,
            }}
          >
            {loading ? t('common.loading_ellipsis') : t('reco.get_recs')}
          </button>
        </div>

        <div>
          <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '10px' }}>{t('reco.active_users')}</p>
          <UserSampleTable onSelect={selectUser} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} style={{ height: '100px', borderRadius: '10px' }} />
          ))}
        </div>
      )}

      {!loading && results && info && (
        <>
          {/* User Profile Card + Strategy Chart */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* User Profile Card */}
            <div
              className="ari-card"
              style={{ background: info.bg, border: `1px solid ${info.color}30` }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: info.color + '20',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <User size={20} color={info.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: info.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                    {t('reco.profile.title')}
                  </div>
                  <code style={{ fontSize: '12px', color: 'var(--app-text-muted)', fontFamily: 'monospace', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {results.user_id}
                  </code>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ padding: '8px 12px', background: info.color + '15', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: info.color }}>{results.user_review_count}</div>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>{t('reco.profile.reviews_count')}</div>
                </div>
                <div style={{ padding: '8px 12px', background: info.color + '15', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: info.color }}>{results.recommendations.length}</div>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>{t('reco.results')}</div>
                </div>
              </div>

              <div style={{ marginTop: '12px' }}>
                <span className={strategyFlash ? 'strategy-flash' : ''} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: info.color + '20', color: info.color, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'inline-block' }}>
                  {info.label}
                </span>
                <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '8px', lineHeight: 1.5 }}>
                  {info.description}
                </p>
              </div>
            </div>

            {/* Recommendation Insights */}
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} color="var(--app-brand)" />
                {t('reco.insights.title')}
              </div>

              {/* Avg rating of recommended items */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '4px' }}>{t('reco.insights.avg_rating')}</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#16A34A' }}>{avgRating.toFixed(2)}</div>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>★ / 5.0</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '4px' }}>{t('reco.strategy_chart.title')}</div>
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: info.bg,
                    border: `1px solid ${info.color}30`,
                  }}>
                    <Sparkles size={16} color={info.color} />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: info.color }}>{info.label}</span>
                  </div>
                </div>
              </div>

              {/* Why explanation */}
              <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', background: '#F9FAFB', padding: '10px 12px', borderRadius: '8px', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--app-text)' }}>💡 {t('reco.insights.why')}</strong>
                <br />
                {results.strategy === 'content_based'
                  ? t('reco.explain.content')
                  : t('reco.explain.popularity')
                }
              </div>
            </div>
          </div>

          {/* Category breakdown chart */}
          {categoryData.length > 0 && (
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>{t('reco.category_breakdown.title')}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'items']} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {categoryData.map((d, idx) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[idx % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--app-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--app-text)' }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Seed product card */}
          {results.strategy === 'content_based' && results.seed_product_asin && (
            <div data-tour="reco-seed" className="ari-card" style={{ background: '#F5F3FF', border: '1px solid #7C3AED30' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', background: '#7C3AED20', borderRadius: '10px', flexShrink: 0 }}>
                  <Sparkles size={18} color="#7C3AED" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>基於你的評論</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {seedProduct?.title ?? results.seed_product_asin}
                  </div>
                  {seedProduct?.avg_rating && (
                    <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '2px' }}>★ {seedProduct.avg_rating.toFixed(1)} · {(seedProduct.rating_number ?? 0).toLocaleString()} 評論</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Product grid with explanation badges + score bars */}
          <div>
            <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--app-text-muted)' }}>
              {results.recommendations.length} {t('reco.results')} ·{' '}
              {results.strategy === 'content_based'
                ? t('reco.similarity_score')
                : t('reco.popularity_score')}{' '}
              {results.strategy === 'content_based' ? '(cosine similarity)' : '(reputation score)'} →
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {results.recommendations.map((p) => {
                const scoreVal = p.vector_score ?? p.rerank_score;
                const isContent = p.explanation_type === 'content_based';
                const scoreColor = isContent ? '#7C3AED' : '#D97706';
                return (
                  <div key={p.asin} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <ProductCard product={p} onClick={() => router.push(`/products/${p.asin}`)} />
                    {p.explanation && (
                      <div style={{ fontSize: '11px', color: scoreColor, padding: '3px 8px', background: isContent ? '#F5F3FF' : '#FFFBEB', borderRadius: '4px', lineHeight: 1.4 }}>
                        💡 {p.explanation}
                      </div>
                    )}
                    {scoreVal != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '0 2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: scoreColor, minWidth: '52px' }}>
                          {isContent ? 'Similarity' : 'Reputation'}
                        </span>
                        <div style={{ flex: 1, height: '4px', background: '#F3F4F6', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: scoreColor, borderRadius: '2px', width: `${Math.min(scoreVal * 100, 100)}%`, transition: 'width 0.4s' }} />
                        </div>
                        <span style={{ fontSize: '9px', color: 'var(--app-text-muted)', minWidth: '36px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {scoreVal.toFixed(3)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <ExplanationPanel title={t('reco.explain.title')}>
        <p style={{ marginTop: '12px' }}><strong>Content-Based</strong> — {t('reco.explain.content')}</p>
        <p style={{ marginTop: '8px' }}><strong>Popularity</strong> — {t('reco.explain.popularity')}</p>
        <p style={{ marginTop: '8px' }}>{t('reco.explain.auto')}</p>
      </ExplanationPanel>
    </div>
  );
}
