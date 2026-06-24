'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import { fetchHealth } from '@/lib/api';

export default function TopBar() {
  const router = useRouter();
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

  return (
    <header className="app-topbar">
      {/* Center: search input */}
      <div style={{ flex: 1, maxWidth: '480px' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search products by ASIN or keyword..."
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
          🏠 Home &amp; Kitchen · 83K products
        </span>

        {/* Status dot */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--app-text-muted)' }}
          title={apiOk === null ? 'Checking API...' : apiOk ? 'API online' : 'API offline'}
        >
          <span
            className={`status-dot ${apiOk === true ? 'ok' : apiOk === false ? 'error' : 'warning'}`}
          />
          {apiOk === true ? 'Live' : apiOk === false ? 'Offline' : '...'}
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
