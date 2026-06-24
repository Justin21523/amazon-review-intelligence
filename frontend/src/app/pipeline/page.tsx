'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '@/lib/api';
import {
  Database, Cpu, GitBranch, FileText, BarChart3, Activity, ExternalLink,
  Search, ArrowRight, CheckCircle2, XCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import PipelineStepper from '@/components/pipeline/PipelineStepper';

// ── Utility hooks ─────────────────────────────────────────────────────────

function useCounter(target: number, visible: boolean, duration = 1500): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!visible || !target) return;
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const prog = Math.min((ts - startTs) / duration, 1);
      setCount(Math.round(prog * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [visible, target, duration]);
  return count;
}

// ── Static data ───────────────────────────────────────────────────────────

const STAGE_CONFIGS = [
  { id: 1, key: 'raw',       badgeKey: 'source',   bulletKeys: ['pipeline.bullet.raw.1',       'pipeline.bullet.raw.2',       'pipeline.bullet.raw.3'      ] as const, color: '#6B7280', icon: <Database size={18} color="white" />, href: '/pipeline'    },
  { id: 2, key: 'ingest',    badgeKey: 'etl',      bulletKeys: ['pipeline.bullet.ingest.1',    'pipeline.bullet.ingest.2',    'pipeline.bullet.ingest.3'   ] as const, color: '#D97706', icon: <GitBranch size={18} color="white" />, href: '/pipeline'  },
  { id: 3, key: 'warehouse', badgeKey: 'storage',  bulletKeys: ['pipeline.bullet.warehouse.1', 'pipeline.bullet.warehouse.2', 'pipeline.bullet.warehouse.3'] as const, color: '#2563EB', icon: <Database size={18} color="white" />, href: '/analytics' },
  { id: 4, key: 'text',      badgeKey: 'nlp',      bulletKeys: ['pipeline.bullet.text.1',      'pipeline.bullet.text.2',      'pipeline.bullet.text.3'     ] as const, color: '#0D9488', icon: <FileText size={18} color="white" />, href: '/reviews'   },
  { id: 5, key: 'features',  badgeKey: 'ml',       bulletKeys: ['pipeline.bullet.features.1',  'pipeline.bullet.features.2',  'pipeline.bullet.features.3' ] as const, color: '#7C3AED', icon: <Cpu size={18} color="white" />, href: '/evaluation'    },
  { id: 6, key: 'api',       badgeKey: 'api',      bulletKeys: ['pipeline.bullet.api.1',       'pipeline.bullet.api.2',       'pipeline.bullet.api.3'      ] as const, color: '#DC2626', icon: <Activity size={18} color="white" />, href: '/evaluation'},
  { id: 7, key: 'ui',        badgeKey: 'frontend', bulletKeys: ['pipeline.bullet.ui.1',        'pipeline.bullet.ui.2',        'pipeline.bullet.ui.3'       ] as const, color: '#16A34A', icon: <BarChart3 size={18} color="white" />, href: '/demo'     },
];

const TECH_KEYS = ['duckdb', 'transformer', 'bm25', 'fastapi', 'nextjs', 'recharts'] as const;
const TECH_COLORS: Record<string, { color: string; bg: string }> = {
  duckdb:      { color: '#D97706', bg: '#FFFBEB' },
  transformer: { color: '#7C3AED', bg: '#F5F3FF' },
  bm25:        { color: '#2563EB', bg: '#EFF6FF' },
  fastapi:     { color: '#0D9488', bg: '#CCFBF1' },
  nextjs:      { color: '#111827', bg: '#F3F4F6' },
  recharts:    { color: '#DC2626', bg: '#FEF2F2' },
};

