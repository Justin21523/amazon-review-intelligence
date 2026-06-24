'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  ComposedChart, Area, Line, Legend,
} from 'recharts';
import { fetchProductSummary, fetchTopProducts, fetchProductRatingTimeline, fetchProductReviews } from '@/lib/api';
import type { ProductSummary, TopReview, ReviewDetail, ReviewsPage } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import ProductSelectDropdown from '@/components/ui/ProductSelectDropdown';
import FeaturedProductsGrid from '@/components/ui/FeaturedProductsGrid';
import ExplanationPanel from '@/components/ui/ExplanationPanel';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThumbsUp, Search, CheckCircle } from 'lucide-react';

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#16A34A',
  neutral: '#D97706',
  negative: '#DC2626',
};

const RATING_COLORS: Record<number, string> = {
  1: '#DC2626', 2: '#F97316', 3: '#D97706', 4: '#84CC16', 5: '#16A34A',
};

const KEYWORD_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#F97316',
];

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'it', 'its', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'our',
  'their', 'we', 'you', 'he', 'she', 'they', 'i', 'me', 'him', 'us', 'them',
  'not', 'no', 'so', 'as', 'if', 'up', 'out', 'very', 'just', 'also', 'can', 'get',
  'got', 'use', 'used', 'using', 'like', 'one', 'two', 'all', 'more', 'new', 'too',
  'what', 'who', 'how', 'when', 'then', 'than', 'over',
]);

function extractKeywords(
  reviews: TopReview[],
): Array<{ word: string; count: number; color: string }> {
  const freq = new Map<string, number>();
  for (const r of reviews) {
    if (!r.text) continue;
    r.text
      .toLowerCase()
      .split(/[\s,.!?;:()"'\-/\\]+/)
      .forEach((raw) => {
        const w = raw.trim();
        if (w.length < 3 || STOP_WORDS.has(w) || /^\d+$/.test(w)) return;
        freq.set(w, (freq.get(w) ?? 0) + 1);
      });
  }
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([word, count], i) => ({
      word,
      count,
      color: KEYWORD_COLORS[i % KEYWORD_COLORS.length],
    }));
}

const SENTIMENT_LABELS: { value: string; label: string; color: string }[] = [
  { value: '',         label: '全部',    color: '#6B7280' },
  { value: 'positive', label: '😊 正面', color: '#16A34A' },
  { value: 'neutral',  label: '😐 中性', color: '#D97706' },
  { value: 'negative', label: '😞 負面', color: '#DC2626' },
];

const SORT_OPTIONS = [
  { value: 'helpful_vote', label: '有用數' },
  { value: 'rating',       label: '評分' },
  { value: 'date',         label: '日期' },
];

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--app-text-muted)' }}>Loading...</div>}>
      <ReviewsPageInner />
    </Suspense>
  );
}

