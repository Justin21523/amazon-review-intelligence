'use client';

import { useEffect, useState, useRef } from 'react';
import type { AmbientType } from './GuidedTourContext';

interface TargetRect { x: number; y: number; width: number; height: number; }

interface Props {
  targetSelector: string;
  ambientType: AmbientType;
  isActive: boolean;
}

const PAD = 14;
const BORDER_R = 14;

// ── Ambient animation components ──────────────────────────────────────────────

function DataFlowAnim({ rect }: { rect: TargetRect }) {
  const dots = Array.from({ length: 10 }, (_, i) => i);
  return (
    <div style={{ position: 'fixed', top: rect.y - PAD - 32, left: rect.x - PAD, width: rect.width + PAD * 2, height: 28, pointerEvents: 'none', overflow: 'visible', zIndex: 10001 }}>
      {dots.map((i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${8 + (i % 3) * 6}px`,
          left: '-20px',
          width: '8px', height: '8px',
          borderRadius: '50%',
          background: i % 3 === 0 ? '#7C3AED' : i % 3 === 1 ? '#2563EB' : '#0D9488',
          animation: `tour-data-flow 1.6s ease-in-out ${i * 0.16}s infinite`,
          opacity: 0.85,
        }} />
      ))}
    </div>
  );
}

function StarBurstAnim({ rect }: { rect: TargetRect }) {
  const stars = ['★', '★', '☆', '★', '★', '☆', '★', '★'];
  return (
    <div style={{ position: 'fixed', top: rect.y + rect.height + PAD, left: rect.x - PAD, width: rect.width + PAD * 2, height: 48, pointerEvents: 'none', overflow: 'visible', zIndex: 10001 }}>
      {stars.map((s, i) => (
        <span key={i} style={{
          position: 'absolute',
          left: `${(i / stars.length) * 100}%`,
          bottom: '0',
          fontSize: '16px',
          color: i % 2 === 0 ? '#D97706' : '#EAB308',
          animation: `tour-star-rise 1.8s ease-out ${i * 0.22}s infinite`,
          opacity: 0,
        }}>{s}</span>
      ))}
    </div>
  );
}

function ChartWaveAnim({ rect }: { rect: TargetRect }) {
  const bars = [40, 65, 30, 80, 55, 90, 45, 70, 35, 85];
  return (
    <div style={{ position: 'fixed', top: rect.y - PAD - 40, left: rect.x, width: rect.width, height: 36, display: 'flex', alignItems: 'flex-end', gap: '3px', pointerEvents: 'none', zIndex: 10001 }}>
      {bars.map((h, i) => (
        <div key={i} style={{
          flex: 1,
          borderRadius: '2px 2px 0 0',
          background: `hsl(${220 + i * 12}, 80%, 55%)`,
          animation: `tour-bar-wave 1.4s ease-in-out ${i * 0.12}s infinite`,
          transformOrigin: 'bottom',
          height: `${h * 0.36}px`,
          opacity: 0.7,
        }} />
      ))}
    </div>
  );
}

function NetworkPulseAnim({ rect }: { rect: TargetRect }) {
  const nodes = [
    { x: 12, y: 12 }, { x: rect.width - 12, y: 12 },
    { x: rect.width / 2, y: 36 }, { x: 32, y: 36 }, { x: rect.width - 32, y: 36 },
  ];
  const lines = [[0, 2], [1, 2], [0, 3], [1, 4], [2, 3], [2, 4]];
  return (
    <svg style={{ position: 'fixed', top: rect.y - PAD - 56, left: rect.x - PAD, width: rect.width + PAD * 2, height: 56, pointerEvents: 'none', zIndex: 10001, overflow: 'visible' }}>
      {lines.map(([a, b], i) => (
        <line key={i}
          x1={nodes[a].x + PAD} y1={nodes[a].y}
          x2={nodes[b].x + PAD} y2={nodes[b].y}
          stroke="#7C3AED" strokeWidth="1.5" opacity="0.4"
          strokeDasharray="4 3"
          style={{ animation: `tour-line-pulse 2s ease-in-out ${i * 0.3}s infinite` }}
        />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x + PAD} cy={n.y} r="5"
          fill={i === 2 ? '#7C3AED' : '#2563EB'} opacity="0.8"
          style={{ animation: `tour-node-pulse 1.5s ease-in-out ${i * 0.25}s infinite` }}
        />
      ))}
    </svg>
  );
}

function EmbeddingDriftAnim({ rect }: { rect: TargetRect }) {
  const COLORS = ['#7C3AED','#2563EB','#0D9488','#D97706','#DC2626','#059669','#9333EA','#0891B2'];
  const dots = Array.from({ length: 20 }, (_, i) => ({
    x: Math.sin(i * 1.8) * 60 + rect.width / 2,
    y: Math.cos(i * 2.1) * 20 + 20,
    color: COLORS[i % COLORS.length],
  }));
  return (
    <div style={{ position: 'fixed', top: rect.y - PAD - 56, left: rect.x - PAD, width: rect.width + PAD * 2, height: 52, pointerEvents: 'none', zIndex: 10001, overflow: 'hidden' }}>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: 'absolute', left: d.x, top: d.y,
          width: '7px', height: '7px', borderRadius: '2px',
          background: d.color, opacity: 0.75,
          animation: `tour-embed-drift 2.4s ease-in-out ${i * 0.12}s infinite`,
        }} />
      ))}
    </div>
  );
}

function PipelineBoxAnim({ rect }: { rect: TargetRect }) {
  const stages = ['Raw', 'Clean', 'NLP', 'Index', 'API'];
  return (
    <div style={{ position: 'fixed', top: rect.y - PAD - 44, left: rect.x - PAD, width: rect.width + PAD * 2, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', pointerEvents: 'none', zIndex: 10001 }}>
      {stages.map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
            background: `hsl(${i * 36 + 220}, 75%, 55%)`, color: '#fff',
            animation: `tour-box-flow 2s ease-in-out ${i * 0.35}s infinite`,
            opacity: 0.85,
          }}>{s}</div>
          {i < stages.length - 1 && (
            <span style={{ color: '#9CA3AF', fontSize: '12px', animation: `tour-arrow-blink 1.5s ease-in-out ${i * 0.25}s infinite` }}>→</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main SpotlightOverlay ────────────────────────────────────────────────────

export default function SpotlightOverlay({ targetSelector, ambientType, isActive }: Props) {
  const [rect, setRect] = useState<TargetRect | null>(null);
  const rafRef = useRef<number>(0);

  // Track target element position (handles scroll/resize)
  useEffect(() => {
    if (!isActive) { setRect(null); return; }

    let lastTarget: Element | null = null;

    function measure() {
      const el = document.querySelector(targetSelector);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ x: r.left, y: r.top, width: r.width, height: r.height });
        lastTarget = el;
      } else if (lastTarget) {
        setRect(null);
      }
      rafRef.current = requestAnimationFrame(measure);
    }

    rafRef.current = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, targetSelector]);

  if (!isActive || !rect) return null;

  const cx = rect.x - PAD;
  const cy = rect.y - PAD;
  const cw = rect.width + PAD * 2;
  const ch = rect.height + PAD * 2;
  const dashLen = (cw + ch) * 2;

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes tour-data-flow {
          0%   { transform: translateX(0);   opacity: 0; }
          10%  { opacity: 0.9; }
          90%  { opacity: 0.8; }
          100% { transform: translateX(${cw + 40}px); opacity: 0; }
        }
        @keyframes tour-star-rise {
          0%   { transform: translateY(0);    opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateY(-52px); opacity: 0; }
        }
        @keyframes tour-bar-wave {
          0%, 100% { transform: scaleY(0.6); opacity: 0.5; }
          50%      { transform: scaleY(1.0); opacity: 0.9; }
        }
        @keyframes tour-line-pulse {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 0.8; }
        }
        @keyframes tour-node-pulse {
          0%, 100% { r: 4; opacity: 0.7; }
          50%      { r: 6; opacity: 1.0; }
        }
        @keyframes tour-embed-drift {
          0%   { transform: translate(0, 0)     rotate(0deg);   opacity: 0.5; }
          50%  { transform: translate(8px, -8px) rotate(45deg); opacity: 0.9; }
          100% { transform: translate(0, 0)     rotate(0deg);   opacity: 0.5; }
        }
        @keyframes tour-box-flow {
          0%, 100% { transform: translateY(0)    scale(1.0); opacity: 0.7; }
          50%      { transform: translateY(-4px) scale(1.08); opacity: 1.0; }
        }
        @keyframes tour-arrow-blink {
          0%, 100% { opacity: 0.3; }
          50%      { opacity: 1.0; }
        }
        @keyframes tour-dash-spin {
          from { stroke-dashoffset: ${dashLen}; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes tour-glow-pulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.7; }
        }
      `}</style>

      {/* SVG spotlight mask */}
      <svg
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 9998 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={cx} y={cy} width={cw} height={ch} rx={BORDER_R}
              fill="black"
            />
          </mask>
          <filter id="tour-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Dimming overlay */}
        <rect
          width="100%" height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-spotlight-mask)"
          style={{ animation: 'tour-glow-pulse 3s ease-in-out infinite' }}
        />

        {/* Animated dashed border around target */}
        <rect
          x={cx} y={cy} width={cw} height={ch} rx={BORDER_R}
          fill="none"
          stroke="#7C3AED"
          strokeWidth="2.5"
          strokeDasharray={`${dashLen}`}
          strokeDashoffset={`${dashLen}`}
          style={{ animation: `tour-dash-spin 1.5s linear forwards` }}
        />

        {/* Subtle inner glow */}
        <rect
          x={cx - 1} y={cy - 1} width={cw + 2} height={ch + 2} rx={BORDER_R + 1}
          fill="none"
          stroke="#A78BFA"
          strokeWidth="1"
          opacity="0.4"
          filter="url(#tour-glow)"
        />
      </svg>

      {/* Ambient animations (outside mask, above overlay) */}
      {ambientType === 'data-flow'      && <DataFlowAnim     rect={rect} />}
      {ambientType === 'star-burst'     && <StarBurstAnim    rect={rect} />}
      {ambientType === 'chart-wave'     && <ChartWaveAnim    rect={rect} />}
      {ambientType === 'network-pulse'  && <NetworkPulseAnim rect={rect} />}
      {ambientType === 'embedding-drift'&& <EmbeddingDriftAnim rect={rect} />}
      {ambientType === 'pipeline-box'   && <PipelineBoxAnim  rect={rect} />}
    </>
  );
}
