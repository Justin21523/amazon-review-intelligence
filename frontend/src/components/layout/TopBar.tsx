'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { fetchHealth } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Locale } from '@/lib/i18n';

export default function TopBar() {
  const router = useRouter();
  const { t, locale, setLocale } = useLanguage();
  const [query, setQuery] = useState('');
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  function toggleLocale() {
    const next: Locale = locale === 'zh-TW' ? 'en' : 'zh-TW';
    setLocale(next);
  }

  return (
    <header className="app-topbar">
      {/* Center: search input */}
      <div style={{ flex: 1, maxWidth: '480px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('topbar.placeholder')}
          style={{
            width: '100%',
            padding: '7px 14px',
            border: '1px solid var(--app-border)',
            borderRadius: '8px',
            fontSize: '13px',
            background: 'var(--app-bg)',
            color: 'var(--app-text)',
            outline: 'none',
          }}
        />
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        {/* Dataset badge */}
        <span
          style={{
            fontSize: '12px',
            color: 'var(--app-text-muted)',
            background: 'var(--app-bg)',
            border: '1px solid var(--app-border)',
            borderRadius: '6px',
            padding: '4px 10px',
            whiteSpace: 'nowrap',
          }}
        >
          {t('topbar.dataset')}
        </span>

        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          title={locale === 'zh-TW' ? 'Switch to English' : '切換至中文'}
          style={{
            fontSize: '12px',
            fontWeight: 600,
            padding: '4px 10px',
            border: '1px solid var(--app-border)',
            borderRadius: '6px',
            background: 'var(--app-bg)',
            color: 'var(--app-brand)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {locale === 'zh-TW' ? 'EN' : '中文'}
        </button>

        {/* Status dot */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--app-text-muted)' }}
          title={apiOk === null ? t('topbar.checking') : apiOk ? t('topbar.live') : t('topbar.offline')}
        >
          <span
            className={`status-dot ${apiOk === true ? 'ok' : apiOk === false ? 'error' : 'warning'}`}
          />
          {apiOk === true ? t('topbar.live') : apiOk === false ? t('topbar.offline') : t('topbar.checking')}
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center' }}
          title="GitHub"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </header>
  );
}
