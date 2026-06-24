'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  ComposedChart, Line, Legend,
} from 'recharts';
import { fetchProduct, fetchProductSummary, fetchProductRatingTimeline } from '@/lib/api';
import ProductSelectDropdown from '@/components/ui/ProductSelectDropdown';
import { Skeleton } from '@/components/ui/skeleton';
import { X, GitCompareArrows } from 'lucide-react';

const COLORS = ['#2563EB', '#0D9488', '#7C3AED'];
const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#16A34A', neutral: '#D97706', negative: '#DC2626',
};
const RATING_COLORS: Record<number, string> = {
  1: '#DC2626', 2: '#F97316', 3: '#D97706', 4: '#84CC16', 5: '#16A34A',
};

const MAX_SLOTS = 3;

interface Slot {
  asin: string;
  title?: string;
}

function useProductData(asin: string) {
  const detail = useQuery({
    queryKey: ['product', asin],
    queryFn: () => fetchProduct(asin),
    enabled: !!asin,
  });
  const summary = useQuery({
    queryKey: ['summary', asin],
    queryFn: () => fetchProductSummary(asin),
    enabled: !!asin,
  });
  const timeline = useQuery({
    queryKey: ['timeline', asin],
    queryFn: () => fetchProductRatingTimeline(asin),
    enabled: !!asin,
  });
  return { detail: detail.data, summary: summary.data, timeline: timeline.data, loading: detail.isLoading || summary.isLoading };
}