const LAYER_CONFIGS = [
  { key: 'data', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', items: ['pipeline.layer.data.1','pipeline.layer.data.2','pipeline.layer.data.3','pipeline.layer.data.4'] as const },
  { key: 'ml',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', items: ['pipeline.layer.ml.1','pipeline.layer.ml.2','pipeline.layer.ml.3','pipeline.layer.ml.4'] as const },
  { key: 'api',  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', items: ['pipeline.layer.api.1','pipeline.layer.api.2','pipeline.layer.api.3','pipeline.layer.api.4'] as const },
];

// Pre-sampled embedding values for the heatmap (deterministic subset of a real 384-dim vector)
const EMBED_SAMPLE = [
  0.32, -0.15,  0.71,  0.08, -0.44,  0.55, -0.12,  0.28,
  0.63, -0.39,  0.17, -0.08,  0.45, -0.62,  0.34,  0.11,
 -0.25,  0.58, -0.41,  0.22,  0.67, -0.18,  0.44, -0.35,
  0.19, -0.72,  0.38, -0.05,  0.53, -0.29,  0.61,  0.14,
 -0.47,  0.36, -0.08,  0.79, -0.21,  0.43, -0.56,  0.25,
  0.88, -0.31,  0.12,  0.49, -0.64,  0.07,  0.38, -0.18,
];

function embedColor(v: number): string {
  const a = Math.min(Math.abs(v), 1);
  if (v > 0) return `rgba(220,38,38,${0.15 + a * 0.7})`;
  return `rgba(37,99,235,${0.15 + a * 0.7})`;
}

// ── Section header helper ─────────────────────────────────────────────────

function SectionHeader({ step, title, tech, color }: { step: number; title: string; tech: string; color: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
        <span style={{
          fontSize: '10px', fontWeight: 800, padding: '3px 10px', borderRadius: '20px',
          background: color + '18', color, letterSpacing: '0.07em', textTransform: 'uppercase',
        }}>
          Stage {step}
        </span>
        <div style={{ height: '1px', flex: 1, background: color + '22' }} />
      </div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--app-text)', margin: '0 0 4px' }}>
        {title}
      </h2>
      <span style={{
        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px',
        background: color + '12', color, display: 'inline-block',
      }}>
        {tech}
      </span>
    </div>
  );
}

const TOTAL_STEPS = 8;

// ── Main component ─────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { t } = useLanguage();
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [stepperOpen, setStepperOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(1);
  const [alpha, setAlpha] = useState(0.5);
  const { data: overview } = useQuery({ queryKey: ['overview'], queryFn: fetchOverview });

  // Section refs
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);
  const ref5 = useRef<HTMLDivElement>(null);
  const ref6 = useRef<HTMLDivElement>(null);
  const ref7 = useRef<HTMLDivElement>(null);
  const ref8 = useRef<HTMLDivElement>(null);

  // Visibility state (set = animate)
  const [visibleSet, setVisibleSet] = useState(new Set<number>());

  useEffect(() => {
    const sectionRefs = [ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8];
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const step = parseInt(entry.target.getAttribute('data-journey-step') ?? '0');
        if (step > 0 && entry.isIntersecting) {
          setVisibleSet(prev => { const n = new Set(prev); n.add(step); return n; });
          setActiveStep(step);
        }
      });
    }, { threshold: 0.2 });
    sectionRefs.forEach(ref => { if (ref.current) obs.observe(ref.current); });
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const productCount = useCounter(overview?.products_count ?? 83119, visibleSet.has(3));
  const reviewCount  = useCounter(overview?.reviews_count  ?? 100000, visibleSet.has(3));

  function goToStep(n: number) {
    setActiveStep(n);
    const el = document.querySelector(`[data-journey-step="${n}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.setAttribute('data-pipeline-active', 'true');
      setTimeout(() => el.removeAttribute('data-pipeline-active'), 1800);
    }
  }

  // Stage 6 hybrid score
  const bm25Score = 0.72;
  const vectorScore = 0.89;
  const hybridScore = +((1 - alpha) * bm25Score + alpha * vectorScore).toFixed(3);

  function sectionStyle(step: number): React.CSSProperties {
    return {
      animation: visibleSet.has(step) ? 'journey-slide-up 0.55s cubic-bezier(0.22,1,0.36,1) both' : 'none',
      scrollMarginTop: '80px',
    };
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', paddingBottom: '120px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">{t('pipeline.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          {t('pipeline.subtitle')}
          {overview && (
            <> · <strong>{overview.products_count.toLocaleString()}</strong> {t('kpi.products')} · <strong>{overview.reviews_count.toLocaleString()}</strong> {t('kpi.reviews')} {t('pipeline.live')}</>
          )}
        </p>
      </div>

      {/* ── Overview: Interactive node flow ─────────────────────────────── */}
      <div className="ari-card" style={{ overflow: 'visible' }}>
        <div className="card-title" style={{ marginBottom: '8px' }}>{t('pipeline.arch_title')}</div>
        <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '20px' }}>
          {t('pipeline.node.hover_hint')}
        </p>
        <div data-tour="pipeline-nodes" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0', alignItems: 'center', overflowX: 'auto', paddingBottom: '20px' }}>
          {STAGE_CONFIGS.map((stage, idx) => {
            const isHovered = hoveredNode === stage.id;
            return (
              <div key={stage.id} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <div
                    onMouseEnter={() => setHoveredNode(stage.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{
                      minWidth: '100px', padding: '14px 10px',
                      background: isHovered ? stage.color + '12' : 'var(--app-surface)',
                      border: `2px solid ${isHovered ? stage.color : 'var(--app-border)'}`,
                      borderRadius: '14px', cursor: 'pointer', textAlign: 'center',
                      animation: `node-float 3s ease-in-out ${idx * 0.4}s infinite`,
                      transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
                      boxShadow: isHovered ? `0 8px 24px ${stage.color}30` : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: stage.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', boxShadow: `0 4px 12px ${stage.color}40` }}>
                      {stage.icon}
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.3, marginBottom: '6px' }}>
                      {t(`pipeline.stage.${stage.key}`)}
                    </div>
                    <span style={{ display: 'inline-block', fontSize: '9px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: stage.color + '20', color: stage.color, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {t(`pipeline.badge.${stage.badgeKey}`)}
                    </span>
                  </div>
                  {isHovered && (
                    <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '12px', width: '200px', background: '#fff', border: `2px solid ${stage.color}`, borderRadius: '12px', padding: '12px 14px', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 200, pointerEvents: 'none' }}>
                      <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `8px solid ${stage.color}` }} />
                      <div style={{ fontSize: '12px', fontWeight: 700, color: stage.color, marginBottom: '6px' }}>{t(`pipeline.stage.${stage.key}`)}</div>
                      <p style={{ fontSize: '11px', color: 'var(--app-text-muted)', margin: '0 0 8px', lineHeight: 1.5 }}>{t(`pipeline.desc.${stage.key}`)}</p>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {stage.bulletKeys.map((bk) => (
                          <li key={bk} style={{ fontSize: '10px', color: 'var(--app-text)', display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
                            <span style={{ color: stage.color, flexShrink: 0 }}>▸</span>
                            <span>{t(bk)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {idx < STAGE_CONFIGS.length - 1 && (
                  <div style={{ width: '24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                    <svg width="24" height="16" viewBox="0 0 24 16"><line x1="0" y1="8" x2="18" y2="8" stroke="#D1D5DB" strokeWidth="1.5" /><polygon points="15,4 23,8 15,12" fill="#D1D5DB" /></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0', marginTop: '4px' }}>
          {STAGE_CONFIGS.map((stage, idx) => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <Link href={stage.href} style={{ fontSize: '10px', color: stage.color, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600, opacity: 0.8 }}>
                  {t('pipeline.node.goto')} <ExternalLink size={9} />
                </Link>
              </div>
              {idx < STAGE_CONFIGS.length - 1 && <div style={{ width: '24px', flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Layer cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        {LAYER_CONFIGS.map((layer) => (
          <div key={layer.key} className="ari-card" style={{ background: layer.bg, border: `1px solid ${layer.border}` }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: layer.color, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{t(`pipeline.layer.${layer.key}`)}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {layer.items.map((key) => (
                <li key={key} style={{ fontSize: '12px', color: layer.color, display: 'flex', gap: '6px' }}>
                  <span style={{ opacity: 0.6 }}>·</span><span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Tech stack */}
      <div>
        <h2 className="section-title" style={{ marginBottom: '14px' }}>{t('pipeline.tech_title')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {TECH_KEYS.map((key) => {
            const { color, bg } = TECH_COLORS[key];
            return (
              <div key={key} className="ari-card" style={{ borderLeft: `3px solid ${color}`, background: bg }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '6px' }}>{t(`pipeline.tech.${key}.name`)}</div>
                <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', lineHeight: '1.6', margin: 0 }}>{t(`pipeline.tech.${key}.desc`)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* JOURNEY SECTIONS                                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0 0' }}>
        <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, transparent, #E5EAF2)' }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          ▼ 資料管道互動旅程
        </span>
        <div style={{ height: '2px', flex: 1, background: 'linear-gradient(90deg, #E5EAF2, transparent)' }} />
      </div>

      {/* ── Stage 1: Raw Data ─────────────────────────────────────────── */}
      <div ref={ref1} id="journey-1" data-journey-step="1" className="ari-card" style={sectionStyle(1)}>
        <SectionHeader step={1} title={t('journey.1.title')} tech={t('journey.1.tech')} color="#6B7280" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left: doc icons */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '14px' }}>資料來源</div>
            {[
              { label: 'amazon_hk_reviews.parquet', icon: '📦', sub: '100K rows · 38 MB', delay: '0.1s' },
              { label: 'products_meta.parquet', icon: '🗂️', sub: '83K products · 12 MB', delay: '0.3s' },
              { label: 'image_embeddings.npy', icon: '🖼️', sub: '83K × 512 dims', delay: '0.5s' },
            ].map((f) => (
              <div key={f.label} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
                background: '#F9FAFB', borderRadius: '10px', marginBottom: '8px',
                border: '1px solid #E5EAF2',
                animation: visibleSet.has(1) ? `journey-slide-left 0.5s ease ${f.delay} both` : 'none',
              }}>
                <span style={{ fontSize: '22px' }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text)', fontFamily: 'monospace' }}>{f.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
          {/* Right: sample row */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '14px' }}>樣本資料欄位</div>
            <div style={{ overflowX: 'auto', borderRadius: '10px', border: '1px solid #E5EAF2' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#F3F4F6' }}>
                    {['asin', 'rating', 'text', 'timestamp'].map((col, ci) => (
                      <th key={col} style={{
                        padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#6B7280',
                        animation: visibleSet.has(1) ? `journey-slide-up 0.4s ease ${(0.1 + ci * 0.08).toFixed(2)}s both` : 'none',
                      }}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { asin: 'B07KXZQ3L8', rating: '⭐⭐⭐⭐⭐', text: 'Excellent quality...', ts: '2023-04' },
                    { asin: 'B08NP6FMGK', rating: '⭐⭐⭐',     text: 'Decent but not...', ts: '2023-06' },
                    { asin: 'B09TY3HMDQ', rating: '⭐⭐⭐⭐',   text: 'Good value for...', ts: '2023-08' },
                  ].map((row, ri) => (
                    <tr key={ri} style={{ borderTop: '1px solid #F3F4F6', background: ri % 2 ? '#FAFAFA' : '#fff' }}>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#2563EB', fontSize: '10px' }}>{row.asin}</td>
                      <td style={{ padding: '6px 10px' }}>{row.rating}</td>
                      <td style={{ padding: '6px 10px', color: 'var(--app-text-muted)' }}>{row.text}</td>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', color: '#6B7280', fontSize: '10px' }}>{row.ts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              {['Amazon HK 2023', 'ASIN unique key', 'UTC timestamps', 'Parquet format'].map(b => (
                <span key={b} style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '12px', background: '#6B728018', color: '#6B7280', fontWeight: 600 }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage 2: Data Cleaning ──────────────────────────────────────── */}
      <div ref={ref2} id="journey-2" data-journey-step="2" className="ari-card" style={sectionStyle(2)}>
        <SectionHeader step={2} title={t('journey.2.title')} tech={t('journey.2.tech')} color="#D97706" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'start' }}>
          {/* BEFORE column */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <XCircle size={13} /> 清理前
            </div>
            {[
              { label: 'HTML 標籤殘留', value: '<b>Great</b> product! <br/>', bad: true },
              { label: '重複評論',       value: 'ASIN B001 × 3 duplicates',   bad: true, dup: true },
              { label: '缺失評分',       value: 'rating: null → 無法使用',   bad: true },
              { label: '無結構化 ID',    value: 'user_123abc (不穩定)',        bad: true },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: '8px', padding: '10px 12px', borderRadius: '8px', background: item.dup ? '#FEF9C3' : '#FEF2F2', border: `1px solid ${item.dup ? '#FDE68A' : '#FECACA'}`, position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#991B1B', marginBottom: '3px' }}>{item.label}</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#7F1D1D', position: 'relative' }}>
                  {item.value}
                  {visibleSet.has(2) && (
                    <div style={{
                      position: 'absolute', top: '50%', left: 0, height: '2px',
                      background: '#DC2626', transform: 'translateY(-50%)',
                      animation: 'bar-grow-width 0.6s ease both',
                      '--bar-target-w': '100%',
                    } as React.CSSProperties} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <ArrowRight size={24} color="#D97706" />
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>normalize</span>
            </div>
          </div>

          {/* AFTER column */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={13} /> 清理後
            </div>
            {[
              { label: '純文字內容',  value: 'Great product!', ok: true },
              { label: '去重完成',    value: '→ 保留最新評論', ok: true },
              { label: '情緒標籤',    value: 'sentiment: positive (0.91)', ok: true },
              { label: 'SHA256 ID',   value: 'review_id: a3f9b2c1...', ok: true },
            ].map((item, i) => (
              <div key={item.label} style={{
                marginBottom: '8px', padding: '10px 12px', borderRadius: '8px',
                background: '#F0FDF4', border: '1px solid #BBF7D0',
                animation: visibleSet.has(2) ? `journey-slide-up 0.4s ease ${(0.15 + i * 0.1).toFixed(2)}s both` : 'none',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#166534', marginBottom: '3px' }}>{item.label}</div>
                <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#166534' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: '16px', padding: '12px 16px', background: '#FFFBEB', borderRadius: '10px', border: '1px solid #FDE68A', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {[
            { icon: '🔢', label: 'word_count 計算', val: '⌀ 47 詞/評論' },
            { icon: '🔑', label: 'SHA256 去重', val: '消除 2.1% 重複' },
            { icon: '💡', label: '情緒分類', val: 'pos/neg/neu 三類' },
            { icon: '📊', label: '評分標準化', val: '1-5 → float 保留' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span>{s.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E' }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: '#B45309' }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stage 3: DuckDB Storage ─────────────────────────────────────── */}
      <div ref={ref3} id="journey-3" data-journey-step="3" className="ari-card" style={sectionStyle(3)}>
        <SectionHeader step={3} title={t('journey.3.title')} tech={t('journey.3.tech')} color="#2563EB" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[
            {
              table: 'products', count: productCount, target: overview?.products_count ?? 83119,
              cols: ['asin (PK)', 'title', 'avg_rating', 'rating_number', 'negative_rate', 'reputation_score'],
              color: '#2563EB',
            },
            {
              table: 'reviews', count: reviewCount, target: overview?.reviews_count ?? 100000,
              cols: ['review_id (PK)', 'asin (FK)', 'user_id', 'rating', 'text', 'sentiment_label'],
              color: '#7C3AED',
            },
          ].map((tbl) => (
            <div key={tbl.table} style={{ border: `2px solid ${tbl.color}30`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ background: tbl.color, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px', fontFamily: 'monospace' }}>{tbl.table}</span>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: 700 }}>
                  {tbl.count.toLocaleString()} <span style={{ fontSize: '10px', opacity: 0.7 }}>rows</span>
                </span>
              </div>
              {/* animated fill bar */}
              <div style={{ height: '4px', background: tbl.color + '20' }}>
                <div style={{
                  height: '100%', background: tbl.color, borderRadius: '2px',
                  animation: visibleSet.has(3) ? 'bar-grow-width 1.5s ease both' : 'none',
                  '--bar-target-w': `${Math.min((tbl.count / tbl.target) * 100, 100)}%`,
                } as React.CSSProperties} />
              </div>
              <div style={{ padding: '12px 14px', background: '#FAFAFA' }}>
                {tbl.cols.map((col, ci) => (
                  <div key={col} style={{
                    fontSize: '11px', fontFamily: 'monospace', padding: '4px 0',
                    borderBottom: ci < tbl.cols.length - 1 ? '1px dashed #E5EAF2' : 'none',
                    color: col.includes('PK') ? tbl.color : col.includes('FK') ? '#0D9488' : 'var(--app-text)',
                    fontWeight: col.includes('PK') || col.includes('FK') ? 700 : 400,
                  }}>
                    {col.replace(' (PK)', ' 🔑').replace(' (FK)', ' 🔗')}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: '💾', label: 'DuckDB · 單檔資料庫', val: '322 MB total' },
            { icon: '⚡', label: '欄位式儲存', val: '聚合查詢極快' },
            { icon: '🔍', label: 'SQL + Python API', val: '雙介面存取' },
          ].map(s => (
            <div key={s.label} style={{ padding: '8px 14px', borderRadius: '10px', background: '#EFF6FF', border: '1px solid #BFDBFE', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '18px' }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E40AF' }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: '#3B82F6' }}>{s.val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stage 4: BM25 Indexing ──────────────────────────────────────── */}
      <div ref={ref4} id="journey-4" data-journey-step="4" className="ari-card" style={sectionStyle(4)}>
        <SectionHeader step={4} title={t('journey.4.title')} tech={t('journey.4.tech')} color="#0D9488" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: tokenization flow */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>分詞過程</div>
            {/* Input */}
            <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: '10px', border: '2px solid #0D9488', marginBottom: '12px', fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#0D9488', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Search size={16} color="#0D9488" />
              &quot;cast iron skillet&quot;
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '12px' }}>↓ Tokenizer + TF-IDF 權重</div>
            {/* Tokens */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[
                { token: 'cast', idf: '8.1', delay: '0.1s' },
                { token: 'iron', idf: '6.3', delay: '0.3s' },
                { token: 'skillet', idf: '9.8', delay: '0.5s' },
              ].map(({ token, idf, delay }) => (
                <div key={token} style={{
                  padding: '8px 14px', borderRadius: '8px',
                  background: '#CCFBF1', border: '2px solid #0D9488',
                  animation: visibleSet.has(4) ? `token-pop 0.4s ease ${delay} both` : 'none',
                }}>
                  <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#0D9488' }}>{token}</div>
                  <div style={{ fontSize: '9px', color: '#14B8A6', fontWeight: 600 }}>IDF: {idf}</div>
                </div>
              ))}
            </div>
            {/* BM25 formula */}
            <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: '10px', border: '1px solid #99F6E4' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#0D9488', marginBottom: '6px' }}>BM25 公式</div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#134E4A' }}>
                score(d,q) = Σ IDF(t) · TF(t,d) · (k₁+1) / (TF + k₁·(1-b+b·|d|/avgdl))
              </div>
              <div style={{ fontSize: '10px', color: '#14B8A6', marginTop: '4px' }}>k₁=1.5 · b=0.75 · avgdl=47</div>
            </div>
          </div>

          {/* Right: inverted index */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>倒排索引（部分）</div>
            <div style={{ borderRadius: '10px', border: '1px solid #99F6E4', overflow: 'hidden' }}>
              <div style={{ background: '#0D9488', padding: '8px 12px', display: 'grid', gridTemplateColumns: '80px 1fr 60px', gap: '8px' }}>
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>Term</span>
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>文件列表</span>
                <span style={{ color: '#fff', fontSize: '10px', fontWeight: 700 }}>文件數</span>
              </div>
              {[
                { term: 'cast',    docs: 'B0NK7R…, B08XQ…, B07KX…', count: '8,142' },
                { term: 'iron',    docs: 'B07KX…, B0NK7R…, B09HS…', count: '11,307' },
                { term: 'skillet', docs: 'B07KX…, B09HS…, B0NK7R…', count: '4,218' },
                { term: 'pan',     docs: 'B08NP…, B09TY…, B07KX…', count: '15,634' },
              ].map((row, ri) => (
                <div key={row.term} style={{ padding: '8px 12px', background: ri % 2 ? '#F0FDF4' : '#fff', display: 'grid', gridTemplateColumns: '80px 1fr 60px', gap: '8px', alignItems: 'center', borderTop: '1px solid #CCFBF1' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0D9488', fontSize: '12px' }}>{row.term}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--app-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>[{row.docs}]</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#134E4A', textAlign: 'right' }}>{row.count}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', padding: '10px 14px', background: '#CCFBF1', borderRadius: '10px', border: '1px solid #99F6E4' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#134E4A' }}>最高分文件：B07KXZQ3L8</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <div style={{ flex: 1, height: '8px', background: '#E5EAF2', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#0D9488', borderRadius: '4px',
                    animation: visibleSet.has(4) ? 'bar-grow-width 1s ease both 0.8s' : 'none',
                    '--bar-target-w': '84%',
                  } as React.CSSProperties} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0D9488', minWidth: '42px' }}>0.842</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage 5: Vector Embeddings ──────────────────────────────────── */}
      <div ref={ref5} id="journey-5" data-journey-step="5" className="ari-card" style={sectionStyle(5)}>
        <SectionHeader step={5} title={t('journey.5.title')} tech={t('journey.5.tech')} color="#7C3AED" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: encoding pipeline */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>向量編碼流程</div>
            {/* Input */}
            <div style={{ padding: '10px 14px', background: '#F5F3FF', borderRadius: '10px', border: '2px solid #7C3AED', marginBottom: '12px', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#7C3AED' }}>
              &quot;cast iron skillet 12 inch pan&quot;
            </div>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'inline-block', padding: '8px 20px', background: '#7C3AED', borderRadius: '10px', color: '#fff', fontSize: '12px', fontWeight: 700, boxShadow: `0 4px 16px #7C3AED50`, animation: visibleSet.has(5) ? 'node-float 3s ease-in-out infinite' : 'none' }}>
                🤖 all-MiniLM-L6-v2
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '10px' }}>↓ 384 維正規化向量</div>
            {/* Embedding heatmap */}
            <div style={{ background: '#F5F3FF', borderRadius: '10px', padding: '12px', border: '1px solid #DDD6FE' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#7C3AED', marginBottom: '8px' }}>嵌入向量熱圖（前 48 維 / 384 維）</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '2px' }}>
                {EMBED_SAMPLE.map((v, i) => (
                  <div key={i} title={v.toFixed(3)} style={{
                    height: '20px', borderRadius: '3px',
                    background: embedColor(v),
                    animation: visibleSet.has(5) ? `embed-block-in 0.3s ease ${(0.02 * i).toFixed(2)}s both` : 'none',
                    transformOrigin: 'bottom',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '9px', color: '#7C3AED', opacity: 0.6 }}>
                <span>← 負值 (藍)</span><span>0</span><span>正值 (紅) →</span>
              </div>
            </div>
          </div>

          {/* Right: similarity results */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>餘弦相似度結果</div>
            {[
              { title: 'Cast Iron Skillet 12"', sim: 0.94, asin: 'B07KX', brand: 'Lodge' },
              { title: 'Pre-Seasoned Iron Pan', sim: 0.87, asin: 'B09HS', brand: 'Calphalon' },
              { title: 'Carbon Steel Wok 14"', sim: 0.81, asin: 'B0NK7', brand: 'Craft' },
            ].map((r, ri) => (
              <div key={r.asin} style={{ marginBottom: '10px', padding: '12px 14px', background: '#F5F3FF', borderRadius: '10px', border: '1px solid #DDD6FE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text)' }}>{r.title}</div>
                    <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', fontFamily: 'monospace' }}>{r.asin} · {r.brand}</div>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: '#7C3AED' }}>{r.sim}</span>
                </div>
                <div style={{ height: '6px', background: '#E5EAF2', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: '#7C3AED', borderRadius: '3px',
                    animation: visibleSet.has(5) ? `bar-grow-width 0.8s ease ${(0.2 + ri * 0.15).toFixed(2)}s both` : 'none',
                    '--bar-target-w': `${r.sim * 100}%`,
                  } as React.CSSProperties} />
                </div>
              </div>
            ))}
            <div style={{ padding: '10px 14px', background: '#EDE9FE', borderRadius: '10px', border: '1px solid #C4B5FD' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#5B21B6', marginBottom: '4px' }}>向量儲存</div>
              <div style={{ fontSize: '10px', color: '#7C3AED' }}>DuckDB FLOAT[] 欄位 · 83,119 向量 · 12M 浮點數</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage 6: Hybrid Search ──────────────────────────────────────── */}
      <div ref={ref6} id="journey-6" data-journey-step="6" className="ari-card" style={sectionStyle(6)}>
        <SectionHeader step={6} title={t('journey.6.title')} tech={t('journey.6.tech')} color="#DC2626" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left: score bars */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>搜尋查詢：&quot;coffee maker&quot;</div>
            {[
              { label: 'BM25 (詞彙匹配)', score: bm25Score, color: '#2563EB', icon: '📝' },
              { label: 'Vector (語意相似)', score: vectorScore, color: '#7C3AED', icon: '🧠' },
            ].map(({ label, score, color, icon }) => (
              <div key={label} style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text)' }}>{icon} {label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 800, color }}>{score.toFixed(2)}</span>
                </div>
                <div style={{ height: '10px', background: '#F3F4F6', borderRadius: '5px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: color, borderRadius: '5px',
                    animation: visibleSet.has(6) ? 'bar-grow-width 0.8s ease both' : 'none',
                    '--bar-target-w': `${score * 100}%`,
                  } as React.CSSProperties} />
                </div>
              </div>
            ))}

            {/* Alpha slider */}
            <div style={{ padding: '14px', background: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>混合比例 α</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#DC2626' }}>{alpha.toFixed(2)}</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.01"
                value={alpha}
                onChange={e => setAlpha(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#DC2626' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6B7280', marginTop: '4px' }}>
                <span>0 = 純 BM25</span><span>1 = 純向量</span>
              </div>
            </div>

            {/* Hybrid score */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>⚡ Hybrid (α={alpha.toFixed(2)})</span>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626' }}>{hybridScore.toFixed(3)}</span>
              </div>
              <div style={{ height: '12px', background: '#FEE2E2', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '6px',
                  background: 'linear-gradient(90deg, #2563EB, #DC2626)',
                  width: `${hybridScore * 100}%`,
                  transition: 'width 0.2s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Right: formula + top results */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>混合公式</div>
            <div style={{ padding: '14px', background: '#F9FAFB', borderRadius: '12px', border: '1px solid #E5EAF2', marginBottom: '16px', fontFamily: 'monospace' }}>
              <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: 700, marginBottom: '8px' }}>HybridRanker.score()</div>
              <div style={{ fontSize: '11px', color: '#374151', lineHeight: 2 }}>
                bm25_norm = (s - min) / (max - min)<br />
                vec_norm  = (s - min) / (max - min)<br />
                score = (1-α) · bm25_norm + α · vec_norm<br />
                <span style={{ color: '#DC2626' }}>= (1-{alpha.toFixed(2)}) · {bm25Score} + {alpha.toFixed(2)} · {vectorScore}</span><br />
                <span style={{ color: '#DC2626', fontWeight: 800 }}>= {hybridScore.toFixed(3)}</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '10px' }}>Top 3 結果</div>
            {[
              { title: 'Coffee Maker Drip 12-Cup', score: 0.91, asin: 'B08N' },
              { title: 'Espresso Machine Auto', score: 0.84, asin: 'B07C' },
              { title: 'French Press Coffee Set', score: 0.79, asin: 'B09X' },
            ].map((r, ri) => (
              <div key={r.asin} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#fff', borderRadius: '8px', border: '1px solid #FEE2E2', marginBottom: '8px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#DC2626', minWidth: '20px' }}>#{ri + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text)' }}>{r.title}</div>
                  <div style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--app-text-muted)' }}>{r.asin}</div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#DC2626' }}>{r.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stage 7: Recommendation System ─────────────────────────────── */}
      <div ref={ref7} id="journey-7" data-journey-step="7" className="ari-card" style={sectionStyle(7)}>
        <SectionHeader step={7} title={t('journey.7.title')} tech={t('journey.7.tech')} color="#16A34A" />
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
          {/* Decision tree SVG */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>推薦策略決策樹</div>
            <svg viewBox="0 0 420 280" style={{ width: '100%', maxHeight: '260px' }}>
              {/* User node */}
              <rect x="155" y="10" width="110" height="42" rx="10" fill="#16A34A" />
              <text x="210" y="28" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">用戶請求</text>
              <text x="210" y="44" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10">User Request</text>

              {/* Branch paths */}
              <path
                d="M 210 52 L 210 80 L 105 80 L 105 128"
                fill="none" stroke="#16A34A" strokeWidth="2"
                strokeDasharray="120" strokeDashoffset={visibleSet.has(7) ? 0 : 120}
                style={{ transition: 'stroke-dashoffset 0.8s ease 0.2s' }}
              />
              <path
                d="M 210 52 L 210 80 L 315 80 L 315 128"
                fill="none" stroke="#D97706" strokeWidth="2"
                strokeDasharray="120" strokeDashoffset={visibleSet.has(7) ? 0 : 120}
                style={{ transition: 'stroke-dashoffset 0.8s ease 0.4s' }}
              />

              {/* Branch labels */}
              <text x="155" y="78" textAnchor="middle" fill="#16A34A" fontSize="10" fontWeight="700">評論 ≥ 5 篇</text>
              <text x="265" y="78" textAnchor="middle" fill="#D97706" fontSize="10" fontWeight="700">評論 &lt; 5 篇</text>

              {/* Content-Based box */}
              <rect x="35" y="128" width="140" height="50" rx="10" fill="#F0FDF4" stroke="#16A34A" strokeWidth="2" />
              <text x="105" y="148" textAnchor="middle" fill="#16A34A" fontSize="12" fontWeight="800">協同過濾</text>
              <text x="105" y="163" textAnchor="middle" fill="#16A34A" fontSize="10">Content-Based</text>
              <text x="105" y="175" textAnchor="middle" fill="#6B7280" fontSize="9">Embedding 相似度</text>

              {/* Cold-Start box */}
              <rect x="245" y="128" width="140" height="50" rx="10" fill="#FFFBEB" stroke="#D97706" strokeWidth="2" />
              <text x="315" y="148" textAnchor="middle" fill="#D97706" fontSize="12" fontWeight="800">冷啟動</text>
              <text x="315" y="163" textAnchor="middle" fill="#D97706" fontSize="10">Cold-Start</text>
              <text x="315" y="175" textAnchor="middle" fill="#6B7280" fontSize="9">人氣排行 + 分類</text>

              {/* Down arrows */}
              <path d="M 105 178 L 105 208" fill="none" stroke="#16A34A" strokeWidth="2"
                strokeDasharray="30" strokeDashoffset={visibleSet.has(7) ? 0 : 30}
                style={{ transition: 'stroke-dashoffset 0.5s ease 0.8s' }}
              />
              <path d="M 315 178 L 315 208" fill="none" stroke="#D97706" strokeWidth="2"
                strokeDasharray="30" strokeDashoffset={visibleSet.has(7) ? 0 : 30}
                style={{ transition: 'stroke-dashoffset 0.5s ease 0.9s' }}
              />

              {/* Result boxes */}
              <rect x="35" y="208" width="140" height="34" rx="8" fill="#16A34A" />
              <text x="105" y="229" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">個人化商品列表</text>

              <rect x="245" y="208" width="140" height="34" rx="8" fill="#D97706" />
              <text x="315" y="229" textAnchor="middle" fill="white" fontSize="11" fontWeight="700">熱門商品列表</text>
            </svg>
          </div>

          {/* Right: example user cards */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>使用者範例</div>
            {[
              { reviews: 62, style: '正面評論者', strategy: '協同過濾', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: '🏆', desc: '大量歷史記錄 → 精準個人化' },
              { reviews: 1,  style: '新用戶',     strategy: '冷啟動',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: '🌱', desc: '冷啟動 → 人氣商品推薦' },
            ].map((u) => (
              <div key={u.reviews} style={{ padding: '14px', background: u.bg, borderRadius: '12px', border: `2px solid ${u.border}`, marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '24px' }}>{u.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: u.color }}>{u.reviews} 篇評論</div>
                    <div style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>{u.style}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: '8px', background: u.color, color: '#fff', fontSize: '11px', fontWeight: 700 }}>{u.strategy}</span>
                </div>
                <div style={{ fontSize: '11px', color: u.color, fontStyle: 'italic' }}>{u.desc}</div>
              </div>
            ))}
            <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5EAF2' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '6px' }}>用戶分佈</div>
              {[
                { label: '新用戶 (1 篇)', pct: 52, color: '#D97706' },
                { label: '輕度 (2-4 篇)', pct: 28, color: '#0D9488' },
                { label: '一般 (5-19)', pct: 15, color: '#2563EB' },
                { label: '高活躍 (≥20)', pct: 5, color: '#7C3AED' },
              ].map(({ label, pct, color }) => (
                <div key={label} style={{ marginBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--app-text-muted)', marginBottom: '2px' }}>
                    <span>{label}</span><span style={{ color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                  <div style={{ height: '5px', background: '#E5EAF2', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', background: color, borderRadius: '3px',
                      animation: visibleSet.has(7) ? 'bar-grow-width 0.8s ease both' : 'none',
                      '--bar-target-w': `${pct}%`,
                    } as React.CSSProperties} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stage 8: Evaluation Metrics ─────────────────────────────────── */}
      <div ref={ref8} id="journey-8" data-journey-step="8" className="ari-card" style={sectionStyle(8)}>
        <SectionHeader step={8} title={t('journey.8.title')} tech={t('journey.8.tech')} color="#F59E0B" />
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
          {/* Left: metric bars */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '16px' }}>搜尋模型指標比較</div>
            {[
              { metric: 'MRR@10',     bm25: 0.500, vec: 0.575, hyb: 0.575 },
              { metric: 'nDCG@10',    bm25: 0.780, vec: 0.792, hyb: 0.792 },
              { metric: 'Recall@10',  bm25: 0.455, vec: 0.545, hyb: 0.545 },
              { metric: 'Precision@10', bm25: 0.064, vec: 0.073, hyb: 0.073 },
              { metric: 'Hit Rate@10',  bm25: 0.455, vec: 0.545, hyb: 0.545 },
            ].map(({ metric, bm25, vec, hyb }) => (
              <div key={metric} style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '6px' }}>{metric}</div>
                {[
                  { label: 'BM25',   val: bm25, color: '#2563EB', delay: '0.1s' },
                  { label: 'Vector', val: vec,  color: '#7C3AED', delay: '0.3s' },
                  { label: 'Hybrid', val: hyb,  color: '#F59E0B', delay: '0.5s' },
                ].map(({ label, val, color, delay }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color, minWidth: '44px' }}>{label}</span>
                    <div style={{ flex: 1, height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', background: color, borderRadius: '4px',
                        animation: visibleSet.has(8) ? `bar-grow-width 0.8s ease ${delay} both` : 'none',
                        '--bar-target-w': `${val * 100}%`,
                      } as React.CSSProperties} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color, minWidth: '38px', textAlign: 'right' }}>{val.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right: summary cards */}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--app-text-muted)', marginBottom: '12px' }}>評估摘要</div>
            {[
              { icon: '🏆', title: 'Hybrid 最佳', desc: 'MRR@10: 0.575 (+15% vs BM25)', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
              { icon: '📊', title: 'nDCG@10', desc: 'Hybrid=0.792 · BM25=0.780', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
              { icon: '🌡️', title: '冷啟動覆蓋', desc: 'Coverage: 2.3% 目錄商品', color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
              { icon: '⚙️', title: '評估方法', desc: 'Leave-one-out holdout @ k=[5,10,20]', color: '#0D9488', bg: '#F0FDF4', border: '#BBF7D0' },
            ].map((card) => (
              <div key={card.title} style={{ padding: '12px 14px', background: card.bg, borderRadius: '10px', border: `1px solid ${card.border}`, marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '20px' }}>{card.icon}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: card.color }}>{card.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', marginTop: '2px' }}>{card.desc}</div>
                </div>
              </div>
            ))}
            <div style={{ padding: '12px 14px', background: 'linear-gradient(135deg, #FFF7ED, #FFFBEB)', borderRadius: '10px', border: '1px solid #FDE68A', marginTop: '4px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', marginBottom: '4px' }}>推薦系統結論</div>
              <div style={{ fontSize: '10px', color: '#B45309', lineHeight: 1.6 }}>
                Hybrid 搜尋在語意理解上優於純 BM25，向量嵌入提升 Recall 15%。
                冷啟動策略有效處理 52% 新用戶場景。
              </div>
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div style={{ marginTop: '20px', padding: '14px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5EAF2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text)' }}>旅程完成 🎉</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/evaluation" style={{ padding: '8px 16px', background: '#F59E0B', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BarChart3 size={14} /> 查看完整評估
            </Link>
            <Link href="/search" style={{ padding: '8px 16px', background: '#2563EB', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Search size={14} /> 體驗搜尋
            </Link>
          </div>
        </div>
      </div>

      {/* Floating stepper */}
      <PipelineStepper
        active={activeStep}
        total={TOTAL_STEPS}
        isOpen={stepperOpen}
        onToggle={() => setStepperOpen(o => !o)}
        onGoTo={goToStep}
      />
    </div>
  );
}
