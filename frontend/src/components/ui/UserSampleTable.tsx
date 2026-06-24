'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchUserSamples } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserSampleTableProps {
  onSelect: (userId: string) => void;
}

function strategyBadge(reviewCount: number): { label: string; enLabel: string; bg: string; color: string } {
  if (reviewCount >= 50) return { label: '個人化', enLabel: 'Content', bg: '#EFF6FF', color: '#2563EB' };
  if (reviewCount >= 5)  return { label: '混合',   enLabel: 'Hybrid',  bg: '#F5F3FF', color: '#7C3AED' };
  return                        { label: '冷啟動', enLabel: 'Cold',    bg: '#FFFBEB', color: '#D97706' };
}

export default function UserSampleTable({ onSelect }: UserSampleTableProps) {
  const { locale } = useLanguage();
  const { data: users, isLoading } = useQuery({
    queryKey: ['userSamples', 30],
    queryFn: () => fetchUserSamples(60),
    staleTime: 120_000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} style={{ height: '36px', borderRadius: '6px' }} />
        ))}
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <p style={{ fontSize: '13px', color: 'var(--app-text-muted)' }}>
        {locale === 'zh-TW' ? '資料庫中無使用者資料。' : 'No users found in database.'}
      </p>
    );
  }

  // Group by tier for visual separation
  const power  = users.filter(u => u.review_count >= 50);
  const regular = users.filter(u => u.review_count >= 5 && u.review_count < 50);
  const light  = users.filter(u => u.review_count < 5);

  function TierSection({ title, items }: { title: string; items: { user_id: string; review_count: number }[] }) {
    if (!items.length) return null;
    return (
      <div>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--app-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px', marginTop: '10px' }}>
          {title}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px' }}>
          {items.map((u) => {
            const badge = strategyBadge(u.review_count);
            return (
              <button
                key={u.user_id}
                onClick={() => onSelect(u.user_id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '6px',
                  padding: '7px 10px',
                  background: 'var(--app-bg)',
                  border: '1px solid var(--app-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = badge.color;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 0 2px ${badge.color}20`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--app-border)';
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                }}
              >
                <code style={{ fontSize: '10px', color: 'var(--app-text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                  {u.user_id.slice(0, 14)}…
                </code>
                <span style={{ fontSize: '10px', color: 'var(--app-text-muted)', flexShrink: 0 }}>
                  {u.review_count}則
                </span>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: badge.bg, color: badge.color, flexShrink: 0 }}>
                  {locale === 'zh-TW' ? badge.label : badge.enLabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <TierSection
        title={locale === 'zh-TW' ? '⚡ 活躍用戶（個人化推薦）' : '⚡ Power Users (Content-Based)'}
        items={power}
      />
      <TierSection
        title={locale === 'zh-TW' ? '✦ 一般用戶（混合策略）' : '✦ Regular Users (Hybrid)'}
        items={regular}
      />
      <TierSection
        title={locale === 'zh-TW' ? '○ 輕量用戶（冷啟動）' : '○ Light Users (Cold Start)'}
        items={light}
      />
    </div>
  );
}
