'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchProductSummary } from '@/lib/api';
import type { ProductSummary } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function sentimentClass(label: string) {
  const l = label.toLowerCase();
  if (l.includes('positive')) return 'sentiment-positive';
  if (l.includes('negative')) return 'sentiment-negative';
  return 'sentiment-neutral';
}

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#16A34A',
  neutral: '#D97706',
  negative: '#DC2626',
};

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--app-text-muted)' }}>Loading...</div>}>
      <ReviewsPageInner />
    </Suspense>
  );
}

function ReviewsPageInner() {
  const searchParams = useSearchParams();
  const [asin, setAsin] = useState(searchParams.get('asin') ?? '');
  const [summary, setSummary] = useState<ProductSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary(id: string) {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Review Intelligence</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          AI-powered review summaries, pros/cons, and sentiment analysis
        </p>
      </div>

      {/* ASIN input */}
      <div className="ari-card">
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={asin}
            onChange={(e) => setAsin(e.target.value)}
            placeholder="Enter ASIN (e.g. B07XJ8C8F5)"
            onKeyDown={(e) => e.key === 'Enter' && loadSummary(asin)}
            style={{
              flex: 1,
              padding: '9px 14px',
              border: '1px solid var(--app-border)',
              borderRadius: '8px',
              fontSize: '14px',
              background: 'var(--app-bg)',
              outline: 'none',
            }}
          />
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
            }}
          >
            Load
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#DC2626',
            fontSize: '13px',
          }}
        >
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
          {/* Total count badge */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span
              style={{
                background: '#EFF6FF',
                color: '#2563EB',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              {summary.total_reviews.toLocaleString()} reviews analyzed
            </span>
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                color: 'var(--app-text-muted)',
              }}
            >
              {summary.asin}
            </span>
          </div>

          {/* Summary */}
          {summary.summary_text && (
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '10px' }}>Summary</div>
              <p style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--app-text)' }}>
                {summary.summary_text}
              </p>
            </div>
          )}

          {/* Pros / Cons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '10px', color: '#16A34A' }}>
                Pros ({summary.pros.length})
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.pros.map((p, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ color: '#16A34A', fontWeight: 700, flexShrink: 0 }}>✓</span>
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
                Cons ({summary.cons.length})
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {summary.cons.map((c, i) => (
                  <li key={i} style={{ display: 'flex', gap: '8px', fontSize: '13px', lineHeight: 1.5 }}>
                    <span style={{ color: '#DC2626', fontWeight: 700, flexShrink: 0 }}>✗</span>
                    <span>{c}</span>
                  </li>
                ))}
                {summary.cons.length === 0 && (
                  <li style={{ color: 'var(--app-text-muted)', fontSize: '13px' }}>None identified</li>
                )}
              </ul>
            </div>
          </div>

          {/* Sentiment distribution */}
          {Object.keys(summary.sentiment_distribution).length > 0 && (
            <div className="ari-card">
              <div className="card-title" style={{ marginBottom: '12px' }}>Sentiment Breakdown</div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Circles */}
                {Object.entries(summary.sentiment_distribution).map(([label, count]) => {
                  const pct = totalSentiment > 0 ? (count / totalSentiment) * 100 : 0;
                  const color = SENTIMENT_COLORS[label.toLowerCase()] ?? '#6B7280';
                  return (
                    <div
                      key={label}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                    >
                      <div
                        style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '50%',
                          background: color + '20',
                          border: `3px solid ${color}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ fontSize: '14px', fontWeight: 700, color }}>{pct.toFixed(0)}%</span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--app-text-muted)', textTransform: 'capitalize' }}>
                        {label}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
                        {count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
