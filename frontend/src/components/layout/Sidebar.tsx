'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Package,
  FileText,
  Sparkles,
  BarChart3,
  GitBranch,
  FlaskConical,
  ChevronLeft,
  ChevronRight,
  Play,
  GitCompareArrows,
  ScatterChart,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const navGroups = [
    {
      group: t('nav.group.platform'),
      items: [
        { label: t('nav.overview'), href: '/', icon: <LayoutDashboard size={16} /> },
        { label: t('nav.demo'), href: '/demo', icon: <Play size={16} /> },
      ],
    },
    {
      group: t('nav.group.search'),
      items: [
        { label: t('nav.search'), href: '/search', icon: <Search size={16} /> },
        { label: t('nav.products'), href: '/products', icon: <Package size={16} /> },
      ],
    },
    {
      group: t('nav.group.intelligence'),
      items: [
        { label: t('nav.reviews'), href: '/reviews', icon: <FileText size={16} /> },
        { label: t('nav.recommendations'), href: '/recommendations', icon: <Sparkles size={16} /> },
        { label: '商品比較', href: '/compare', icon: <GitCompareArrows size={16} /> },
      ],
    },
    {
      group: t('nav.group.data'),
      items: [
        { label: t('nav.analytics'), href: '/analytics', icon: <BarChart3 size={16} /> },
        { label: 'Embedding 聚類', href: '/analytics/clusters', icon: <ScatterChart size={16} /> },
        { label: t('nav.pipeline'), href: '/pipeline', icon: <GitBranch size={16} /> },
        { label: t('nav.evaluation'), href: '/evaluation', icon: <FlaskConical size={16} /> },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo area */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 12px',
          borderBottom: '1px solid var(--app-border)',
          gap: '10px',
          minHeight: '56px',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              background: 'var(--app-brand)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <BarChart3 size={16} color="white" />
          </div>
          {!collapsed && (
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: 'var(--app-text)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Review Intelligence
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--app-text-muted)',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--app-text-muted)',
              display: 'flex',
              alignItems: 'center',
              borderRadius: '4px',
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav style={{ flex: 1, paddingTop: '8px' }}>
        {navGroups.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <div className="nav-group-label">{group.group}</div>
            )}
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive(item.href) ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
                style={collapsed ? { justifyContent: 'center', padding: '8px' } : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
