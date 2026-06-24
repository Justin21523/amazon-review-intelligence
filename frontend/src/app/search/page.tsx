'use client';

import { useState, useEffect, useRef, useMemo, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, GitCompare } from 'lucide-react';
import { fetchSearch, fetchProductSuggest, fetchRecentQueries } from '@/lib/api';
import type { SearchResponse, ProductHit, ProductSuggest, RecentQuery } from '@/lib/types';
import ProductCard from '@/components/ui/ProductCard';
import PresetChips from '@/components/ui/PresetChips';
import ExplanationPanel from '@/components/ui/ExplanationPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

const PRESET_VALUES = [
  'coffee maker', 'cast iron skillet', 'knife set', 'nonstick pan',
  'silicone spatula', 'insulated bottle', 'wine glass', 'can opener',
  'dutch oven', 'cutting board', 'salad bowl', 'pressure cooker',
];
const PRESET_ZH = [
  '咖啡機', '鑄鐵鍋', '刀具組', '不沾平底鍋',
  '矽膠鏟', '保溫瓶', '紅酒杯', '開罐器',
  '荷蘭鍋', '砧板', '沙拉碗', '壓力鍋',
];

type SearchMode = 'bm25' | 'vector' | 'hybrid';

const MODE_COLORS: Record<SearchMode, string> = { bm25: '#2563EB', vector: '#0D9488', hybrid: '#7C3AED' };

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', color: 'var(--app-text-muted)' }}>Loading...</div>}>
      <SearchPageInner />
    </Suspense>
  );
}

// Returns a rank-diff badge for compare mode
function RankDiffBadge({ diff }: { diff: number | null }) {
  if (diff === null || diff === 0) return null;
  const up    = diff < 0;
  const label = up ? `▲${Math.abs(diff)}` : `▼${Math.abs(diff)}`;
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 700,
      padding: '1px 5px',
      borderRadius: '4px',
      background: up ? '#DCFCE7' : '#FEE2E2',
      color: up ? '#16A34A' : '#DC2626',
      marginLeft: '4px',
    }}>
      {label}
    </span>
  );
}

