'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTopProducts } from '@/lib/api';
import { ChevronDown, Search } from 'lucide-react';

interface Props {
  onSelect: (asin: string, title: string) => void;
  placeholder?: string;
}

export default function ProductSelectDropdown({ onSelect, placeholder = '選擇商品…' }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['topProductsDropdown', 100],
    queryFn: () => fetchTopProducts(100),
    staleTime: Infinity,
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter(
      (p) => p.asin.toLowerCase().includes(q) || (p.title ?? '').toLowerCase().includes(q),
    );
  }, [products, query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '8px 10px', borderRadius: '8px',
          borderWidth: '1.5px', borderStyle: 'solid',
          borderColor: open ? '#7C3AED' : 'var(--app-border)',
          background: 'var(--app-surface)',
          cursor: 'pointer', transition: 'border-color 0.15s',
        }}
      >
        <Search size={13} style={{ color: 'var(--app-text-muted)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onClick={(e) => e.stopPropagation()}
          placeholder={isLoading ? '載入商品中…' : placeholder}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: '12px', color: 'var(--app-text)', minWidth: 0,
          }}
        />
        <ChevronDown
          size={14}
          style={{ color: 'var(--app-text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--app-surface)',
          border: '1.5px solid var(--app-border)',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          maxHeight: '280px', overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--app-text-muted)', fontSize: '12px' }}>
              {isLoading ? '載入中…' : '找不到符合的商品'}
            </div>
          ) : (
            filtered.slice(0, 40).map((p, i) => (
              <button
                key={p.asin}
                onClick={() => {
                  onSelect(p.asin, p.title ?? p.asin);
                  setOpen(false);
                  setQuery('');
                }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', border: 'none', background: 'transparent',
                  cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid var(--app-border)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124,58,237,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text)', lineHeight: 1.3, marginBottom: '2px' }}>
                  {p.title && p.title.length > 2 ? p.title : p.asin}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace' }}>{p.asin}</span>
                  <span style={{ color: '#D97706', fontWeight: 700 }}>★{p.avg_rating.toFixed(1)}</span>
                  <span>{p.rating_number.toLocaleString()} 則</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