function ReviewsPageInner() {
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [asin, setAsin] = useState(searchParams.get('asin') ?? '');
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Review filter / search state ───────────────────────────────────────
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [sortBy, setSortBy] = useState('helpful_vote');
  const [reviewQuery, setReviewQuery] = useState('');
  const [reviewQueryDebounced, setReviewQueryDebounced] = useState('');
  const [reviewOffset, setReviewOffset] = useState(0);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: topProducts } = useQuery({
    queryKey: ['topProducts', 8],
    queryFn: () => fetchTopProducts(8),
  });

  // Rating timeline query
  const { data: timeline } = useQuery({
    queryKey: ['timeline', asin],
    queryFn: () => fetchProductRatingTimeline(asin),
    enabled: !!asin,
  });

  // Reviews list query (with filter/sort/search)
  const { data: reviewsPage, isFetching: reviewsLoading } = useQuery({
    queryKey: ['reviews', asin, sentimentFilter, sortBy, reviewQueryDebounced, reviewOffset],
    queryFn: () => fetchProductReviews(asin, {
      q: reviewQueryDebounced || undefined,
      sentiment: sentimentFilter || undefined,
      sort_by: sortBy,
      limit: 15,
      offset: reviewOffset,
    }),
    enabled: !!asin && !!summary,
    placeholderData: (prev: ReviewsPage | undefined) => prev,
  });

  // Debounce review text search
  useEffect(() => {
    if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current);
    reviewTimerRef.current = setTimeout(() => {
      setReviewQueryDebounced(reviewQuery);
      setReviewOffset(0);
    }, 350);
    return () => { if (reviewTimerRef.current) clearTimeout(reviewTimerRef.current); };
  }, [reviewQuery]);

  // Reset offset when filters change
  useEffect(() => { setReviewOffset(0); }, [sentimentFilter, sortBy]);

  async function loadSummary(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setSentimentFilter('');
    setSortBy('helpful_vote');
    setReviewQuery('');
    setReviewQueryDebounced('');
    setReviewOffset(0);
    try {
      const data = await fetchProductSummary(id.trim());
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const id = searchParams.get('asin');
    if (id) {
      setAsin(id);
      loadSummary(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSentiment = summary
    ? Object.values(summary.sentiment_distribution).reduce((a, b) => a + b, 0)
    : 0;

  const keywords =
    summary?.top_reviews && summary.top_reviews.length > 0
      ? extractKeywords(summary.top_reviews)
      : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">{t('reviews.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>{t('reviews.subtitle')}</p>
      </div>

      <div className="ari-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <ProductSelectDropdown
              placeholder={t('reviews.search_placeholder')}
              onSelect={(selectedAsin, title) => {
                setAsin(selectedAsin);
                setSelectedTitle(title);
                loadSummary(selectedAsin);
              }}
            />
          </div>
          {asin && (
            <button
              onClick={() => loadSummary(asin)}
              disabled={loading || !asin.trim()}
              style={{
                padding: '9px 20px',
                background: 'var(--app-brand)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0,
                opacity: loading || !asin.trim() ? 0.6 : 1,
              }}
            >
              {loading ? t('common.loading_ellipsis') : t('reviews.analyze')}
            </button>
          )}
        </div>

        <div data-tour="featured-products">
          <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '10px' }}>{t('reviews.featured')}</p>
          <FeaturedProductsGrid
            limit={8}
            onSelect={(selectedAsin, title) => {
              setAsin(selectedAsin);
              setSelectedTitle(title);
              loadSummary(selectedAsin);
            }}
          />
        </div>
      </div>

      {/* 熱門商品快速瀏覽 */}
      {topProducts && topProducts.length > 0 && (
        <div className="ari-card">
          <div className="card-title" style={{ marginBottom: '12px' }}>{t('reviews.quick_browse')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {topProducts.map((p) => {
              const isActive = asin === p.asin;
              return (
                <button
                  key={p.asin}
                  onClick={() => {
                    setAsin(p.asin);
                    setSelectedTitle(p.title);
                    loadSummary(p.asin);
                  }}
                  style={{
                    background: isActive ? 'var(--app-brand)' : 'var(--app-surface)',
                    border: isActive ? '1.5px solid var(--app-brand)' : '1px solid var(--app-border)',
                    borderRadius: '8px', padding: '10px 12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: isActive ? 'white' : 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.title ?? p.asin}
                  </div>
                  <div style={{ marginTop: '5px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.85)' : '#EAB308', fontWeight: 700 }}>
                      ★ {p.avg_rating.toFixed(1)}
                    </span>
                    <span style={{ fontSize: '11px', color: isActive ? 'rgba(255,255,255,0.65)' : 'var(--app-text-muted)' }}>
                      {p.rating_number.toLocaleString()}則
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Skeleton style={{ height: '100px', borderRadius: '12px' }} />
          <Skeleton style={{ height: '160px', borderRadius: '12px' }} />
        </div>
      )}

      {!loading && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '4px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
              {summary.total_reviews.toLocaleString()} {t('reviews.reviews_analyzed')}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--app-text-muted)' }}>{summary.asin}</span>
            {selectedTitle && <span style={{ fontSize: '13px', color: 'var(--app-text)' }}>{selectedTitle}</span>}
          </div>

          {summary.summary_text && (
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '10px' }}>{t('reviews.summary')}</div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--app-text)' }}>{summary.summary_text}</p>
            </div>
          )}

          {/* Rating timeline chart */}
          {timeline && timeline.length >= 2 && (
            <div data-tour="review-timeline" className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>評論趨勢時間軸</div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={timeline} margin={{ top: 4, right: 32, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="reviewGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[1, 5]} tick={{ fontSize: 10, fill: '#D97706' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}★`} />
                  <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(value, name) =>
                    name === 'avg_rating' ? [`${Number(value).toFixed(2)}★`, '平均評分'] : [Number(value).toLocaleString(), '評論數']
                  } />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="review_count" stroke="#2563EB" strokeWidth={2} fill="url(#reviewGrad)" name="評論數" />
                  <Line yAxisId="right" type="monotone" dataKey="avg_rating" stroke="#D97706" strokeWidth={2} dot={false} name="avg_rating" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '10px', color: '#16A34A' }}>
                {t('reviews.pros')} ({summary.pros.length})
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.pros.map((p, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ color: '#16A34A', fontWeight: 700, flexShrink: 0 }}>✓</span>
                    <span>{p}</span>
                  </li>
                ))}
                {summary.pros.length === 0 && <li style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>{t('reviews.none')}</li>}
              </ul>
            </div>
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '10px', color: '#DC2626' }}>
                {t('reviews.cons')} ({summary.cons.length})
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.cons.map((c, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ color: '#DC2626', fontWeight: 700, flexShrink: 0 }}>✗</span>
                    <span>{c}</span>
                  </li>
                ))}
                {summary.cons.length === 0 && <li style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>{t('reviews.none')}</li>}
              </ul>
            </div>
          </div>

          {/* Sentiment + Rating charts row */}
          {Object.keys(summary.sentiment_distribution).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '8px' }}>{t('reviews.sentiment')}</div>
                {(() => {
                  const pieData = Object.entries(summary.sentiment_distribution).map(([label, count]) => ({
                    name: label.charAt(0).toUpperCase() + label.slice(1),
                    value: count,
                    color: SENTIMENT_COLORS[label.toLowerCase()] ?? '#6B7280',
                  }));
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <ResponsiveContainer width={130} height={130}>
                        <PieChart>
                          <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={55} innerRadius={28}>
                            {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v) => [Number(v).toLocaleString(), 'reviews']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                        {pieData.map(d => {
                          const pct = totalSentiment > 0 ? (d.value / totalSentiment) * 100 : 0;
                          return (
                            <div key={d.name}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontSize: '11px', color: d.color, fontWeight: 600 }}>{d.name}</span>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: d.color }}>{pct.toFixed(1)}%</span>
                              </div>
                              <div style={{ height: '5px', background: '#F1F5F9', borderRadius: '3px' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: '3px' }} />
                              </div>
                              <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', textAlign: 'right' }}>{d.value.toLocaleString()} reviews</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {summary.top_reviews && summary.top_reviews.length > 0 && (
                <div className="ari-card">
                  <div className="card-title" style={{ marginBottom: '8px' }}>{t('reviews.rating_dist_title')}</div>
                  {(() => {
                    const counts: Record<number, number> = {1:0, 2:0, 3:0, 4:0, 5:0};
                    summary.top_reviews!.forEach(r => { counts[r.rating] = (counts[r.rating] ?? 0) + 1; });
                    const data = [5,4,3,2,1].map(r => ({ rating: r, count: counts[r] ?? 0 }));
                    return (
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={data} layout="vertical" margin={{ top:0, right:24, bottom:0, left:8 }}>
                          <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                          <YAxis type="category" dataKey="rating" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}★`} />
                          <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(v) => [`${v} reviews`]} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {data.map(d => <Cell key={d.rating} fill={RATING_COLORS[d.rating] ?? '#6B7280'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* ── Filterable reviews list ───────────────────────────────────── */}
          <div data-tour="review-filters" className="ari-card">
            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
              {/* Sentiment filter */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {SENTIMENT_LABELS.map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => setSentimentFilter(value)}
                    style={{
                      padding: '5px 10px', borderRadius: '20px', border: '1px solid',
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
                      background: sentimentFilter === value ? color : 'transparent',
                      color: sentimentFilter === value ? '#fff' : color,
                      borderColor: sentimentFilter === value ? color : `${color}60`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{ padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--app-border)', fontSize: '12px', background: 'var(--app-bg)', color: 'var(--app-text)', cursor: 'pointer' }}
              >
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}排序</option>)}
              </select>

              {/* Text search */}
              <div style={{ flex: 1, minWidth: '160px', position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--app-text-muted)' }} />
                <input
                  type="text"
                  value={reviewQuery}
                  onChange={(e) => setReviewQuery(e.target.value)}
                  placeholder="評論全文搜尋…"
                  style={{ width: '100%', padding: '6px 10px 6px 28px', border: '1px solid var(--app-border)', borderRadius: '8px', fontSize: '12px', background: 'var(--app-bg)', boxSizing: 'border-box' }}
                />
              </div>

              {/* Result count */}
              {reviewsPage && (
                <span style={{ fontSize: '11px', color: 'var(--app-text-muted)', flexShrink: 0 }}>
                  共 {reviewsPage.total.toLocaleString()} 筆
                </span>
              )}
            </div>

            {/* Review list */}
            {reviewsLoading && !reviewsPage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: '80px', borderRadius: '8px' }} />)}
              </div>
            )}

            {reviewsPage && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: reviewsLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                {reviewsPage.reviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--app-text-muted)', fontSize: '13px' }}>
                    無符合條件的評論
                  </div>
                ) : reviewsPage.reviews.map((review: ReviewDetail) => {
                  const color = RATING_COLORS[Math.round(review.rating)] ?? '#6B7280';
                  const sentColor = SENTIMENT_COLORS[review.sentiment_label?.toLowerCase() ?? ''] ?? '#6B7280';
                  return (
                    <div key={review.review_id} style={{ padding: '12px 14px', background: 'var(--app-bg)', borderRadius: '8px', borderLeft: `3px solid ${color}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', color, fontWeight: 700 }}>
                            {'★'.repeat(Math.round(review.rating))}{'☆'.repeat(5 - Math.round(review.rating))}
                          </span>
                          {review.title && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text)' }}>{review.title}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                          {review.sentiment_label && (
                            <span style={{ fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: `${sentColor}15`, color: sentColor, border: `1px solid ${sentColor}30` }}>
                              {review.sentiment_label}
                            </span>
                          )}
                          {review.verified_purchase && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: '#16A34A', fontWeight: 600 }}>
                              <CheckCircle size={10} /> 已驗證
                            </span>
                          )}
                        </div>
                      </div>
                      {review.text && (
                        <p style={{ fontSize: '12px', color: 'var(--app-text)', lineHeight: 1.6, margin: '0 0 8px',
                          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {review.text}
                        </p>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {review.helpful_vote > 0 ? (
                          <span style={{ fontSize: '11px', color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ThumbsUp size={11} />
                            <strong style={{ color: '#2563EB' }}>{review.helpful_vote}</strong> 人覺得有用
                          </span>
                        ) : <span />}
                        {review.date && (
                          <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>{review.date}</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '8px' }}>
                  {reviewOffset > 0 && (
                    <button
                      onClick={() => setReviewOffset(Math.max(0, reviewOffset - 15))}
                      style={{ padding: '7px 18px', border: '1px solid var(--app-border)', borderRadius: '8px', fontSize: '13px', background: 'var(--app-surface)', cursor: 'pointer' }}
                    >
                      ← 上一頁
                    </button>
                  )}
                  {reviewsPage.has_more && (
                    <button
                      onClick={() => setReviewOffset(reviewOffset + 15)}
                      style={{ padding: '7px 18px', background: 'var(--app-brand)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      載入更多 →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 亮點詞雲 */}
          {keywords.length > 0 && (
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>亮點詞雲</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {keywords.map((kw) => (
                  <span
                    key={kw.word}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '20px',
                      background: `${kw.color}18`, border: `1px solid ${kw.color}40`,
                      fontSize: '12px', fontWeight: 600, color: kw.color,
                    }}
                  >
                    {kw.word}
                    <span style={{ fontSize: '10px', fontWeight: 400, color: `${kw.color}99` }}>{kw.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <ExplanationPanel title={t('reviews.explain.title')}>
        <p style={{ marginTop: '12px' }}>{t('reviews.explain.body')}</p>
      </ExplanationPanel>
    </div>
  );
}
