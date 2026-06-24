'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ComposedChart, Area, Line, PieChart, Pie, Legend,
} from 'recharts';
import { fetchProduct, fetchProductSimilar, fetchProductSummary, fetchProductRatingTimeline } from '@/lib/api';
import StarRating from '@/components/ui/StarRating';
import ProductCard from '@/components/ui/ProductCard';
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

function sentimentClass(label?: string) {
  if (!label) return '';
  const l = label.toLowerCase();
  if (l.includes('positive')) return 'sentiment-positive';
  if (l.includes('negative')) return 'sentiment-negative';
  return 'sentiment-neutral';
}

export default function ProductDetailPage() {
  const params = useParams<{ asin: string }>();
  const asin = params.asin;
  const router = useRouter();
  const { t } = useLanguage();

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', asin],
    queryFn: () => fetchProduct(asin),
    enabled: !!asin,
  });

  const { data: similar, isLoading: loadingSimilar } = useQuery({
    queryKey: ['similar', asin],
    queryFn: () => fetchProductSimilar(asin, 6),
    enabled: !!asin,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['summary', asin],
    queryFn: () => fetchProductSummary(asin),
    enabled: !!asin,
  });

  const { data: timeline } = useQuery({
    queryKey: ['timeline', asin],
    queryFn: () => fetchProductRatingTimeline(asin),
    enabled: !!asin,
  });

  const ratingData = product
    ? Object.entries(product.rating_distribution)
        .map(([k, v]) => ({ rating: Number(k), count: v }))
        .sort((a, b) => b.rating - a.rating)
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: 'var(--app-text-muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
        <Link href="/products" style={{ color: 'var(--app-brand)', textDecoration: 'none' }}>
          {t('product.breadcrumb')}
        </Link>
        <span>›</span>
        <span>{asin}</span>
      </div>

      {/* Product header */}
      {loadingProduct ? (
        <Skeleton style={{ height: '120px', borderRadius: '12px' }} />
      ) : product ? (
        <div className="ari-card">
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '6px' }}>
                {product.title ?? asin}
              </h1>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--app-text-muted)' }}>
                <span style={{ fontFamily: 'monospace' }}>{product.asin}</span>
                {product.brand && <span>{t('product.brand')}: <strong>{product.brand}</strong></span>}
                {product.main_category && <span>{product.main_category}</span>}
                {product.price && (
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>
                    ${product.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              {product.avg_rating !== undefined && (
                <StarRating rating={product.avg_rating} />
              )}
              <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>
                {product.rating_number?.toLocaleString()} {t('kpi.reviews')}
              </span>
              {product.reputation_score !== undefined && (
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
                  Rep: {product.reputation_score.toFixed(3)}
                </span>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="ari-card" style={{ color: 'var(--app-text-muted)' }}>{t('product.not_found')}</div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('product.tab.overview')}</TabsTrigger>
          <TabsTrigger value="reviews">{t('product.tab.reviews')}</TabsTrigger>
          <TabsTrigger value="similar">{t('product.tab.similar')}</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Summary */}
            {loadingSummary ? (
              <Skeleton style={{ height: '80px', borderRadius: '12px' }} />
            ) : summary?.summary_text ? (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '8px' }}>{t('product.ai_summary')}</div>
                <p style={{ fontSize: '14px', color: 'var(--app-text)', lineHeight: '1.6' }}>
                  {summary.summary_text}
                </p>
              </div>
            ) : null}

            {/* Pros / Cons */}
            {summary && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="ari-card">
                  <div className="card-title" style={{ marginBottom: '10px', color: '#16A34A' }}>
                    {t('reviews.pros')}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summary.pros.map((p, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                        <span style={{ color: '#16A34A', flexShrink: 0 }}>✓</span>
                        <span>{p}</span>
                      </li>
                    ))}
                    {summary.pros.length === 0 && (
                      <li style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>{t('reviews.none')}</li>
                    )}
                  </ul>
                </div>
                <div className="ari-card">
                  <div className="card-title" style={{ marginBottom: '10px', color: '#DC2626' }}>
                    {t('reviews.cons')}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summary.cons.map((c, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                        <span style={{ color: '#DC2626', flexShrink: 0 }}>✗</span>
                        <span>{c}</span>
                      </li>
                    ))}
                    {summary.cons.length === 0 && (
                      <li style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>{t('reviews.none')}</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Rating Distribution chart */}
            {ratingData.length > 0 && (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>{t('product.rating_dist')}</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={ratingData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="rating"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${v}★`}
                    />
                    <Tooltip formatter={(v) => [Number(v).toLocaleString(), t('kpi.reviews')]} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {ratingData.map((entry) => (
                        <Cell key={entry.rating} fill={RATING_COLORS[entry.rating] ?? '#6B7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sentiment distribution — PieChart */}
            {summary && Object.keys(summary.sentiment_distribution).length > 0 && (() => {
              const SENT_COLORS: Record<string, string> = { positive: '#16A34A', negative: '#DC2626', neutral: '#D97706' };
              const sentData = Object.entries(summary.sentiment_distribution).map(([label, value]) => ({
                name: label, value,
                fill: Object.keys(SENT_COLORS).find(k => label.toLowerCase().includes(k))
                  ? SENT_COLORS[Object.keys(SENT_COLORS).find(k => label.toLowerCase().includes(k))!]
                  : '#6B7280',
              }));
              const total = sentData.reduce((s, d) => s + d.value, 0);
              return (
                <div className="ari-card" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '16px', alignItems: 'center' }}>
                  <div>
                    <div className="card-title" style={{ marginBottom: '8px' }}>{t('product.sentiment_dist')}</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={sentData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={72} paddingAngle={3}>
                          {sentData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} (${((Number(v)/total)*100).toFixed(1)}%)`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sentData.map((d) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.fill, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', fontWeight: 600, color: d.fill, minWidth: '70px', textTransform: 'capitalize' }}>{d.name}</span>
                        <div style={{ flex: 1, height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: d.fill, borderRadius: '3px', width: `${(d.value/total)*100}%` }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--app-text-muted)', minWidth: '50px', textAlign: 'right' }}>{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '4px' }}>共 {total.toLocaleString()} 則評論</div>
                  </div>
                </div>
              );
            })()}

            {/* Monthly rating timeline */}
            {timeline && timeline.length >= 2 && (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>評分趨勢時間軸</div>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={timeline} margin={{ top: 4, right: 20, bottom: 0, left: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} interval="preserveStartEnd" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" domain={[1, 5]} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}★`} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'avg_rating'
                          ? [`${Number(value).toFixed(2)}★`, '平均評分']
                          : [Number(value).toLocaleString(), '評論數']
                      }
                    />
                    <Area yAxisId="left" type="monotone" dataKey="review_count" fill="#BFDBFE" stroke="#2563EB" strokeWidth={1.5} fillOpacity={0.6} name="review_count" />
                    <Line yAxisId="right" type="monotone" dataKey="avg_rating" stroke="#D97706" strokeWidth={2} dot={false} name="avg_rating" />
                  </ComposedChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '3px', background: '#2563EB', display: 'inline-block', borderRadius: '2px' }} />評論量</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '3px', background: '#D97706', display: 'inline-block', borderRadius: '2px' }} />平均評分（右軸）</span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Reviews tab */}
        <TabsContent value="reviews" style={{ marginTop: '16px' }}>
          {loadingProduct ? (
            <Skeleton style={{ height: '200px', borderRadius: '12px' }} />
          ) : (
            <div className="ari-card">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--app-border)' }}>
                    {[t('product.reviews.rating'), t('product.reviews.title'), t('product.reviews.review'), t('product.reviews.sentiment'), t('product.reviews.helpful')].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
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
                  {product?.top_reviews.map((r) => (
                    <tr key={r.review_id} style={{ borderBottom: '1px solid var(--app-border)' }}>
                      <td style={{ padding: '10px' }}>
                        <StarRating rating={r.rating} />
                      </td>
                      <td style={{ padding: '10px', fontWeight: 500, maxWidth: '160px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.title ?? '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px', color: 'var(--app-text-muted)', maxWidth: '300px' }}>
                        <div
                          style={{
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {r.text ?? '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        {r.sentiment_label && (
                          <span
                            className={sentimentClass(r.sentiment_label)}
                            style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}
                          >
                            {r.sentiment_label}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: 'var(--app-text-muted)' }}>
                        {r.helpful_vote ?? 0}
                      </td>
                    </tr>
                  ))}
                  {(!product?.top_reviews || product.top_reviews.length === 0) && (
                    <tr>
                      <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--app-text-muted)' }}>
                        {t('product.no_reviews')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* Similar tab */}
        <TabsContent value="similar" style={{ marginTop: '16px' }}>
          {loadingSimilar ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} style={{ height: '100px', borderRadius: '10px' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {similar?.map((p) => (
                <div key={p.asin} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--app-border)' }}>
                  <ProductCard
                    product={{ ...p, vector_score: undefined }}
                    onClick={() => router.push(`/products/${p.asin}`)}
                  />
                  {p.vector_score != null && (
                    <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #F3F4F6' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, color: '#7C3AED', minWidth: '52px' }}>語意相似</span>
                        <div style={{ flex: 1, height: '5px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#7C3AED', borderRadius: '3px', width: `${p.vector_score * 100}%` }} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#7C3AED' }}>{p.vector_score.toFixed(3)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {(!similar || similar.length === 0) && (
                <div style={{ color: 'var(--app-text-muted)', fontSize: '13px', padding: '20px 0' }}>
                  {t('product.no_similar')}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