// Component for a single product column
function ProductColumn({ slot, color, index }: { slot: Slot; color: string; index: number }) {
  const router = useRouter();
  const { detail, summary, loading } = useProductData(slot.asin);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Skeleton style={{ height: '80px', borderRadius: '8px' }} />
        <Skeleton style={{ height: '120px', borderRadius: '8px' }} />
        <Skeleton style={{ height: '100px', borderRadius: '8px' }} />
      </div>
    );
  }

  const pieData = summary
    ? Object.entries(summary.sentiment_distribution).map(([label, count]) => ({
        name: label,
        value: count,
        color: SENTIMENT_COLORS[label.toLowerCase()] ?? '#6B7280',
      }))
    : [];

  const ratingDist = summary?.top_reviews
    ? (() => {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        summary.top_reviews!.forEach((r) => { counts[r.rating] = (counts[r.rating] ?? 0) + 1; });
        return [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: counts[r] ?? 0 }));
      })()
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header card */}
      <div style={{
        padding: '14px', borderRadius: '10px', background: `${color}10`,
        border: `1.5px solid ${color}40`, cursor: 'pointer',
      }} onClick={() => router.push(`/products/${slot.asin}`)}>
        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: `${color}99`, marginBottom: '4px' }}>
          #{index + 1} · {slot.asin}
        </div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '8px', lineHeight: 1.4 }}>
          {detail?.title ?? slot.title ?? slot.asin}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {detail?.avg_rating != null && (
            <span style={{ fontSize: '18px', fontWeight: 800, color }}>
              ★ {detail.avg_rating.toFixed(1)}
            </span>
          )}
          {detail?.rating_number != null && (
            <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>
              {detail.rating_number.toLocaleString()} 則評論
            </span>
          )}
          {detail?.brand && (
            <span style={{ fontSize: '11px', color: 'var(--app-text-muted)', background: 'var(--app-bg)', padding: '1px 6px', borderRadius: '4px' }}>
              {detail.brand}
            </span>
          )}
        </div>
      </div>

      {/* Rating distribution */}
      {ratingDist && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            評分分佈
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={ratingDist} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 4 }}>
              <XAxis type="number" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="rating" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${v}★`} />
              <Tooltip contentStyle={{ fontSize: '10px' }} formatter={(v) => [`${v} 則`]} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {ratingDist.map((d) => <Cell key={d.rating} fill={RATING_COLORS[d.rating] ?? '#6B7280'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sentiment pie */}
      {pieData.length > 0 && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            情感分佈
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ResponsiveContainer width={80} height={80}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={36} innerRadius={18}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '10px' }} formatter={(v) => [Number(v).toLocaleString(), 'reviews']} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pieData.map((d) => {
                const total = pieData.reduce((s, x) => s + x.value, 0);
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : '0';
                return (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                    <span style={{ color: d.color, fontWeight: 600, textTransform: 'capitalize' }}>{d.name}</span>
                    <span style={{ color: d.color, fontWeight: 700 }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pros */}
      {summary?.pros && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16A34A', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            優點
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {summary.pros.slice(0, 4).map((p, i) => (
              <li key={i} style={{ display: 'flex', gap: '6px', fontSize: '12px', lineHeight: 1.4 }}>
                <span style={{ color: '#16A34A', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ color: 'var(--app-text)' }}>{p}</span>
              </li>
            ))}
            {summary.pros.length === 0 && <li style={{ color: 'var(--app-text-muted)', fontSize: '12px' }}>無</li>}
          </ul>
        </div>
      )}

      {/* Cons */}
      {summary?.cons && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            缺點
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {summary.cons.slice(0, 4).map((c, i) => (
              <li key={i} style={{ display: 'flex', gap: '6px', fontSize: '12px', lineHeight: 1.4 }}>
                <span style={{ color: '#DC2626', fontWeight: 700, flexShrink: 0 }}>✗</span>
                <span style={{ color: 'var(--app-text)' }}>{c}</span>
              </li>
            ))}
            {summary.cons.length === 0 && <li style={{ color: 'var(--app-text-muted)', fontSize: '12px' }}>無</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// Build unified timeline across all products
function buildUnifiedTimeline(
  slots: Slot[],
  timelines: (ReturnType<typeof useProductData>['timeline'])[],
) {
  const monthSet = new Set<string>();
  timelines.forEach((t) => t?.forEach((p) => monthSet.add(p.month)));
  const months = Array.from(monthSet).sort();

  return months.map((month) => {
    const row: Record<string, unknown> = { month };
    slots.forEach((slot, i) => {
      const pt = timelines[i]?.find((p) => p.month === month);
      row[`avg_${i}`] = pt?.avg_rating ?? null;
    });
    return row;
  });
}

// Combined component to access multiple queries for the timeline overlay
function CompareTimeline({ slots }: { slots: Slot[] }) {
  const data0 = useProductData(slots[0]?.asin ?? '');
  const data1 = useProductData(slots[1]?.asin ?? '');
  const data2 = useProductData(slots[2]?.asin ?? '');

  const timelines = [data0.timeline, data1.timeline, data2.timeline].slice(0, slots.length);
  const unified = buildUnifiedTimeline(slots, timelines);

  if (unified.length < 2) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', borderRadius: '10px', background: 'var(--app-surface)', border: '1px solid var(--app-border)', color: 'var(--app-text-muted)', fontSize: '13px' }}>
        請選擇 2 個以上商品並確認各商品有評論資料以顯示趨勢比較
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', borderRadius: '10px', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--app-text)', marginBottom: '12px' }}>
        評分趨勢比較
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={unified} margin={{ top: 4, right: 32, bottom: 0, left: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={[1, 5]} tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}★`} />
          <Tooltip contentStyle={{ fontSize: '11px' }} formatter={(value, name) => {
            const idx = parseInt(String(name).replace('avg_', ''));
            const label = slots[idx]?.title ?? slots[idx]?.asin ?? String(name);
            return [`${Number(value).toFixed(2)}★`, label];
          }} />
          <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(value) => {
            const idx = parseInt(String(value).replace('avg_', ''));
            return slots[idx]?.title?.slice(0, 20) ?? slots[idx]?.asin ?? value;
          }} />
          {slots.map((_, i) => (
            <Line
              key={i}
              type="monotone"
              dataKey={`avg_${i}`}
              stroke={COLORS[i]}
              strokeWidth={2}
              dot={false}
              connectNulls
              name={`avg_${i}`}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ComparePage() {
  const [slots, setSlots] = useState<Slot[]>([]);

  function addSlot(asin: string, title?: string) {
    if (slots.some((s) => s.asin === asin)) return;
    if (slots.length >= MAX_SLOTS) return;
    setSlots((prev) => [...prev, { asin, title }]);
  }

  function removeSlot(asin: string) {
    setSlots((prev) => prev.filter((s) => s.asin !== asin));
  }

  const gridCols = Math.max(1, slots.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GitCompareArrows size={22} style={{ color: 'var(--app-brand)' }} />
          商品比較
        </h1>
        <p className="text-muted" style={{ marginTop: '4px' }}>並排比較最多 3 個商品的評分、情感與趨勢</p>
      </div>

      {/* Slot selectors */}
      <div data-tour="compare-slots" style={{ display: 'grid', gridTemplateColumns: `repeat(${MAX_SLOTS}, 1fr)`, gap: '12px' }}>
        {Array.from({ length: MAX_SLOTS }).map((_, i) => {
          const slot = slots[i];
          const color = COLORS[i];
          return (
            <div key={i} style={{
              padding: '12px', borderRadius: '10px',
              border: `2px dashed ${slot ? color : 'var(--app-border)'}`,
              background: slot ? `${color}06` : 'transparent',
            }}>
              {slot ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    商品 {i + 1}
                  </span>
                  <button
                    onClick={() => removeSlot(slot.asin)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--app-text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ＋ 新增商品 {i + 1}
                </div>
              )}
              {!slot && (
                <ProductSelectDropdown
                  placeholder="選擇商品…"
                  onSelect={(asin, title) => addSlot(asin, title)}
                />
              )}
              {slot && (
                <div style={{ fontSize: '12px', color: 'var(--app-text)', fontWeight: 600, lineHeight: 1.4 }}>
                  {slot.title ?? slot.asin}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {slots.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--app-text-muted)' }}>
          <GitCompareArrows size={48} style={{ color: 'var(--app-border)', marginBottom: '12px' }} />
          <div style={{ fontSize: '14px' }}>請選擇 2–3 個商品開始比較</div>
        </div>
      )}

      {/* Comparison columns */}
      {slots.length >= 1 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: '16px',
          alignItems: 'start',
        }}>
          {slots.map((slot, i) => (
            <ProductColumn key={slot.asin} slot={slot} color={COLORS[i]} index={i} />
          ))}
        </div>
      )}

      {/* Timeline overlay (needs 2+ products with data) */}
      {slots.length >= 2 && <CompareTimeline slots={slots} />}
    </div>
  );
}
