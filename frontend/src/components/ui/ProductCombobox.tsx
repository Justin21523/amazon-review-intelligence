'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { fetchProductSuggest } from '@/lib/api';
import type { ProductSuggest } from '@/lib/types';

interface ProductComboboxProps {
  onSelect: (asin: string, title?: string) => void;
  placeholder?: string;
  initialAsin?: string;
  initialTitle?: string;
}

function debounce<T extends (...args: Parameters<T>) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default function ProductCombobox({
  onSelect,
  placeholder = 'Search products by name...',
  initialAsin,
  initialTitle,
}: ProductComboboxProps) {
  const [input, setInput] = useState(initialTitle ?? initialAsin ?? '');
  const [suggestions, setSuggestions] = useState<ProductSuggest[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ProductSuggest | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    debounce(async (q: string) => {
      if (q.trim().length < 2) { setSuggestions([]); return; }
      setLoading(true);
      try {
        const results = await fetchProductSuggest(q.trim(), 10);
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [],
  );

  useEffect(() => {
    if (!selected) search(input);
  }, [input, search, selected]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function pick(item: ProductSuggest) {
    setSelected(item);
    setInput(item.title ?? item.asin);
    setOpen(false);
    setSuggestions([]);
    onSelect(item.asin, item.title ?? undefined);
  }

  function clear() {
    setSelected(null);
    setInput('');
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 14px',
          border: `1px solid ${selected ? 'var(--app-brand)' : 'var(--app-border)'}`,
          borderRadius: '8px',
          background: 'var(--app-bg)',
        }}
      >
        <Search size={15} color="var(--app-text-muted)" style={{ flexShrink: 0 }} />
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setSelected(null); }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: 'var(--app-text)',
          }}
        />
        {loading && (
          <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>...</span>
        )}
        {(input || selected) && (
          <button
            onClick={clear}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <X size={14} color="var(--app-text-muted)" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            zIndex: 100,
            overflow: 'hidden',
            maxHeight: '320px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((item) => (
            <button
              key={item.asin}
              onClick={() => pick(item)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid var(--app-border)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--app-bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--app-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.title ?? item.asin}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', fontFamily: 'monospace' }}>
                  {item.asin}
                  {item.avg_rating != null && ` · ★ ${item.avg_rating.toFixed(1)}`}
                  {item.rating_number != null && ` (${item.rating_number.toLocaleString()})`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
