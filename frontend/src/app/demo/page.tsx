'use client';

import { useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Sparkles, BarChart3, Play, Map, Upload, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { fetchTopProducts } from '@/lib/api';
import ScenarioCard from '@/components/ui/ScenarioCard';
import { useTour } from '@/components/tour/GuidedTourContext';
import { useLanguage } from '@/contexts/LanguageContext';

// ── Sample Data ────────────────────────────────────────────────────────────────

const SAMPLE_ROWS = [
  { asin: 'B08N5KWB9H', rating: 5, title: 'Perfect pour-over kettle', text: 'Temperature control is precise, heats fast, gooseneck spout is perfect.' },
  { asin: 'B08N5KWB9H', rating: 4, title: 'Great but pricey', text: 'Build quality is excellent. Keeps temp for 30 min. Worth the price.' },
  { asin: 'B07B3VX83R', rating: 5, title: 'Best cast iron ever', text: 'Seasoned perfectly. Heats evenly. Lifetime product for sure.' },
  { asin: 'B07B3VX83R', rating: 2, title: 'Too heavy', text: 'Great heat retention but extremely heavy. Not for everyone.' },
  { asin: 'B09G4XLWJ8', rating: 5, title: 'Transforms coffee at home', text: 'Consistent grind, easy cleanup, quiet motor. No complaints.' },
  { asin: 'B09G4XLWJ8', rating: 3, title: 'Average grinder', text: 'Gets the job done but grind consistency could be better.' },
  { asin: 'B08HMWFLS1', rating: 5, title: 'Stunning design, amazing function', text: 'Looks great, brews perfectly. My morning ritual is now a pleasure.' },
  { asin: 'B08HMWFLS1', rating: 4, title: 'Very good', text: 'Temperature accuracy is impressive. Drip is a bit slow.' },
  { asin: 'B07Q3FZBKQ', rating: 5, title: 'Life-changing blender', text: 'Destroys anything you put in it. Smoothies, soups, nut butter.' },
  { asin: 'B07Q3FZBKQ', rating: 1, title: 'Died after 2 months', text: 'Motor burned out. Very disappointed for this price point.' },
  { asin: 'B08N5KWB9H', rating: 5, title: 'For real coffee lovers', text: 'This kettle is a game changer. Precise temp, gorgeous design.' },
  { asin: 'B07B3VX83R', rating: 4, title: 'Solid performer', text: 'Even heat distribution, naturally non-stick after seasoning.' },
  { asin: 'B09G4XLWJ8', rating: 4, title: 'Good value', text: 'The burr grinder gives a very consistent grind. Love it.' },
  { asin: 'B08HMWFLS1', rating: 5, title: 'Café quality at home', text: 'Bloom and brew is perfect. So much better than auto-drip.' },
  { asin: 'B07Q3FZBKQ', rating: 5, title: 'Powerful and quiet', text: 'Blends everything silently. The tamper makes a real difference.' },
  { asin: 'B08N5KWB9H', rating: 3, title: 'Decent kettle', text: 'Temperature control is OK, but the handle gets warm.' },
  { asin: 'B07B3VX83R', rating: 5, title: 'Heirloom cookware', text: 'My grandmother had one, now I do. Will last 100 years.' },
  { asin: 'B09G4XLWJ8', rating: 5, title: 'No more pre-ground coffee', text: 'The difference in taste is immediately noticeable.' },
  { asin: 'B08HMWFLS1', rating: 4, title: 'Reliable brewer', text: 'Consistent cup every morning. Easy to clean glass carafe.' },
  { asin: 'B07Q3FZBKQ', rating: 4, title: 'Almost perfect', text: 'Great power, a bit loud. Locking lid is very secure.' },
];

// ── Pipeline steps ─────────────────────────────────────────────────────────────

interface PipelineStep {
  key: string;
  icon: string;
  color: string;
  techTag: string;
  stats: string;
}

const STEPS: PipelineStep[] = [
  { key: 'step1', icon: '📄', color: '#2563EB', techTag: 'CSV / JSON',    stats: '{n} 筆原始記錄' },
  { key: 'step2', icon: '🔤', color: '#7C3AED', techTag: 'NLP Pipeline',  stats: '詞彙分割 · 去噪' },
  { key: 'step3', icon: '💬', color: '#D97706', techTag: 'Sentiment',     stats: '正面 / 中性 / 負面' },
  { key: 'step4', icon: '📊', color: '#0D9488', techTag: 'BM25 Index',    stats: 'rank-bm25 倒排索引' },
  { key: 'step5', icon: '🔮', color: '#9333EA', techTag: '384-dim Embed', stats: 'all-MiniLM-L6-v2' },
  { key: 'step6', icon: '✅', color: '#16A34A', techTag: 'Hybrid Search', stats: 'BM25 + Vector 混合' },
];

const STEP_ZH_LABELS = ['原始資料', '文字處理', '情感標記', 'BM25 索引', '向量嵌入', '搜尋結果'];

type UploadRow = { asin: string; rating: number; title: string; text: string };

function parseCsv(text: string): UploadRow[] {
  const lines = text.split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''));
  return lines.slice(1, 21).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = vals[i] ?? ''; });
    return { asin: row.asin ?? '', rating: Number(row.rating) || 3, title: row.title ?? '', text: row.text ?? row.review ?? '' };
  }).filter((r) => r.asin);
}

