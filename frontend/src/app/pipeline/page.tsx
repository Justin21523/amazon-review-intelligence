'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '@/lib/api';
import { Database, Cpu, GitBranch, Package, FileText, BarChart3, Activity } from 'lucide-react';

interface Stage {
  id: number;
  icon: React.ReactNode;
  name: string;
  bullets: string[];
  badge: string;
  color: string;
}

const stages: Stage[] = [
  {
    id: 1,
    icon: <Database size={18} color="white" />,
    name: 'Raw Data',
    bullets: ['Amazon JSONL/Parquet', '100K+ reviews', '83K+ products'],
    badge: 'Source',
    color: '#6B7280',
  },
  {
    id: 2,
    icon: <GitBranch size={18} color="white" />,
    name: 'Ingestion',
    bullets: ['src/ingestion/ pipeline', 'DuckDB loader', 'Schema validation'],
    badge: 'ETL',
    color: '#D97706',
  },
  {
    id: 3,
    icon: <Database size={18} color="white" />,
    name: 'DuckDB Warehouse',
    bullets: ['9 tables', 'products, reviews', 'embeddings, BM25'],
    badge: 'Storage',
    color: '#2563EB',
  },
  {
    id: 4,
    icon: <FileText size={18} color="white" />,
    name: 'Text Processing',
    bullets: ['Text cleaning', 'Sentence splitting', 'Sentiment analysis'],
    badge: 'NLP',
    color: '#0D9488',
  },
  {
    id: 5,
    icon: <Cpu size={18} color="white" />,
    name: 'Feature Engineering',
    bullets: ['BM25 index', 'Sentence-transformer', 'Vector embeddings'],
    badge: 'ML',
    color: '#7C3AED',
  },
  {
    id: 6,
    icon: <Activity size={18} color="white" />,
    name: 'FastAPI',
    bullets: ['9 endpoints', 'Hybrid search', 'Recommendations'],
    badge: 'API',
    color: '#DC2626',
  },
  {
    id: 7,
    icon: <BarChart3 size={18} color="white" />,
    name: 'Next.js UI',
    bullets: ['9 pages', 'Real-time analytics', 'Recharts visualizations'],
    badge: 'Frontend',
    color: '#16A34A',
  },
];

const technologies = [
  { name: 'DuckDB', desc: 'In-process analytical SQL engine. Stores products, reviews, embeddings, and BM25 index in a single file.', color: '#FFD700', bg: '#FFFBEB' },
  { name: 'sentence-transformers', desc: 'Generates dense vector embeddings for semantic product search using the all-MiniLM-L6-v2 model.', color: '#7C3AED', bg: '#F5F3FF' },
  { name: 'BM25', desc: 'Classic sparse retrieval algorithm for keyword-based product search. Complements vector search in hybrid mode.', color: '#2563EB', bg: '#EFF6FF' },
  { name: 'FastAPI', desc: 'High-performance async Python API with automatic OpenAPI docs. Serves all ML inference endpoints.', color: '#0D9488', bg: '#CCFBF1' },
  { name: 'Next.js 16', desc: 'React framework with App Router, TypeScript, and Tailwind CSS. Proxies /api/* to FastAPI on port 8001.', color: '#111827', bg: '#F3F4F6' },
  { name: 'Recharts', desc: 'Composable React chart library. Powers AreaChart, BarChart, and LineChart visualizations throughout the app.', color: '#DC2626', bg: '#FEF2F2' },
];

export default function PipelinePage() {
  const { data: overview } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Data Pipeline</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>
          End-to-end architecture from raw Amazon data to production analytics
          {overview && (
            <> · {overview.products_count.toLocaleString()} products · {overview.reviews_count.toLocaleString()} reviews live</>
          )}
        </p>
      </div>

      {/* Pipeline flow */}
      <div className="ari-card">
        <div className="card-title" style={{ marginBottom: '20px' }}>Pipeline Architecture</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '0',
            alignItems: 'start',
            overflowX: 'auto',
          }}
        >
          {stages.map((stage, idx) => (
            <div key={stage.id} style={{ display: 'flex', alignItems: 'flex-start' }}>
              {/* Stage card */}
              <div
                className="pipeline-stage"
                style={{ flex: 1, minWidth: '110px' }}
              >
                <div
                  className="pipeline-stage-icon"
                  style={{ background: stage.color }}
                >
                  {stage.icon}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '6px' }}>
                  {stage.name}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {stage.bullets.map((b, i) => (
                    <li key={i} style={{ fontSize: '11px', color: 'var(--app-text-muted)', lineHeight: 1.4 }}>
                      · {b}
                    </li>
                  ))}
                </ul>
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: '8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: stage.color + '18',
                    color: stage.color,
                    letterSpacing: '0.03em',
                  }}
                >
                  {stage.badge}
                </span>
              </div>

              {/* Arrow between stages */}
              {idx < stages.length - 1 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    paddingTop: '20px',
                    color: '#D1D5DB',
                    fontSize: '18px',
                    flexShrink: 0,
                    width: '20px',
                    justifyContent: 'center',
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Data flow summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        <div className="ari-card" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Data Layer
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {['DuckDB single-file warehouse', '9 normalized tables', 'Persistent BM25 + vector indexes', 'Query log for analytics'].map((t) => (
              <li key={t} style={{ fontSize: '12px', color: '#1E40AF' }}>· {t}</li>
            ))}
          </ul>
        </div>
        <div className="ari-card" style={{ background: '#F5F3FF', border: '1px solid #DDD6FE' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            ML Layer
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {['all-MiniLM-L6-v2 embeddings', 'Hybrid BM25 + cosine search', 'Rule-based sentiment', 'Popularity-weighted reranking'].map((t) => (
              <li key={t} style={{ fontSize: '12px', color: '#5B21B6' }}>· {t}</li>
            ))}
          </ul>
        </div>
        <div className="ari-card" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            API Layer
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {['/search · /products · /recommendations', '/analytics/overview · /trends', '/evaluation · /health', 'Async FastAPI + DuckDB queries'].map((t) => (
              <li key={t} style={{ fontSize: '12px', color: '#15803D' }}>· {t}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Technology cards */}
      <div>
        <h2 className="section-title" style={{ marginBottom: '14px' }}>Technology Stack</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          {technologies.map((tech) => (
            <div
              key={tech.name}
              className="ari-card"
              style={{ borderLeft: `3px solid ${tech.color}` }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: tech.color,
                  marginBottom: '6px',
                }}
              >
                {tech.name}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', lineHeight: '1.5', margin: 0 }}>
                {tech.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
