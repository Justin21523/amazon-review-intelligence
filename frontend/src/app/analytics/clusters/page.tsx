'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { fetchEmbeddings2d } from '@/lib/api';
import type { ClusterPoint } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink } from 'lucide-react';

const CATEGORY_COLORS = [
  '#2563EB', '#0D9488', '#7C3AED', '#D97706', '#DC2626',
  '#059669', '#EA580C', '#0891B2', '#65A30D', '#6B7280',
];

interface KwCategory {
  name: string;
  keywords: string[];
}

const KW_CATEGORIES: KwCategory[] = [
  { name: 'Coffee & Tea', keywords: ['coffee', 'espresso', 'tea', 'kettle', 'brewer', 'french press', 'moka', 'pour over', 'infuser', 'teapot', 'caffeine', 'latte', 'cappuccino'] },
  { name: 'Cookware',     keywords: ['pan', 'pot ', 'skillet', 'wok', 'dutch oven', 'cast iron', 'saute', 'griddle', 'casserole', 'frying', 'saucepan', 'stockpot'] },
  { name: 'Cutlery',      keywords: ['knife', 'knives', 'blade', 'sharpener', 'cleaver', 'peeler', 'cutting board', 'chopping board', 'filet', 'paring'] },
  { name: 'Food Prep',    keywords: ['blender', 'mixer', 'processor', 'grinder', 'mandoline', 'chopper', 'slicer', 'juicer', 'food mill', 'strainer', 'colander'] },
  { name: 'Bakeware',     keywords: ['bak', 'cake', 'muffin', 'loaf', 'cookie', 'rolling pin', 'pastry', 'pie', 'springform', 'bundt', 'brownie', 'dough'] },
  { name: 'Storage',      keywords: ['container', 'storage', 'jar', 'canister', 'seal', 'bag ', 'wrap', 'tupperware', 'mason', 'airtight', 'vacuum'] },
  { name: 'Dining',       keywords: ['plate', 'bowl', 'glass', 'mug', 'cup', 'dish', 'serving', 'platter', 'dinnerware', 'salad', 'tumbler', 'goblet'] },
  { name: 'Appliances',   keywords: ['toaster', 'air fryer', 'instant pot', 'pressure cooker', 'slow cooker', 'rice cooker', 'microwave', 'oven', 'waffle', 'grill', 'sandwich maker'] },
  { name: 'Thermometers', keywords: ['thermometer', 'scale', 'timer', 'measure', 'temperature', 'gauge', 'probe', 'digital', 'hygrometer'] },
  { name: 'Other',        keywords: [] },
];

function classifyProduct(title: string | null | undefined): string {
  const lower = (title ?? '').toLowerCase();
  for (const cat of KW_CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.name;
  }
  return 'Other';
}

const CAT_COLOR_MAP: Record<string, string> = Object.fromEntries(
  KW_CATEGORIES.map((c, i) => [c.name, CATEGORY_COLORS[i % CATEGORY_COLORS.length]]),
);

interface EnrichedPoint extends ClusterPoint {
  subCategory: string;
}

const LIMIT_OPTIONS = [1000, 3000, 5000];


