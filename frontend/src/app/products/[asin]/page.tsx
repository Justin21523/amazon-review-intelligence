'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { fetchProduct, fetchProductSimilar, fetchProductSummary } from '@/lib/api';
import StarRating from '@/components/ui/StarRating';
import ProductCard from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
          Products
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
                {product.brand && <span>Brand: <strong>{product.brand}</strong></span>}
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
                {product.rating_number?.toLocaleString()} reviews
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
        <div className="ari-card" style={{ color: 'var(--app-text-muted)' }}>Product not found.</div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="similar">Similar Products</TabsTrigger>
        </TabsList>

        {/* Overview tab */}
        <TabsContent value="overview" style={{ marginTop: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Summary */}
            {loadingSummary ? (
              <Skeleton style={{ height: '80px', borderRadius: '12px' }} />
            ) : summary?.summary_text ? (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '8px' }}>AI Summary</div>
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
                    Pros
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summary.pros.map((p, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                        <span style={{ color: '#16A34A', flexShrink: 0 }}>✓</span>
                        <span>{p}</span>
                      </li>
                    ))}
                    {summary.pros.length === 0 && (
                      <li style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>None identified</li>
                    )}
                  </ul>
                </div>
                <div className="ari-card">
                  <div className="card-title" style={{ marginBottom: '10px', color: '#DC2626' }}>
                    Cons
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {summary.cons.map((c, i) => (
                      <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px' }}>
                        <span style={{ color: '#DC2626', flexShrink: 0 }}>✗</span>
                        <span>{c}</span>
                      </li>
                    ))}
                    {summary.cons.length === 0 && (
                      <li style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>None identified</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Rating Distribution chart */}
            {ratingData.length > 0 && (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '12px' }}>Rating Distribution</div>
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
                    <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Reviews']} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {ratingData.map((entry) => (
                        <Cell key={entry.rating} fill={RATING_COLORS[entry.rating] ?? '#6B7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Sentiment distribution */}
            {summary && Object.keys(summary.sentiment_distribution).length > 0 && (
              <div className="ari-card">
                <div className="card-title" style={{ marginBottom: '10px' }}>Sentiment Distribution</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {Object.entries(summary.sentiment_distribution).map(([label, count]) => (
                    <span
                      key={label}
                      className={sentimentClass(label)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                      }}
                    >
                      {label}: {count.toLocaleString()}
                    </span>
                  ))}
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
                    {['Rating', 'Title', 'Review', 'Sentiment', 'Helpful'].map((h) => (
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
                        No reviews available
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
                <ProductCard
                  key={p.asin}
                  product={p}
                  onClick={() => router.push(`/products/${p.asin}`)}
                />
              ))}
              {(!similar || similar.length === 0) && (
                <div style={{ color: 'var(--app-text-muted)', fontSize: '13px', padding: '20px 0' }}>
                  No similar products found
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
