'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchRecommendations } from '@/lib/api';
import type { RecommendationResponse } from '@/lib/types';
import ProductCard from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

const PRESET_USERS = [
  'ABCDEF123456',
  'UVWXYZ789012',
  'GHIJKL345678',
  'MNOPQR901234',
  'STUVWX567890',
];

function strategyBadgeStyle(strategy: string): React.CSSProperties {
  if (strategy === 'content_based') {
    return { background: '#EFF6FF', color: '#2563EB' };
  }
  if (strategy === 'popularity') {
    return { background: '#FFFBEB', color: '#D97706' };
  }
  return { background: '#F3F4F6', color: '#6B7280' };
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function pickRandom() {
    const id = PRESET_USERS[Math.floor(Math.random() * PRESET_USERS.length)];
    setUserId(id);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Recommendations</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          Personalized product recommendations by user ID
        </p>
      </div>

      {/* Input */}
      <div className="ari-card">
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter user ID..."
            onKeyDown={(e) => e.key === 'Enter' && loadRecommendations(userId)}
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
            onClick={pickRandom}
            style={{
              padding: '9px 14px',
              background: 'transparent',
              color: 'var(--app-text-muted)',
              border: '1px solid var(--app-border)',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Random
          </button>
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
            }}
          >
            Get Recommendations
          </button>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Try:</span>
          {PRESET_USERS.map((id) => (
            <button
              key={id}
              onClick={() => {
                setUserId(id);
                loadRecommendations(id);
              }}
              style={{
                padding: '2px 10px',
                border: '1px solid var(--app-border)',
                borderRadius: '12px',
                fontSize: '11px',
                cursor: 'pointer',
                background: 'transparent',
                fontFamily: 'monospace',
                color: 'var(--app-text-muted)',
              }}
            >
              {id}
            </button>
          ))}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} style={{ height: '100px', borderRadius: '10px' }} />
          ))}
        </div>
      )}

      {!loading && results && (
        <div>
          <div
            style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}
          >
            <span
              style={{
                ...strategyBadgeStyle(results.strategy),
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {results.strategy.replace('_', ' ')}
            </span>
            <span style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
              {results.recommendations.length} recommendations for{' '}
              <code style={{ fontFamily: 'monospace', background: 'var(--app-bg)', padding: '1px 4px', borderRadius: '3px' }}>
                {results.user_id}
              </code>
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {results.recommendations.map((p) => (
              <ProductCard
                key={p.asin}
                product={p}
                onClick={() => router.push(`/products/${p.asin}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
