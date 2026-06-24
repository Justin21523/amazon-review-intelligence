'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, X, Compass } from 'lucide-react';
import { useTour, STEP_CONFIGS } from './GuidedTourContext';
import SpotlightOverlay from './SpotlightOverlay';
import { useLanguage } from '@/contexts/LanguageContext';

const CARD_W = 340;
const CARD_H = 260;
const MARGIN = 20;

interface CardPos { left: number; top: number; }

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function calcCardPos(rect: DOMRect, side: string): CardPos {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const candidates: Record<string, CardPos> = {
    right:  { left: rect.right + MARGIN,         top: clamp(rect.top, MARGIN, vh - CARD_H - MARGIN) },
    left:   { left: rect.left - CARD_W - MARGIN,  top: clamp(rect.top, MARGIN, vh - CARD_H - MARGIN) },
    bottom: { left: clamp(rect.left, MARGIN, vw - CARD_W - MARGIN), top: rect.bottom + MARGIN },
    center: { left: vw / 2 - CARD_W / 2,         top: vh / 2 - CARD_H / 2 },
  };

  const order = side === 'left'
    ? ['left', 'right', 'bottom', 'center']
    : side === 'right'
    ? ['right', 'left', 'bottom', 'center']
    : ['bottom', 'right', 'left', 'center'];

  for (const dir of order) {
    const pos = candidates[dir];
    if (pos.left >= MARGIN && pos.left + CARD_W <= vw - MARGIN && pos.top >= MARGIN && pos.top + CARD_H <= vh - MARGIN) {
      return pos;
    }
  }
  return candidates.center;
}

