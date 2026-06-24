'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchTopProducts } from '@/lib/api';
import ProductCard from '@/components/ui/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();

  const { data: products, isLoading } = useQuery({
    queryKey: ['topProducts', 20],
    queryFn: () => fetchTopProducts(20),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title">Product Explorer</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          Browse top Home &amp; Kitchen products · click any card to view details
        </p>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} style={{ height: '100px', borderRadius: '10px' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {products?.map((p, i) => (
            <ProductCard
              key={p.asin}
              product={{ ...p, rank: i + 1 }}
              onClick={() => router.push(`/products/${p.asin}`)}
            />
          ))}
          {(!products || products.length === 0) && (
            <div
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '60px 20px',
                color: 'var(--app-text-muted)',
                gap: '12px',
              }}
            >
              <Package size={40} strokeWidth={1.5} style={{ opacity: 0.4 }} />
              <p>No products found. Make sure the API is running.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
