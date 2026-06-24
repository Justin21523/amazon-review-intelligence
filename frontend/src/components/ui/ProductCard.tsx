'use client';

import type { ProductHit } from '@/lib/types';
import StarRating from './StarRating';
import ScoreBar from './ScoreBar';

interface ProductCardProps {
  product: ProductHit;
  onClick?: () => void;
}

export default function ProductCard({ product, onClick }: ProductCardProps) {
  const hasScores =
    product.bm25_score != null ||
    product.vector_score != null ||
    product.hybrid_score != null;

  return (
    <div className="product-card" onClick={onClick} role={onClick ? 'button' : undefined}>
      {product.rank != null && (
        <span
          style={{
            fontSize: '11px',
            color: '#9CA3AF',
            fontWeight: 600,
            marginBottom: '4px',
            display: 'block',
          }}
        >
          #{product.rank}
        </span>
      )}
      <div
        style={{
          fontSize: '13.5px',
          fontWeight: 600,
          color: '#111827',
          lineHeight: '1.4',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: '4px',
        }}
      >
        {product.title ?? 'Untitled Product'}
      </div>
      <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', fontFamily: 'monospace' }}>
        {product.asin}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {product.avg_rating != null && (
          <StarRating rating={product.avg_rating} />
        )}
        {product.rating_number != null && (
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            ({product.rating_number.toLocaleString()} reviews)
          </span>
        )}
        {product.price != null && (
          <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
            ${product.price.toFixed(2)}
          </span>
        )}
      </div>
      {hasScores && (
        <ScoreBar
          bm25={product.bm25_score}
          vector={product.vector_score}
          hybrid={product.hybrid_score}
        />
      )}
    </div>
  );
}