function InsightPanel({
  selectedCategory,
  clickedPoint,
  groupStats,
  router,
}: {
  selectedCategory: string | null;
  clickedPoint: EnrichedPoint | null;
  groupStats: { category: string; count: number; avgRating: number; top5: EnrichedPoint[] }[];
  router: ReturnType<typeof useRouter>;
}) {
  const catStat = selectedCategory
    ? groupStats.find((g) => g.category === selectedCategory)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Hovered/clicked point detail */}
      {clickedPoint && (
        <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--app-surface)', border: `2px solid ${CAT_COLOR_MAP[clickedPoint.subCategory]}40` }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: CAT_COLOR_MAP[clickedPoint.subCategory], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
            {clickedPoint.subCategory}
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--app-text)', lineHeight: 1.4, marginBottom: '6px' }}>
            {clickedPoint.title && clickedPoint.title.length > 5 ? clickedPoint.title.slice(0, 60) + (clickedPoint.title.length > 60 ? '…' : '') : clickedPoint.asin}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--app-text-muted)', marginBottom: '8px' }}>{clickedPoint.asin}</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '10px' }}>
            {clickedPoint.avg_rating != null && (
              <span style={{ color: '#D97706', fontWeight: 700, fontSize: '13px' }}>★ {clickedPoint.avg_rating.toFixed(1)}</span>
            )}
            {clickedPoint.rating_number != null && (
              <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>{clickedPoint.rating_number.toLocaleString()} 則</span>
            )}
          </div>
          <button
            onClick={() => router.push(`/products/${clickedPoint.asin}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '6px', border: 'none',
              background: CAT_COLOR_MAP[clickedPoint.subCategory],
              color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            <ExternalLink size={11} /> 前往商品頁
          </button>
        </div>
      )}

      {/* Category stats */}
      {catStat && (
        <div style={{ padding: '12px', borderRadius: '8px', background: `${CAT_COLOR_MAP[catStat.category]}08`, border: `1px solid ${CAT_COLOR_MAP[catStat.category]}30` }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: CAT_COLOR_MAP[catStat.category], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {catStat.category} 統計
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: CAT_COLOR_MAP[catStat.category] }}>{catStat.count.toLocaleString()}</div>
              <div style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>商品數量</div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#D97706' }}>★{catStat.avgRating.toFixed(2)}</div>
              <div style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>平均評分</div>
            </div>
          </div>
          {catStat.top5.length > 0 && (
            <>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--app-text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>高評分商品 Top 5</div>
              {catStat.top5.map((p, i) => (
                <div
                  key={p.asin}
                  style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px', cursor: 'pointer' }}
                  onClick={() => router.push(`/products/${p.asin}`)}
                >
                  <span style={{ fontSize: '10px', color: 'var(--app-text-muted)', minWidth: '14px' }}>#{i + 1}</span>
                  <span style={{ fontSize: '11px', color: 'var(--app-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {p.title && p.title.length > 5 ? p.title.slice(0, 30) + '…' : p.asin}
                  </span>
                  <span style={{ fontSize: '10px', color: '#D97706', fontWeight: 700, flexShrink: 0 }}>★{(p.avg_rating ?? 0).toFixed(1)}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* All category distribution */}
      <div style={{ padding: '12px', borderRadius: '8px', background: 'var(--app-surface)', border: '1px solid var(--app-border)' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--app-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
          分類分佈
        </div>
        {groupStats.map(({ category, count }) => {
          const total = groupStats.reduce((s, g) => s + g.count, 0);
          const pct = total > 0 ? (count / total) * 100 : 0;
          const color = CAT_COLOR_MAP[category];
          return (
            <div key={category} style={{ marginBottom: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ fontSize: '10px', color, fontWeight: 600 }}>{category}</span>
                <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>{pct.toFixed(0)}%</span>
              </div>
              <div style={{ height: '4px', background: 'var(--app-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
              </div>
            </div>
          );
        })}
      </div>

      {!clickedPoint && !catStat && (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--app-text-muted)', fontSize: '12px', borderRadius: '8px', border: '1px dashed var(--app-border)' }}>
          點擊圖表上的散點<br />查看商品詳情
        </div>
      )}
    </div>
  );
}

export default function ClustersPage() {
  const router = useRouter();
  const [limit, setLimit] = useState(3000);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [clickedPoint, setClickedPoint] = useState<EnrichedPoint | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['embeddings-2d', limit],
    queryFn: () => fetchEmbeddings2d(limit),
    staleTime: Infinity,
  });

  const { groupedData, groupStats } = useMemo(() => {
    if (!data) return { groupedData: [], groupStats: [] };

    const enriched: EnrichedPoint[] = data.map((pt) => ({
      ...pt,
      subCategory: classifyProduct(pt.title),
    }));

    const catMap = new Map<string, EnrichedPoint[]>();
    for (const cat of KW_CATEGORIES) {
      catMap.set(cat.name, []);
    }
    for (const pt of enriched) {
      catMap.get(pt.subCategory)!.push(pt);
    }

    const groups = KW_CATEGORIES
      .filter((cat) => (catMap.get(cat.name)?.length ?? 0) > 0)
      .map((cat) => ({
        category: cat.name,
        color: CAT_COLOR_MAP[cat.name],
        points: catMap.get(cat.name)!,
      }));

    const stats = groups.map(({ category, points }) => {
      const withRating = points.filter((p) => p.avg_rating != null);
      const avgRating = withRating.length > 0
        ? withRating.reduce((s, p) => s + p.avg_rating!, 0) / withRating.length
        : 0;
      const top5 = [...withRating].sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)).slice(0, 5);
      return { category, count: points.length, avgRating, top5 };
    });

    return { groupedData: groups, groupStats: stats };
  }, [data]);

  const handleClickPoint = useCallback((data: Record<string, unknown>) => {
    const pt = data as unknown as EnrichedPoint;
    setClickedPoint(pt);
    setSelectedCategory(pt.subCategory);
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Skeleton style={{ height: '40px', borderRadius: '8px', width: '300px' }} />
        <Skeleton style={{ height: '500px', borderRadius: '12px' }} />
      </div>
    );
  }

  if (error || !data || data.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--app-text-muted)' }}>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>尚未生成 UMAP 資料</div>
        <p style={{ fontSize: '13px', marginBottom: '8px' }}>請先停止後端，然後執行：</p>
        <code style={{ display: 'block', padding: '10px 16px', background: '#1E293B', color: '#E2E8F0', borderRadius: '8px', fontSize: '12px', textAlign: 'left' }}>
          python -m src.features.compute_umap
        </code>
        <p style={{ fontSize: '13px', marginTop: '8px', color: 'var(--app-text-muted)' }}>
          計算完成後重啟後端即可顯示（約需 3–5 分鐘）。
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 className="page-title">Embedding 聚類視覺化</h1>
          <p className="text-muted" style={{ marginTop: '4px' }}>
            UMAP 2D 投影 · {data.length.toLocaleString()} 個商品 · 依關鍵字自動分類 · 點擊查看詳情
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {LIMIT_OPTIONS.map((l) => (
            <button
              key={l}
              onClick={() => setLimit(l)}
              style={{
                padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--app-border)',
                background: limit === l ? 'var(--app-brand)' : 'var(--app-surface)',
                color: limit === l ? '#fff' : 'var(--app-text-muted)',
                fontSize: '11px', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {l.toLocaleString()} 點
            </button>
          ))}
        </div>
      </div>

      {/* Category filter legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
        {groupedData.map(({ category, color, points }) => (
          <button
            key={category}
            onClick={() => { setSelectedCategory(selectedCategory === category ? null : category); setClickedPoint(null); }}
            style={{
              padding: '3px 9px', borderRadius: '20px', border: '1px solid',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
              background: selectedCategory === null || selectedCategory === category ? `${color}18` : 'transparent',
              color: selectedCategory === null || selectedCategory === category ? color : 'var(--app-text-muted)',
              borderColor: selectedCategory === null || selectedCategory === category ? `${color}60` : 'var(--app-border)',
              opacity: selectedCategory !== null && selectedCategory !== category ? 0.4 : 1,
            }}
          >
            {category} ({points.length})
          </button>
        ))}
        {selectedCategory && (
          <button
            onClick={() => { setSelectedCategory(null); setClickedPoint(null); }}
            style={{ padding: '3px 9px', borderRadius: '20px', border: '1px solid var(--app-border)', fontSize: '11px', cursor: 'pointer', color: 'var(--app-text-muted)', background: 'transparent' }}
          >
            ✕ 全部
          </button>
        )}
      </div>

      {/* Main: chart (left) + insight panel (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '16px', alignItems: 'start' }}>
        <div data-tour="cluster-chart" className="ari-card" style={{ padding: '12px' }}>
          <ResponsiveContainer width="100%" height={520}>
            <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <XAxis
                type="number" dataKey="x" name="UMAP-1"
                tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number" dataKey="y" name="UMAP-2"
                tick={{ fontSize: 9, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                domain={['auto', 'auto']}
              />
              <ZAxis type="number" dataKey="rating_number" range={[15, 200]} name="評論數" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as EnrichedPoint;
                  return (
                    <div style={{
                      background: 'var(--app-surface)', border: '1px solid var(--app-border)',
                      borderRadius: '8px', padding: '8px 12px', fontSize: '12px', maxWidth: '200px',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    }}>
                      <div style={{ fontWeight: 700, fontSize: '11px', color: CAT_COLOR_MAP[d.subCategory], marginBottom: '3px' }}>{d.subCategory}</div>
                      <div style={{ fontWeight: 600, color: 'var(--app-text)', lineHeight: 1.4, marginBottom: '4px' }}>
                        {d.title && d.title.length > 5 ? d.title.slice(0, 45) + '…' : d.asin}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                        {d.avg_rating != null && <span style={{ color: '#D97706', fontWeight: 700 }}>★ {d.avg_rating.toFixed(1)}</span>}
                        {d.rating_number != null && <span style={{ color: 'var(--app-text-muted)' }}>{d.rating_number} 則</span>}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--app-text-muted)', marginTop: '2px' }}>點擊查看詳情</div>
                    </div>
                  );
                }}
              />
              {groupedData
                .filter(({ category }) => selectedCategory === null || category === selectedCategory)
                .map(({ category, color, points }) => (
                  <Scatter
                    key={category}
                    name={category}
                    data={points}
                    fill={color}
                    fillOpacity={selectedCategory === category ? 0.85 : 0.5}
                    onClick={(data) => handleClickPoint(data as unknown as Record<string, unknown>)}
                    style={{ cursor: 'pointer' }}
                  />
                ))
              }
            </ScatterChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '10px', color: 'var(--app-text-muted)', textAlign: 'center', marginTop: '4px' }}>
            點擊散點 → 右側面板查看詳情 · 顏色代表關鍵字自動分類
          </p>
        </div>

        {/* Insight Panel */}
        <InsightPanel
          selectedCategory={selectedCategory}
          clickedPoint={clickedPoint}
          groupStats={groupStats}
          router={router}
        />
      </div>
    </div>
  );
}