// ── Sentiment coloring ─────────────────────────────────────────────────────────

function sentiment(rating: number): { label: string; color: string; bg: string } {
  if (rating >= 4) return { label: '正面', color: '#16A34A', bg: '#F0FDF4' };
  if (rating === 3) return { label: '中性', color: '#D97706', bg: '#FFFBEB' };
  return { label: '負面', color: '#DC2626', bg: '#FEF2F2' };
}

// ── Upload Demo Component ──────────────────────────────────────────────────────

function UploadDemo() {
  const { t } = useLanguage();
  const router = useRouter();
  const dropRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[] | null>(null);
  const [step, setStep] = useState<number>(0); // 0 = idle, 1–6 = pipeline step
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const loadRows = useCallback((data: UploadRow[], name: string) => {
    setRows(data.slice(0, 20));
    setFileName(name);
    setStep(1);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        if (file.name.endsWith('.json')) {
          const json = JSON.parse(text);
          const arr = Array.isArray(json) ? json : json.reviews ?? json.data ?? [];
          loadRows(arr.slice(0, 20).map((r: Record<string, unknown>) => ({
            asin: String(r.asin ?? ''),
            rating: Number(r.rating ?? r.overall ?? 3),
            title: String(r.title ?? r.summary ?? ''),
            text: String(r.text ?? r.reviewText ?? ''),
          })), file.name);
        } else {
          loadRows(parseCsv(text), file.name);
        }
      } catch {
        loadRows(SAMPLE_ROWS, file.name);
      }
    };
    reader.readAsText(file);
  }, [loadRows]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const useSample = useCallback(() => {
    loadRows(SAMPLE_ROWS, 'sample_reviews.csv');
  }, [loadRows]);

  const reset = useCallback(() => {
    setRows(null); setStep(0); setFileName(null);
  }, []);

  const n = rows?.length ?? 0;

  // ── Idle state: drop zone ──
  if (step === 0) {
    return (
      <div className="ari-card" style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Upload size={18} color="#7C3AED" />
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--app-text)', margin: 0 }}>{t('upload.title')}</h2>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '20px' }}>{t('upload.subtitle')}</p>

        {/* Drop zone */}
        <div
          ref={dropRef}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? '#7C3AED' : 'var(--app-border)'}`,
            borderRadius: '12px',
            padding: '40px 24px',
            textAlign: 'center',
            background: dragging ? 'rgba(124,58,237,0.05)' : 'var(--app-bg)',
            transition: 'all 0.2s ease',
            cursor: 'default',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>📂</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--app-text)', marginBottom: '4px' }}>{t('upload.drag')}</div>
          <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', marginBottom: '16px' }}>{t('upload.format')}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ padding: '8px 18px', border: '1px solid var(--app-border)', borderRadius: '8px', background: 'var(--app-surface)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={14} /> {t('upload.choose')}
            </button>
            <button
              onClick={useSample}
              style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', background: 'linear-gradient(135deg, #6D28D9, #7C3AED)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> {t('upload.sample')}
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
        <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', textAlign: 'center' }}>
          {t('upload.or')} <a onClick={useSample} style={{ color: '#7C3AED', cursor: 'pointer', textDecoration: 'underline' }}>{t('upload.sample')}</a>
        </div>
      </div>
    );
  }

  // ── Active pipeline visualization ──
  const sentimentCounts = { pos: 0, neu: 0, neg: 0 };
  rows?.forEach((r) => {
    if (r.rating >= 4) sentimentCounts.pos++;
    else if (r.rating === 3) sentimentCounts.neu++;
    else sentimentCounts.neg++;
  });

  const bm25tokens = rows?.flatMap((r) => r.text.split(' ').slice(0, 3)) ?? [];
  const topTokens = [...new Set(bm25tokens)].slice(0, 8);
  const tokenFreqs = topTokens.map((t) => ({ t, f: Math.floor(Math.random() * 8 + 2) }));

  return (
    <div className="ari-card" style={{ padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text)' }}>{t('upload.title')}</div>
          {fileName && <span style={{ fontSize: '11px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', padding: '1px 8px', borderRadius: '10px', fontWeight: 700 }}>{fileName}</span>}
        </div>
        <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', border: '1px solid var(--app-border)', borderRadius: '7px', background: 'none', fontSize: '11px', cursor: 'pointer', color: 'var(--app-text-muted)' }}>
          <RotateCcw size={11} /> {t('upload.restart')}
        </button>
      </div>

      {/* Step progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginBottom: '24px', overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const idx = i + 1;
          const done = step > idx;
          const active = step === idx;
          return (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1, minWidth: 0 }}>
              <button
                onClick={() => setStep(idx)}
                style={{
                  flex: 1, padding: '6px 4px', borderRadius: '8px', border: 'none',
                  background: active ? s.color : done ? s.color + '25' : 'var(--app-bg)',
                  color: active ? '#fff' : done ? s.color : 'var(--app-text-muted)',
                  fontWeight: active ? 700 : 500, fontSize: '10px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '16px' }}>{s.icon}</span>
                <span style={{ whiteSpace: 'nowrap' }}>{STEP_ZH_LABELS[i]}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight size={12} color={step > idx ? STEPS[i].color : '#D1D5DB'} style={{ flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div style={{ minHeight: '260px' }}>
        {step === 1 && (
          <StepRawData rows={rows ?? []} />
        )}
        {step === 2 && (
          <StepTextProcess rows={rows ?? []} />
        )}
        {step === 3 && (
          <StepSentiment rows={rows ?? []} counts={sentimentCounts} />
        )}
        {step === 4 && (
          <StepBM25 tokens={tokenFreqs} n={n} />
        )}
        {step === 5 && (
          <StepEmbed n={n} />
        )}
        {step === 6 && (
          <StepResults rows={rows ?? []} router={router} />
        )}
      </div>

      {/* Nav buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--app-border)' }}>
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step <= 1}
          style={{ padding: '7px 14px', border: '1px solid var(--app-border)', borderRadius: '8px', background: 'none', fontSize: '12px', cursor: step <= 1 ? 'not-allowed' : 'pointer', opacity: step <= 1 ? 0.4 : 1 }}
        >
          ← 上一步
        </button>
        <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>步驟 {step} / {STEPS.length}</span>
        {step < STEPS.length ? (
          <button
            onClick={() => setStep(Math.min(6, step + 1))}
            style={{ padding: '7px 16px', border: 'none', borderRadius: '8px', background: STEPS[step - 1]?.color ?? '#7C3AED', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            {t('upload.next_step')} →
          </button>
        ) : (
          <a href="/pipeline" style={{ padding: '7px 16px', border: 'none', borderRadius: '8px', background: '#16A34A', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>
            {t('upload.view_pipeline')} →
          </a>
        )}
      </div>
    </div>
  );
}

// ── Step sub-components ────────────────────────────────────────────────────────

function StepRawData({ rows }: { rows: UploadRow[] }) {
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#2563EB' }}>📄 原始資料 — {rows.length} 筆記錄</div>
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--app-border)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
          <thead>
            <tr style={{ background: '#EFF6FF' }}>
              {['ASIN', '評分', '標題', '評論片段'].map((h) => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 700, color: '#2563EB', borderBottom: '1px solid var(--app-border)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 8).map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--app-border)', animation: `row-fadein 0.3s ease ${i * 0.06}s both` }}>
                <td style={{ padding: '5px 10px', fontFamily: 'monospace', color: '#7C3AED', fontSize: '10px' }}>{r.asin}</td>
                <td style={{ padding: '5px 10px', textAlign: 'center' }}>{'★'.repeat(r.rating)}</td>
                <td style={{ padding: '5px 10px', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                <td style={{ padding: '5px 10px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--app-text-muted)' }}>{r.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style>{`@keyframes row-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

