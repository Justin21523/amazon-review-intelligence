'use client';

interface Chip {
  label: string;
  value: string;
}

interface PresetChipsProps {
  chips: Chip[];
  onSelect: (value: string) => void;
  selected?: string;
  label?: string;
}

export default function PresetChips({ chips, onSelect, selected, label }: PresetChipsProps) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
      {label && (
        <span style={{ fontSize: '12px', color: 'var(--app-text-muted)', flexShrink: 0 }}>
          {label}
        </span>
      )}
      {chips.map((chip) => {
        const isActive = selected === chip.value;
        return (
          <button
            key={chip.value}
            onClick={() => onSelect(chip.value)}
            style={{
              padding: '4px 12px',
              borderRadius: '20px',
              border: '1px solid',
              fontSize: '12px',
              fontWeight: isActive ? 600 : 400,
              cursor: 'pointer',
              background: isActive ? 'var(--app-brand)' : 'var(--app-surface)',
              color: isActive ? '#fff' : 'var(--app-text-muted)',
              borderColor: isActive ? 'var(--app-brand)' : 'var(--app-border)',
              transition: 'all 0.12s',
              whiteSpace: 'nowrap',
            }}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
