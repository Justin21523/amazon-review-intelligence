'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export type AmbientType =
  | 'data-flow'
  | 'star-burst'
  | 'chart-wave'
  | 'network-pulse'
  | 'embedding-drift'
  | 'pipeline-box'
  | 'none';

export interface TourStepConfig {
  step: number;
  route: string;
  target: string;
  preferredSide: 'left' | 'right' | 'bottom' | 'center';
  ambientType: AmbientType;
  icon: string;
}

export interface TourStep extends TourStepConfig {
  title: string;
  description: string;
}

export const STEP_CONFIGS: TourStepConfig[] = [
  { step: 1,  route: '/',                      target: '[data-tour="kpi-cards"]',          preferredSide: 'bottom',  ambientType: 'chart-wave',       icon: '📊' },
  { step: 2,  route: '/',                      target: '[data-tour="health-cards"]',        preferredSide: 'bottom',  ambientType: 'data-flow',        icon: '💚' },
  { step: 3,  route: '/',                      target: '[data-tour="recent-queries"]',      preferredSide: 'right',   ambientType: 'data-flow',        icon: '🔥' },
  { step: 4,  route: '/search?q=coffee+maker', target: '[data-tour="search-input"]',        preferredSide: 'bottom',  ambientType: 'data-flow',        icon: '🔍' },
  { step: 5,  route: '/search?q=coffee+maker', target: '[data-tour="search-results"]',      preferredSide: 'left',    ambientType: 'chart-wave',       icon: '📋' },
  { step: 6,  route: '/products',              target: '[data-tour="product-grid"]',        preferredSide: 'bottom',  ambientType: 'chart-wave',       icon: '🛍️' },
  { step: 7,  route: '/reviews',               target: '[data-tour="featured-products"]',    preferredSide: 'bottom',  ambientType: 'star-burst',       icon: '🔎' },
  { step: 8,  route: '/reviews',               target: '[data-tour="featured-products"]',    preferredSide: 'bottom',  ambientType: 'star-burst',       icon: '📈' },
  { step: 9,  route: '/compare',               target: '[data-tour="compare-slots"]',       preferredSide: 'bottom',  ambientType: 'network-pulse',    icon: '⚖️' },
  { step: 10, route: '/recommendations',       target: '[data-tour="user-input"]',          preferredSide: 'right',   ambientType: 'network-pulse',    icon: '✨' },
  { step: 11, route: '/analytics',             target: '[data-tour="analytics-overview"]',  preferredSide: 'bottom',  ambientType: 'chart-wave',       icon: '📉' },
  { step: 12, route: '/analytics',             target: '[data-tour="analytics-tabs"]',      preferredSide: 'bottom',  ambientType: 'chart-wave',       icon: '🏆' },
  { step: 13, route: '/analytics',             target: '[data-tour="analytics-tabs"]',      preferredSide: 'bottom',  ambientType: 'chart-wave',       icon: '📅' },
  { step: 14, route: '/analytics/clusters',    target: '[data-tour="cluster-chart"]',       preferredSide: 'left',    ambientType: 'embedding-drift',  icon: '🔮' },
  { step: 15, route: '/pipeline',              target: '[data-tour="pipeline-nodes"]',      preferredSide: 'bottom',  ambientType: 'pipeline-box',     icon: '⚙️' },
  { step: 16, route: '/evaluation',            target: '[data-tour="eval-metrics"]',        preferredSide: 'left',    ambientType: 'chart-wave',       icon: '🧪' },
];

interface TourCtx {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  configs: TourStepConfig[];
  start: () => void;
  next: () => void;
  prev: () => void;
  end: () => void;
  goTo: (step: number) => void;
}

const TourContext = createContext<TourCtx | null>(null);

export function useTour(): TourCtx {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside GuidedTourProvider');
  return ctx;
}

export function GuidedTourProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const steps: TourStep[] = STEP_CONFIGS.map((cfg) => ({
    ...cfg,
    title: t(`tour.${cfg.step}.title`),
    description: t(`tour.${cfg.step}.desc`),
  }));

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('ari-tour');
      if (saved) {
        const { active, step } = JSON.parse(saved);
        setIsActive(active);
        setCurrentStep(step ?? 1);
      }
    } catch {}
  }, []);

  function persist(active: boolean, step: number) {
    try { sessionStorage.setItem('ari-tour', JSON.stringify({ active, step })); } catch {}
  }

  const navigate = useCallback((step: number) => {
    const cfg = STEP_CONFIGS.find((x) => x.step === step);
    if (cfg) router.push(cfg.route);
  }, [router]);

  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStep(1);
    persist(true, 1);
    navigate(1);
  }, [navigate]);

  const next = useCallback(() => {
    const n = Math.min(currentStep + 1, STEP_CONFIGS.length);
    setCurrentStep(n);
    persist(true, n);
    navigate(n);
  }, [currentStep, navigate]);

  const prev = useCallback(() => {
    const p = Math.max(currentStep - 1, 1);
    setCurrentStep(p);
    persist(true, p);
    navigate(p);
  }, [currentStep, navigate]);

  const end = useCallback(() => {
    setIsActive(false);
    persist(false, 1);
  }, []);

  const goTo = useCallback((step: number) => {
    setCurrentStep(step);
    persist(true, step);
    navigate(step);
  }, [navigate]);

  return (
    <TourContext.Provider value={{ isActive, currentStep, steps, configs: STEP_CONFIGS, start, next, prev, end, goTo }}>
      {children}
    </TourContext.Provider>
  );
}