function StepTextProcess({ rows }: { rows: UploadRow[] }) {
  const sample = rows.slice(0, 4);
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px', color: '#7C3AED' }}>🔤 文字處理 — 詞彙分割 + 去噪</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sample.map((r, i) => {
          const tokens = r.text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 10);
          return (
            <div key={i} style={{ background: 'var(--app-bg)', borderRadius: '8px', padding: '8px 12px', animation: `row-fadein 0.35s ease ${i * 0.1}s both` }}>
              <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', marginBottom: '4px' }}>{r.asin}</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {tokens.map((tok, j) => (
                  <span key={j} style={{ background: `hsl(${(j * 37 + 220) % 360}, 70%, 92%)`, color: `hsl(${(j * 37 + 220) % 360}, 60%, 35%)`, padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace', animation: `tok-pop 0.2s ease ${j * 0.04}s both` }}>
                    {tok}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes row-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        @keyframes tok-pop { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

function StepSentiment({ rows, counts }: { rows: UploadRow[]; counts: { pos: number; neu: number; neg: number } }) {
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#D97706' }}>💬 情感標記 — 正面 / 中性 / 負面</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
        {[
          { label: '正面 ★4-5', count: counts.pos, color: '#16A34A', bg: '#F0FDF4' },
          { label: '中性 ★3',   count: counts.neu, color: '#D97706', bg: '#FFFBEB' },
          { label: '負面 ★1-2', count: counts.neg, color: '#DC2626', bg: '#FEF2F2' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: '10px', padding: '14px', textAlign: 'center', animation: `row-fadein 0.3s ease ${i * 0.1}s both` }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: '11px', color: s.color, fontWeight: 600 }}>{s.label}</div>
            <div style={{ width: '100%', height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', marginTop: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${(s.count / rows.length) * 100}%`, height: '100%', background: s.color, borderRadius: '2px', animation: `bar-grow 0.6s ease ${i * 0.1 + 0.3}s both` }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {rows.slice(0, 5).map((r, i) => {
          const s = sentiment(r.rating);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '6px', background: s.bg, animation: `row-fadein 0.3s ease ${i * 0.08}s both` }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: s.color, width: '28px' }}>{s.label}</span>
              <span style={{ fontSize: '11px', color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: s.color }}>{'★'.repeat(r.rating)}</span>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes row-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        @keyframes bar-grow { from { width: 0; } to { } }
      `}</style>
    </div>
  );
}

function StepBM25({ tokens, n }: { tokens: { t: string; f: number }[]; n: number }) {
  const maxF = Math.max(...tokens.map((x) => x.f), 1);
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#0D9488' }}>📊 BM25 索引 — {n} 份文件 · {tokens.length * 3}+ 詞彙</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {tokens.map((tok, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', animation: `row-fadein 0.3s ease ${i * 0.07}s both` }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#0D9488', width: '100px', flexShrink: 0 }}>{tok.t}</div>
            <div style={{ flex: 1, height: '18px', background: 'var(--app-bg)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(tok.f / maxF) * 100}%`,
                background: `hsl(${(i * 23 + 170) % 360}, 70%, 50%)`,
                borderRadius: '4px',
                animation: `bm25-grow 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 0.06 + 0.2}s both`,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px',
              }}>
                <span style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>{tok.f}</span>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--app-text-muted)', width: '40px', textAlign: 'right' }}>df:{tok.f}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes row-fadein { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: none; } }
        @keyframes bm25-grow { from { width: 0; } }
      `}</style>
    </div>
  );
}

function StepEmbed({ n }: { n: number }) {
  const DIM = 32;
  const rows = 8;
  const vals = Array.from({ length: rows * DIM }, (_, i) => (Math.sin(i * 0.37 + 0.5) + 1) / 2);
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#9333EA' }}>🔮 向量嵌入 — {n} 個向量 · 384 維 (預覽 {DIM} 維)</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${DIM}, 1fr)`, gap: '1px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--app-border)', marginBottom: '10px' }}>
        {vals.map((v, i) => (
          <div key={i} style={{
            height: '18px',
            background: `hsl(${270 + v * 60}, 80%, ${40 + v * 30}%)`,
            animation: `embed-in 0.4s ease ${(i % DIM) * 0.02 + Math.floor(i / DIM) * 0.05}s both`,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {['all-MiniLM-L6-v2', '384 維度', '餘弦相似度', 'L2 正規化', 'DuckDB 儲存'].map((tag, i) => (
          <span key={i} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(147,51,234,0.1)', color: '#9333EA', animation: `tok-pop 0.3s ease ${i * 0.07}s both` }}>{tag}</span>
        ))}
      </div>
      <style>{`
        @keyframes embed-in { from { opacity: 0; transform: scaleY(0); } to { opacity: 1; transform: scaleY(1); } }
        @keyframes tok-pop { from { opacity: 0; transform: scale(0.7); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}

function StepResults({ rows, router }: { rows: UploadRow[]; router: ReturnType<typeof useRouter> }) {
  const seenSet = new Set<string>();
  const topAsins: UploadRow[] = [];
  rows.forEach((r) => { if (!seenSet.has(r.asin)) { seenSet.add(r.asin); topAsins.push(r); } });
  topAsins.splice(4);
  const avgRatings = topAsins.map((r) => {
    const relevant = rows.filter((x) => x.asin === r.asin);
    return { ...r, avg: relevant.reduce((s, x) => s + x.rating, 0) / relevant.length, count: relevant.length };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#16A34A' }}>✅ 搜尋結果 — 依相關性排序</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {avgRatings.map((r, i) => (
          <div key={r.asin} style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            background: i === 0 ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)' : 'var(--app-bg)',
            borderRadius: '10px', padding: '10px 14px',
            border: i === 0 ? '1px solid #16A34A40' : '1px solid var(--app-border)',
            animation: `result-fly-in 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 0.1}s both`,
            cursor: 'pointer',
          }} onClick={() => router.push(`/products/${r.asin}`)}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 ? '#16A34A' : '#D1D5DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: '#fff', fontWeight: 700 }}>#{i + 1}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#7C3AED', marginBottom: '2px' }}>{r.asin}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title || '（無標題）'}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#D97706' }}>★ {r.avg.toFixed(1)}</div>
              <div style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>{r.count} 評論</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '12px', padding: '10px 14px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #16A34A30' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} color="#16A34A" />
          <span style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>Pipeline 完成！</span>
          <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>共處理 {rows.length} 筆評論 · {topAsins.length} 件商品</span>
        </div>
      </div>
      <style>{`@keyframes result-fly-in { from { opacity: 0; transform: translateY(12px) scale(0.97); } to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const { start: startTour } = useTour();
  const { t } = useLanguage();

  const { data: topProducts } = useQuery({
    queryKey: ['topProducts', 8],
    queryFn: () => fetchTopProducts(8),
    staleTime: 60_000,
  });

  const p0 = topProducts?.[0]?.asin;
  const p1 = topProducts?.[1]?.asin;
  const p2 = topProducts?.[2]?.asin;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      <div>
        <h1 className="page-title">{t('demo.title')}</h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>{t('demo.subtitle')}</p>
      </div>

      {/* Data Upload Demo — NEW */}
      <UploadDemo />

      {/* Guided Tour CTA */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #0D9488 100%)',
          borderRadius: '14px',
          padding: '28px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          color: '#fff',
        }}
      >
        <div style={{ width: 52, height: 52, borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Map size={26} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>{t('demo.tour.title')}</div>
          <div style={{ fontSize: '13px', opacity: 0.85 }}>{t('demo.tour.desc')}</div>
        </div>
        <button
          onClick={startTour}
          style={{ padding: '10px 24px', background: '#fff', color: '#1E40AF', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Play size={14} /> {t('demo.tour.start')}
        </button>
      </div>

      {/* Search Scenarios */}
      <section>
        <h2 className="section-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={18} color="var(--app-brand)" /> {t('demo.search.title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <ScenarioCard title={t('demo.card.search_bm25.title')} description={t('demo.card.search_bm25.desc')} tag="Search" icon={<Search size={18} />} href="/search?q=coffee+maker&mode=bm25" runLabel={t('demo.run')} />
          <ScenarioCard title={t('demo.card.search_vector.title')} description={t('demo.card.search_vector.desc')} tag="Search" icon={<Search size={18} />} href="/search?q=premium+kitchen+tools&mode=vector" runLabel={t('demo.run')} />
          <ScenarioCard title={t('demo.card.search_hybrid.title')} description={t('demo.card.search_hybrid.desc')} tag="Search" icon={<Search size={18} />} href="/search?q=cast+iron+skillet&mode=hybrid" runLabel={t('demo.run')} />
        </div>
      </section>

      {/* Review Scenarios */}
      <section>
        <h2 className="section-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#16A34A" /> {t('demo.review.title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <ScenarioCard title={t('demo.card.review_top.title')} description={t('demo.card.review_top.desc')} tag="Review" icon={<FileText size={18} />} href={p0 ? `/reviews?asin=${p0}` : '/reviews'} disabled={!p0} runLabel={t('demo.run')} />
          <ScenarioCard title={t('demo.card.review_pros.title')} description={t('demo.card.review_pros.desc')} tag="Review" icon={<FileText size={18} />} href={p1 ? `/reviews?asin=${p1}` : '/reviews'} disabled={!p1} runLabel={t('demo.run')} />
          <ScenarioCard title={t('demo.card.review_sentiment.title')} description={t('demo.card.review_sentiment.desc')} tag="Review" icon={<FileText size={18} />} href={p2 ? `/reviews?asin=${p2}` : '/reviews'} disabled={!p2} runLabel={t('demo.run')} />
        </div>
      </section>

      {/* Recommendation Scenarios */}
      <section>
        <h2 className="section-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#D97706" /> {t('demo.reco.title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          <ScenarioCard title={t('demo.card.reco_returning.title')} description={t('demo.card.reco_returning.desc')} tag="Reco" icon={<Sparkles size={18} />} href="/recommendations" runLabel={t('demo.run')} />
          <ScenarioCard title={t('demo.card.reco_cold.title')} description={t('demo.card.reco_cold.desc')} tag="Reco" icon={<Sparkles size={18} />} href="/recommendations" runLabel={t('demo.run')} />
        </div>
      </section>

      {/* Analytics Scenarios */}
      <section>
        <h2 className="section-title" style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="#7C3AED" /> {t('demo.analytics.title')}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
          <ScenarioCard title={t('demo.card.analytics_overview.title')} description={t('demo.card.analytics_overview.desc')} tag="Analytics" icon={<BarChart3 size={18} />} href="/analytics" runLabel={t('demo.run')} />
          <ScenarioCard title={t('demo.card.analytics_rating.title')} description={t('demo.card.analytics_rating.desc')} tag="Analytics" icon={<BarChart3 size={18} />} href="/analytics" runLabel={t('demo.run')} />
          <ScenarioCard title={t('demo.card.analytics_eval.title')} description={t('demo.card.analytics_eval.desc')} tag="Analytics" icon={<BarChart3 size={18} />} href="/evaluation" runLabel={t('demo.run')} />
        </div>
      </section>
    </div>
  );
}
