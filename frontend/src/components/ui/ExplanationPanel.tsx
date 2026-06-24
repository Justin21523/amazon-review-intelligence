'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExplanationPanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function ExplanationPanel({ title, children, defaultOpen = false }: ExplanationPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: '#F8FAFF',
        border: '1px solid #DBEAFE',
        borderRadius: '10px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E40AF' }}>{title}</span>
        <ChevronDown
          size={16}
          color="#3B82F6"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}
        />
      </button>
      {open && (
        <div
          style={{
            padding: '0 18px 16px',
            fontSize: '13px',
            color: '#374151',
            lineHeight: '1.6',
            borderTop: '1px solid #DBEAFE',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
