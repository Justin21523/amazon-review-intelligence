'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  Search:     { bg: '#EFF6FF', color: '#2563EB' },
  Review:     { bg: '#F0FDF4', color: '#16A34A' },
  Reco:       { bg: '#FFFBEB', color: '#D97706' },
  Analytics:  { bg: '#F5F3FF', color: '#7C3AED' },
  Tour:       { bg: '#FFF1F2', color: '#E11D48' },
};

interface ScenarioCardProps {
  title: string;
  description: string;
  tag: string;
  icon: ReactNode;
  href: string;
  disabled?: boolean;
  runLabel?: string;
}

export default function ScenarioCard({ title, description, tag, icon, href, disabled, runLabel }: ScenarioCardProps) {
  const router = useRouter();
  const tagStyle = TAG_STYLES[tag] ?? { bg: '#F3F4F6', color: '#6B7280' };

  return (
    <div
      onClick={() => !disabled && router.push(href)}
      style={{
        background: 'var(--app-surface)',
        border: '1px solid var(--app-border)',
        borderRadius: '12px',
        padding: '18px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(37,99,235,0.1)';
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--app-brand)';
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--app-border)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            background: tagStyle.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: tagStyle.color,
          }}
        >
          {icon}
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '10px',
            background: tagStyle.bg,
            color: tagStyle.color,
          }}
        >
          {tag}
        </span>
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-text)', marginBottom: '4px' }}>
          {title}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', lineHeight: '1.5' }}>
          {description}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--app-brand)',
          marginTop: 'auto',
        }}
      >
        {runLabel ?? 'Run Demo'} <ArrowRight size={13} />
      </div>
    </div>
  );
}
