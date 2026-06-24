'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { fetchSearch } from '@/lib/api';
import type { SearchResponse } from '@/lib/types';
import ProductCard from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

type SearchMode = 'bm25' | 'vector' | 'hybrid';

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--app-text-muted)' }}>Loading...</div>}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [mode, setMode] = useState<SearchMode>('hybrid');
  const [k, setK] = useState(10);
  const [alpha, setAlpha] = useState(0.5);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSearch(q.trim(), k, mode, alpha);
      setResults(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  // Auto-search if q param is in URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      runSearch(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.replace(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
      runSearch(query);
    }
  }

  const modeButtons: { label: string; value: SearchMode }[] = [
    { label: 'BM25', value: 'bm25' },
    { label: 'Vector', value: 'vector' },
    { label: 'Hybrid', value: 'hybrid' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Search Lab</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          Compare BM25, vector, and hybrid retrieval
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSubmit} className="ari-card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. coffee maker stainless steel, ASIN B07XJ8C8F5..."
            style={{
              flex: 1,
              padding: '10px 16px',
              border: '1px solid var(--app-border)',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              background: 'var(--app-bg)',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 20px',
              background: 'var(--app-brand)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Search size={16} />
            Search
          </button>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {modeButtons.map((b) => (
              <button
                key={b.value}
                type="button"
                onClick={() => setMode(b.value)}
                style={{
                  padding: '5px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: mode === b.value ? 'var(--app-brand)' : 'transparent',
                  color: mode === b.value ? 'white' : 'var(--app-text-muted)',
                  borderColor: mode === b.value ? 'var(--app-brand)' : 'var(--app-border)',
                  transition: 'all 0.12s',
                }}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* Alpha slider (hybrid only) */}
          {mode === 'hybrid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
              <span>Alpha:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                style={{ width: '100px' }}
              />
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                {alpha.toFixed(1)}
              </span>
            </div>
          )}

          {/* Results count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
            <span>Results:</span>
            <select
              value={k}
              onChange={(e) => setK(Number(e.target.value))}
              style={{
                padding: '4px 8px',
                border: '1px solid var(--app-border)',
                borderRadius: '6px',
                fontSize: '12px',
                background: 'var(--app-bg)',
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>
        </div>
      </form>

      {/* Results */}
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
          {Array.from({ length: k }).map((_, i) => (
            <Skeleton key={i} style={{ height: '100px', borderRadius: '10px' }} />
          ))}
        </div>
      )}

      {!loading && results && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                background: '#EFF6FF',
                color: '#2563EB',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {results.latency_ms.toFixed(1)} ms
            </span>
            <span style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
              {results.total} results for &ldquo;{results.query}&rdquo; · {results.mode.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {results.results.map((product) => (
              <ProductCard
                key={product.asin}
                product={product}
                onClick={() => router.push(`/products/${product.asin}`)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && !results && !error && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '80px 20px',
            color: 'var(--app-text-muted)',
            gap: '12px',
          }}
        >
          <Search size={40} strokeWidth={1.5} style={{ opacity: 0.4 }} />
          <p style={{ fontSize: '14px', textAlign: 'center' }}>
            Enter a query above to search 83,000+ Home &amp; Kitchen products
          </p>
        </div>
      )}
    </div>
  );
}
