'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchTopProducts } from '@/lib/api';
import StarRating from '@/components/ui/StarRating';
import { Skeleton } from '@/components/ui/skeleton';

interface FeaturedProductsGridProps {
  onSelect: (asin: string, title?: string) => void;
  limit?: number;
}

export default function FeaturedProductsGrid({ onSelect, limit = 8 }: FeaturedProductsGridProps) {
  const { data: products, isLoading } = useQuery({
    queryKey: ['topProducts', limit],
    queryFn: () => fetchTopProducts(limit),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} style={{ height: '60px', borderRadius: '8px' }} />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
      {products.map((p) => (
        <button
          key={p.asin}
          onClick={() => onSelect(p.asin, p.title ?? undefined)}
          style={{
            background: 'var(--app-surface)',
            border: '1px solid var(--app-border)',
            borderRadius: '8px',
            padding: '10px 12px',
            textAlign: 'left',
            cursor: 'pointer',
            transition: 'border-color 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--app-brand)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(37,99,235,0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--app-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--app-text)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: '4px',
            }}
          >
            {p.title ?? p.asin}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <StarRating rating={p.avg_rating} />
            <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
              ({p.rating_number.toLocaleString()})
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