// Step-specific mini illustrations
function StepIllustration({ icon, ambientType }: { icon: string; ambientType: string }) {
  return (
    <div style={{
      height: '64px', borderRadius: '10px', margin: '8px 0',
      background: ambientType === 'data-flow'       ? 'linear-gradient(135deg, #EFF6FF, #DBEAFE)' :
                  ambientType === 'star-burst'       ? 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' :
                  ambientType === 'chart-wave'       ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' :
                  ambientType === 'network-pulse'    ? 'linear-gradient(135deg, #F5F3FF, #EDE9FE)' :
                  ambientType === 'embedding-drift'  ? 'linear-gradient(135deg, #FDF4FF, #FAE8FF)' :
                                                       'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '32px', position: 'relative', overflow: 'hidden',
    }}>
      <span style={{ zIndex: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>{icon}</span>
      {/* subtle animated background dots */}
      {[0,1,2].map((i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '40px', height: '40px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.5)',
          left: `${15 + i * 30}%`,
          top: `${10 + (i % 2) * 40}%`,
          animation: `illus-float 2.5s ease-in-out ${i * 0.7}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes illus-float {
          0%, 100% { transform: translateY(0) scale(1); }
          50%       { transform: translateY(-6px) scale(1.15); }
        }
      `}</style>
    </div>
  );
}

export default function FloatingTourAssistant() {
  const { isActive, currentStep, steps, start, next, prev, end } = useTour();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cardPos, setCardPos] = useState<CardPos>(() => ({
    left: typeof window !== 'undefined' ? window.innerWidth - CARD_W - 24 : 800,
    top:  typeof window !== 'undefined' ? window.innerHeight - CARD_H - 24 : 500,
  }));
  const [entering, setEntering] = useState(false);

  const cfg = STEP_CONFIGS.find((s) => s.step === currentStep);
  const stepData = steps.find((s) => s.step === currentStep);
  const totalSteps = STEP_CONFIGS.length;

  // Reposition card whenever step/target changes
  const reposition = useCallback(() => {
    if (!cfg) return;
    const el = document.querySelector(cfg.target);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setCardPos(calcCardPos(rect, cfg.preferredSide));
        return;
      }
    }
    // Fallback: bottom-right
    setCardPos({ left: window.innerWidth - CARD_W - 24, top: window.innerHeight - CARD_H - 24 });
  }, [cfg]);

  const navigateAndHighlight = useCallback((step: number) => {
    const target = STEP_CONFIGS.find((s) => s.step === step);
    if (!target) return;
    const currentPath = pathname.split('?')[0];
    const targetPath = target.route.split('?')[0];
    if (currentPath !== targetPath) {
      router.push(target.route);
    }
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    // After navigation, wait for DOM then scroll + reposition
    highlightTimer.current = setTimeout(() => {
      const el = document.querySelector(target.target);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(reposition, 400);
      }
    }, 500);
  }, [router, pathname, reposition]);

  useEffect(() => {
    if (isActive && cfg) {
      setEntering(true);
      navigateAndHighlight(currentStep);
      setTimeout(() => setEntering(false), 400);
    }
    return () => { if (highlightTimer.current) clearTimeout(highlightTimer.current); };
  }, [isActive, currentStep]);  // eslint-disable-line

  // Reposition on resize
  useEffect(() => {
    window.addEventListener('resize', reposition);
    return () => window.removeEventListener('resize', reposition);
  }, [reposition]);

  // ── Inactive: pulsing launch button ──────────────────────────────────────
  if (!isActive) {
    return (
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000 }}>
        <style>{`
          @keyframes tour-btn-pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4), 0 4px 20px rgba(124,58,237,0.35); }
            50%       { box-shadow: 0 0 0 12px rgba(124,58,237,0), 0 4px 20px rgba(124,58,237,0.35); }
          }
        `}</style>
        <button
          onClick={start}
          title={t('demo.tour.title')}
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #6D28D9, #7C3AED)',
            color: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
            animation: 'tour-btn-pulse 2.4s ease-in-out infinite',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <Compass size={22} />
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.03em' }}>{t('tour.launch')}</span>
        </button>
      </div>
    );
  }

  // ── Active: spotlight + floating card ────────────────────────────────────
  return (
    <>
      {/* Spotlight overlay */}
      {cfg && (
        <SpotlightOverlay
          targetSelector={cfg.target}
          ambientType={cfg.ambientType}
          isActive={isActive}
        />
      )}

      {/* Floating tour card */}
      <div
        style={{
          position: 'fixed',
          left: `${cardPos.left}px`,
          top: `${cardPos.top}px`,
          width: `${CARD_W}px`,
          zIndex: 10002,
          background: 'var(--app-surface, #fff)',
          borderRadius: '16px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.22), 0 2px 8px rgba(124,58,237,0.12)',
          border: '1.5px solid rgba(124,58,237,0.2)',
          overflow: 'hidden',
          opacity: entering ? 0 : 1,
          transform: entering ? 'scale(0.95) translateY(8px)' : 'scale(1) translateY(0)',
          transition: 'opacity 0.25s ease, transform 0.25s ease, left 0.35s cubic-bezier(0.22,1,0.36,1), top 0.35s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #5B21B6, #7C3AED)',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <Compass size={16} color="#fff" style={{ flexShrink: 0 }} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px', flex: 1 }}>
            {t('demo.tour.title')}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: 600 }}>
            {currentStep} / {totalSteps}
          </span>
          <button
            onClick={end}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.75)', padding: '2px', display: 'flex', alignItems: 'center' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '4px', padding: '10px 16px 4px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {STEP_CONFIGS.map((s) => (
            <button
              key={s.step}
              onClick={() => { end(); setTimeout(() => { start(); }, 0); }}
              style={{
                width: s.step === currentStep ? '22px' : '7px',
                height: '7px',
                borderRadius: '4px',
                background: s.step === currentStep ? '#7C3AED' : s.step < currentStep ? '#C4B5FD' : 'rgba(124,58,237,0.15)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '8px 16px 12px' }}>
          {cfg && stepData && (
            <StepIllustration icon={cfg.icon} ambientType={cfg.ambientType} />
          )}
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', padding: '1px 7px', borderRadius: '10px', fontWeight: 700 }}>
              {currentStep} / {totalSteps}
            </span>
            {stepData?.title ?? ''}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', lineHeight: '1.65', margin: 0 }}>
            {stepData?.description ?? ''}
          </p>
        </div>

        {/* Footer nav */}
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--app-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(124,58,237,0.03)',
        }}>
          <button
            onClick={prev}
            disabled={currentStep === 1}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '6px 12px', border: '1px solid var(--app-border)', borderRadius: '8px',
              background: 'var(--app-surface)', fontSize: '12px', fontWeight: 600, cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              color: currentStep === 1 ? 'var(--app-text-muted)' : 'var(--app-text)',
              opacity: currentStep === 1 ? 0.45 : 1,
            }}
          >
            <ChevronLeft size={13} /> {t('tour.prev')}
          </button>

          <button
            onClick={end}
            style={{ padding: '4px 8px', border: 'none', background: 'none', fontSize: '11px', color: 'var(--app-text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t('tour.end')}
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={next}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 14px', border: 'none', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6D28D9, #7C3AED)', color: 'white',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
              }}
            >
              {t('tour.next')} <ChevronRight size={13} />
            </button>
          ) : (
            <button
              onClick={end}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 14px', border: 'none', borderRadius: '8px',
                background: '#16A34A', color: 'white',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              }}
            >
              ✓ {t('tour.end')}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
