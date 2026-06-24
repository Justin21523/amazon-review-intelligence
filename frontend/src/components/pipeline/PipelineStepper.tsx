'use client';

import { ChevronLeft, ChevronRight, GitBranch, ChevronUp, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface JourneyStep {
  id: number;
  color: string;
}

const STEP_COLORS = [
  '#6B7280', '#D97706', '#2563EB', '#0D9488',
  '#7C3AED', '#DC2626', '#16A34A', '#F59E0B',
];

interface Props {
  active: number;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
  onGoTo: (n: number) => void;
}

export default function PipelineStepper({ active, total, isOpen, onToggle, onGoTo }: Props) {
  const { t } = useLanguage();
  const color = STEP_COLORS[(active - 1) % STEP_COLORS.length] ?? '#2563EB';

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        title={t('journey.stepper.open')}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '96px',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 18px',
          borderRadius: '28px',
          background: `linear-gradient(135deg, ${color}dd, ${color})`,
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 700,
          boxShadow: `0 4px 20px ${color}50`,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        <GitBranch size={15} />
        <span>{t('journey.stepper.title')}</span>
        <span style={{ opacity: 0.8, fontSize: '12px' }}>
          {active}{t('journey.stepper.of')}{total}
        </span>
        <ChevronUp size={13} style={{ opacity: 0.8 }} />
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '96px',
        zIndex: 999,
        width: '320px',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        border: `1px solid ${color}30`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${color}ee, ${color})`,
          padding: '11px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <GitBranch size={15} color="#fff" style={{ flexShrink: 0 }} />
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', flex: 1 }}>
          {t('journey.stepper.title')}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 600 }}>
          {active} / {total}
        </span>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.85)', padding: '2px', display: 'flex' }}
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Step dots */}
      <div style={{ display: 'flex', gap: '5px', padding: '10px 14px 0', justifyContent: 'center', flexWrap: 'wrap' }}>
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const dotColor = STEP_COLORS[i] ?? '#6B7280';
          return (
            <button
              key={n}
              onClick={() => onGoTo(n)}
              title={t(`journey.${n}.title`)}
              style={{
                width: n === active ? '24px' : '10px',
                height: '10px',
                borderRadius: '5px',
                background: n === active ? dotColor : n < active ? dotColor + '60' : '#E5EAF2',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.22s ease',
              }}
            />
          );
        })}
      </div>

      {/* Step content */}
      <div style={{ padding: '12px 14px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '10px',
            background: color + '18', color,
          }}>
            Stage {active}
          </span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '5px', lineHeight: 1.3 }}>
          {t(`journey.${active}.title`)}
        </div>
        <p style={{ fontSize: '11.5px', color: 'var(--app-text-muted)', lineHeight: 1.65, margin: '0 0 8px' }}>
          {t(`journey.${active}.desc`)}
        </p>
        <div style={{
          fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '6px',
          background: color + '10', color, letterSpacing: '0.02em',
        }}>
          {t(`journey.${active}.tech`)}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 14px 4px' }}>
        <div style={{ height: '3px', borderRadius: '2px', background: '#E5EAF2', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(active / total) * 100}%`,
            background: color,
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Nav buttons */}
      <div style={{
        padding: '8px 14px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={() => onGoTo(Math.max(1, active - 1))}
          disabled={active === 1}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 12px', border: '1px solid var(--app-border)',
            borderRadius: '8px', background: 'white', fontSize: '12px',
            fontWeight: 600, cursor: active === 1 ? 'not-allowed' : 'pointer',
            color: active === 1 ? 'var(--app-text-subtle)' : 'var(--app-text)',
            opacity: active === 1 ? 0.5 : 1,
          }}
        >
          <ChevronLeft size={14} />
          {t('journey.stepper.prev')}
        </button>

        {active < total ? (
          <button
            onClick={() => onGoTo(active + 1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 14px', border: 'none', borderRadius: '8px',
              background: color, color: 'white', fontSize: '12px',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            {t('journey.stepper.next')}
            <ChevronRight size={14} />
          </button>
        ) : (
          <button
            onClick={() => onGoTo(1)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 14px', border: 'none', borderRadius: '8px',
              background: '#16A34A', color: 'white', fontSize: '12px',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            ↺ 重新開始
          </button>
        )}
      </div>
    </div>
  );
}
