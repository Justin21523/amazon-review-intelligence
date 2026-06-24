'use client';

interface StarRatingProps {
  rating: number;
  max?: number;
}

export default function StarRating({ rating, max = 5 }: StarRatingProps) {
  const filled = Math.round(rating);
  const stars = Array.from({ length: max }, (_, i) => i < filled);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '1px' }}>
      {stars.map((on, i) => (
        <span
          key={i}
          style={{ color: on ? '#D97706' : '#D1D5DB', fontSize: '14px', lineHeight: 1 }}
        >
          {on ? '★' : '☆'}
        </span>
      ))}
      <span
        style={{
          fontSize: '12px',
          color: '#6B7280',
          marginLeft: '4px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {rating.toFixed(1)}
      </span>
    </span>
  );
}