// Mini score bar used inside compare cards
function ScoreBar({ label, value, color }: { label: string; value?: number; color: string }) {
  if (value == null) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span style={{ fontSize: '9px', fontWeight: 700, color, minWidth: '38px' }}>{label}</span>
      <div style={{ flex: 1, height: '4px', background: '#F3F4F6', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', background: color, borderRadius: '2px', width: `${Math.min(value * 100, 100)}%`, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '9px', color: 'var(--app-text-muted)', minWidth: '32px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {value.toFixed(3)}
      </span>
    </div>
  );
}

// Compare column showing results for one method
function CompareColumn({
  mode,
  results,
  loading,
  referenceAsins,
  router,
  compareAlpha,
  onAlphaChange,
  bm25RankMap,
}: {
  mode: SearchMode;
  results: SearchResponse | null;
  loading: boolean;
  referenceAsins: Set<string>;
  router: ReturnType<typeof useRouter>;
  compareAlpha?: number;
  onAlphaChange?: (v: number) => void;
  bm25RankMap?: Map<string, number>;
}) {
  const { t } = useLanguage();
  const color = MODE_COLORS[mode];

  // Frontend re-rank for hybrid column when alpha changes
  const displayResults = useMemo(() => {
    if (mode !== 'hybrid' || !results?.results || compareAlpha == null) {
      return results?.results ?? [];
    }
    return [...results.results].sort((a, b) => {
      const sa = (1 - compareAlpha) * (a.bm25_score ?? 0) + compareAlpha * (a.vector_score ?? 0);
      const sb = (1 - compareAlpha) * (b.bm25_score ?? 0) + compareAlpha * (b.vector_score ?? 0);
      return sb - sa;
    });
  }, [mode, results, compareAlpha]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Column header */}
      <div style={{
        padding: '10px 14px',
        borderRadius: '10px',
        background: color + '12',
        border: `2px solid ${color}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color }}>{mode.toUpperCase()}</span>
          {results && (
            <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
              {results.latency_ms.toFixed(0)} ms
            </span>
          )}
        </div>
        {/* Alpha slider for hybrid column */}
        {mode === 'hybrid' && onAlphaChange && compareAlpha != null && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color, fontWeight: 600, marginBottom: '3px' }}>
              <span>α 前端重排（不呼叫 API）</span>
              <span>{compareAlpha.toFixed(2)}</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={compareAlpha}
              onChange={e => onAlphaChange(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: color }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--app-text-muted)' }}>
              <span>← 純 BM25</span><span>純向量 →</span>
            </div>
          </div>
        )}
      </div>

      {loading && Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} style={{ height: '88px', borderRadius: '8px' }} />
      ))}

      {!loading && results && displayResults.map((product, idx) => {
        const isShared = referenceAsins.has(product.asin ?? '');
        const bm25Rank = bm25RankMap?.get(product.asin ?? '') ?? null;
        const rankDiff = bm25Rank != null && mode !== 'bm25' ? bm25Rank - (idx + 1) : null;

        return (
          <div key={product.asin} style={{ position: 'relative' }}>
            {/* Shared / exclusive + rank diff badges */}
            <div style={{ position: 'absolute', top: '6px', right: '8px', zIndex: 5, display: 'flex', gap: '3px', alignItems: 'center' }}>
              <RankDiffBadge diff={rankDiff} />
              {isShared ? (
                <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>
                  {t('search.compare.shared')}
                </span>
              ) : (
                <span style={{ fontSize: '8px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: color + '18', color, border: `1px solid ${color}30` }}>
                  {t('search.compare.exclusive')}
                </span>
              )}
            </div>

            <div style={{ border: `1px solid ${isShared ? '#FDE68A' : 'var(--app-border)'}`, borderRadius: '8px', overflow: 'hidden', background: isShared ? '#FFFBEB08' : 'var(--app-surface)' }}>
              <ProductCard
                product={{ ...product, bm25_score: undefined, vector_score: undefined, hybrid_score: undefined }}
                onClick={() => router.push(`/products/${product.asin}`)}
              />
              {/* Score breakdown bars */}
              <div style={{ padding: '6px 12px 8px', borderTop: '1px solid #F3F4F6', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <ScoreBar label="BM25"   value={product.bm25_score}   color="#2563EB" />
                <ScoreBar label="Vector" value={product.vector_score}  color="#0D9488" />
                <ScoreBar label="Hybrid" value={product.hybrid_score}  color="#7C3AED" />
              </div>
            </div>
          </div>
        );
      })}

      {!loading && !results && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--app-text-muted)', fontSize: '12px' }}>
          {t('search.empty')}
        </div>
      )}
    </div>
  );
}

function SearchPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();
  const presets = PRESET_VALUES.map((value, i) => ({
    value,
    label: locale === 'zh-TW' ? PRESET_ZH[i] : value,
  }));

  const [query,       setQuery]       = useState(searchParams.get('q') ?? '');
  const [mode,        setMode]        = useState<SearchMode>('hybrid');
  const [k,           setK]           = useState(10);
  const [alpha,       setAlpha]       = useState(0.5);
  const [minRating,   setMinRating]   = useState(0);
  const [minReviews,  setMinReviews]  = useState(0);
  const [results,     setResults]     = useState<SearchResponse | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  // Compare mode: 3 separate result sets + frontend alpha
  const [bm25Results,   setBm25Results]   = useState<SearchResponse | null>(null);
  const [vectorResults, setVectorResults] = useState<SearchResponse | null>(null);
  const [hybridResults, setHybridResults] = useState<SearchResponse | null>(null);
  const [cmpLoading,    setCmpLoading]    = useState(false);
  const [compareAlpha,  setCompareAlpha]  = useState(0.5);

  // ── Autocomplete state ─────────────────────────────────────────────────
  const [suggestOpen,    setSuggestOpen]    = useState(false);
  const [suggestions,    setSuggestions]    = useState<ProductSuggest[]>([]);
  const [recentQueries,  setRecentQueries]  = useState<RecentQuery[]>([]);
  const suggestRef = useRef<HTMLDivElement>(null);

  // Debounce suggest fetch when query changes
  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchProductSuggest(query, 6);
        setSuggestions(res);
        if (suggestRef.current?.contains(document.activeElement)) {
          setSuggestOpen(true);
        }
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Load recent queries on mount (for hot-search panel)
  useEffect(() => {
    fetchRecentQueries(10).then((rows) => {
      // Deduplicate by query text, keep most recent
      const seen = new Set<string>();
      setRecentQueries(rows.filter((r) => {
        if (seen.has(r.query)) return false;
        seen.add(r.query);
        return true;
      }).slice(0, 8));
    }).catch(() => {});
  }, []);

  // Click-outside to close dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function applySuggest(value: string) {
    setQuery(value);
    setSuggestOpen(false);
    router.replace(`/search?q=${encodeURIComponent(value.trim())}`, { scroll: false });
    if (compareMode) runCompare(value); else runSearch(value);
  }

  async function runSearch(q: string) {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSearch(q.trim(), k, mode, alpha, minRating, minReviews);
      setResults(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  async function runCompare(q: string) {
    if (!q.trim()) return;
    setCmpLoading(true);
    try {
      const [b, v, h] = await Promise.all([
        fetchSearch(q.trim(), 10, 'bm25',   0.5, minRating, minReviews),
        fetchSearch(q.trim(), 10, 'vector', 0.5, minRating, minReviews),
        fetchSearch(q.trim(), 10, 'hybrid', 0.5, minRating, minReviews),
      ]);
      setBm25Results(b);
      setVectorResults(v);
      setHybridResults(h);
    } catch {}
    finally { setCmpLoading(false); }
  }

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); runSearch(q); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestOpen(false);
    router.replace(`/search?q=${encodeURIComponent(query.trim())}`, { scroll: false });
    if (compareMode) {
      runCompare(query);
    } else {
      runSearch(query);
    }
  }

  // Build shared ASIN sets for compare mode
  const bm25Asins   = new Set((bm25Results?.results   ?? []).map((r) => r.asin ?? ''));
  const vectorAsins = new Set((vectorResults?.results ?? []).map((r) => r.asin ?? ''));
  const hybridAsins = new Set((hybridResults?.results ?? []).map((r) => r.asin ?? ''));
  const allShared   = new Set([...bm25Asins].filter((a) => vectorAsins.has(a) && hybridAsins.has(a)));

  // BM25 rank map for rank-diff badges in other columns (BM25 = baseline)
  const bm25RankMap = useMemo(() => {
    const m = new Map<string, number>();
    (bm25Results?.results ?? []).forEach((r, i) => { if (r.asin) m.set(r.asin, i + 1); });
    return m;
  }, [bm25Results]);

  const modeButtons: { label: string; value: SearchMode }[] = [
    { label: 'BM25',   value: 'bm25'   },
    { label: 'Vector', value: 'vector' },
    { label: 'Hybrid', value: 'hybrid' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">{t('search.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>{t('search.subtitle')}</p>
      </div>

      <div className="ari-card" style={{ paddingTop: '14px', paddingBottom: '14px' }}>
        <PresetChips
          chips={presets}
          selected={query}
          label={t('search.try')}
          onSelect={(value) => {
            setQuery(value);
            router.replace(`/search?q=${encodeURIComponent(value)}`, { scroll: false });
            if (compareMode) runCompare(value); else runSearch(value);
          }}
        />
      </div>

      <form onSubmit={handleSubmit} className="ari-card" data-tour="search-input">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          {/* Input with autocomplete dropdown */}
          <div ref={suggestRef} style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSuggestOpen(true); }}
              onFocus={() => setSuggestOpen(true)}
              placeholder={t('search.placeholder')}
              style={{
                width: '100%',
                padding: '10px 16px',
                border: '1px solid var(--app-border)',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                background: 'var(--app-bg)',
                boxSizing: 'border-box',
              }}
            />
            {/* Autocomplete dropdown */}
            {suggestOpen && (query.length < 2 ? recentQueries.length > 0 : suggestions.length > 0) && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                zIndex: 100, overflow: 'hidden',
              }}>
                {query.length < 2 ? (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      🔥 熱門搜尋
                    </div>
                    {recentQueries.map((r) => (
                      <button
                        key={r.query} type="button"
                        onMouseDown={(e) => { e.preventDefault(); applySuggest(r.query); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--app-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Search size={12} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{r.query}</span>
                        <span style={{
                          fontSize: '10px', padding: '1px 6px', borderRadius: '4px',
                          background: r.mode === 'hybrid' ? '#FEF3C7' : r.mode === 'vector' ? '#F5F3FF' : '#EFF6FF',
                          color: r.mode === 'hybrid' ? '#D97706' : r.mode === 'vector' ? '#7C3AED' : '#2563EB',
                          fontWeight: 600,
                        }}>{r.mode}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: '10px', fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      商品建議
                    </div>
                    {suggestions.map((s) => (
                      <button
                        key={s.asin} type="button"
                        onMouseDown={(e) => { e.preventDefault(); applySuggest(s.title ?? s.asin); }}
                        style={{ width: '100%', textAlign: 'left', padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--app-bg)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Search size={12} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title ?? s.asin}</span>
                        {s.avg_rating != null && (
                          <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 600, flexShrink: 0 }}>★ {s.avg_rating.toFixed(1)}</span>
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || cmpLoading}
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
            {t('common.search')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Mode selector (only in normal mode) */}
          {!compareMode && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginRight: '4px' }}>{t('search.mode.label')}</span>
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
                    background: mode === b.value ? MODE_COLORS[b.value] : 'transparent',
                    color: mode === b.value ? 'white' : 'var(--app-text-muted)',
                    borderColor: mode === b.value ? MODE_COLORS[b.value] : 'var(--app-border)',
                    transition: 'all 0.12s',
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}

          {/* Alpha slider (normal mode + hybrid) */}
          {!compareMode && mode === 'hybrid' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
              <span>{t('search.alpha')}</span>
              <input type="range" min={0} max={1} step={0.1} value={alpha} onChange={(e) => setAlpha(Number(e.target.value))} style={{ width: '100px' }} />
              <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{alpha.toFixed(1)}</span>
            </div>
          )}

          {/* Results count (normal mode) */}
          {!compareMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
              <span>{t('search.results_count')}</span>
              <select value={k} onChange={(e) => setK(Number(e.target.value))}
                style={{ padding: '4px 8px', border: '1px solid var(--app-border)', borderRadius: '6px', fontSize: '12px', background: 'var(--app-bg)' }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          )}

          {/* Min Rating filter */}
          {!compareMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
              <span>{t('search.min_rating')}</span>
              <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}
                style={{ padding: '4px 8px', border: '1px solid var(--app-border)', borderRadius: '6px', fontSize: '12px', background: 'var(--app-bg)' }}>
                <option value={0}>{t('search.any')}</option>
                <option value={3.0}>3★+</option>
                <option value={4.0}>4★+</option>
                <option value={4.5}>4.5★+</option>
              </select>
            </div>
          )}

          {/* Min Reviews filter */}
          {!compareMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--app-text-muted)' }}>
              <span>{t('search.min_reviews')}</span>
              <select value={minReviews} onChange={(e) => setMinReviews(Number(e.target.value))}
                style={{ padding: '4px 8px', border: '1px solid var(--app-border)', borderRadius: '6px', fontSize: '12px', background: 'var(--app-bg)' }}>
                <option value={0}>{t('search.any')}</option>
                <option value={2}>2+</option>
                <option value={5}>5+</option>
                <option value={10}>10+</option>
                <option value={20}>20+</option>
              </select>
            </div>
          )}

          {/* Compare mode toggle */}
          <button
            type="button"
            onClick={() => setCompareMode((c) => !c)}
            style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: '1px solid',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              background: compareMode ? '#7C3AED' : 'transparent',
              color: compareMode ? 'white' : '#7C3AED',
              borderColor: '#7C3AED',
              transition: 'all 0.15s',
            }}
          >
            <GitCompare size={14} />
            {compareMode ? t('search.compare.on') : t('search.compare')}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* ── Compare Mode view ── */}
      {compareMode && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div className="card-title" style={{ marginBottom: '4px' }}>{t('search.compare.title')}</div>
            {query && (bm25Results || vectorResults || hybridResults) && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--app-text-muted)' }}>
                <span>{t('search.compare.query_label')} <strong>&ldquo;{query}&rdquo;</strong></span>
                <span style={{ color: '#D97706', fontWeight: 600 }}>
                  {t('search.compare.shared_count').replace('{n}', String(allShared.size))}
                </span>
              </div>
            )}
            {!query && (
              <p style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>{t('search.compare.hint')}</p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <CompareColumn mode="bm25"   results={bm25Results}   loading={cmpLoading} referenceAsins={allShared} router={router} bm25RankMap={bm25RankMap} />
            <CompareColumn mode="vector" results={vectorResults} loading={cmpLoading} referenceAsins={allShared} router={router} bm25RankMap={bm25RankMap} />
            <CompareColumn mode="hybrid" results={hybridResults} loading={cmpLoading} referenceAsins={allShared} router={router} bm25RankMap={bm25RankMap} compareAlpha={compareAlpha} onAlphaChange={setCompareAlpha} />
          </div>
        </div>
      )}

      {/* ── Normal mode view ── */}
      {!compareMode && (
        <>
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {Array.from({ length: k }).map((_, i) => (
                <Skeleton key={i} style={{ height: '100px', borderRadius: '10px' }} />
              ))}
            </div>
          )}

          {!loading && results && (
            <div data-tour="search-results">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '3px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                  {results.latency_ms.toFixed(1)} ms
                </span>
                <span style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
                  {results.total} {t('search.results_summary')} &ldquo;{results.query}&rdquo; · {results.mode.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                {results.results.map((product) => (
                  <ProductCard key={product.asin} product={product} onClick={() => router.push(`/products/${product.asin}`)} />
                ))}
              </div>
            </div>
          )}

          {!loading && !results && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--app-text-muted)', gap: '12px' }}>
              <Search size={40} strokeWidth={1.5} style={{ opacity: 0.4 }} />
              <p style={{ fontSize: '14px', textAlign: 'center' }}>{t('search.empty')}</p>
            </div>
          )}
        </>
      )}

      <ExplanationPanel title={t('search.explain.title')}>
        <p style={{ marginTop: '12px' }}>
          <strong>BM25</strong> — {t('search.explain.bm25')}
        </p>
        <p style={{ marginTop: '8px' }}>
          <strong>Vector</strong> — {t('search.explain.vector')}
        </p>
        <p style={{ marginTop: '8px' }}>
          <strong>Hybrid</strong> — {t('search.explain.hybrid')}
        </p>
      </ExplanationPanel>
    </div>
  );
}
