'use client';

interface KpiCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  iconBg?: string;
  trend?: string;
}

export default function KpiCard({ icon, value, label, iconBg = '#EFF6FF', trend }: KpiCardProps) {
  const displayValue =
    typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <div className="kpi-value">{displayValue}</div>
      <div className="kpi-label">{label}</div>
      {trend && (
        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{trend}</div>
      )}
    </div>
  );
}
