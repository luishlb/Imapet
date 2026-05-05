"use client";

import { useState } from "react";

export type DonutSlice = { label: string; value: number; color: string };

type Props = {
  data: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  formatValue?: (v: number) => string;
  centerLabel?: string;
  centerValue?: string;
};

export default function DonutChart({
  data,
  size = 200,
  strokeWidth = 36,
  formatValue = (v) => String(v),
  centerLabel = "Total",
  centerValue,
}: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0 || data.length === 0) {
    return <p className="text-sm text-text-muted text-center py-10">Sem dados.</p>;
  }

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;

  let acc = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const dash = frac * circ;
    const offset = circ - acc * circ;
    acc += frac;
    return { ...d, idx: i, frac, dash, offset, gap: circ - dash };
  });

  const hp = hoverIdx !== null ? segments[hoverIdx] : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={cx}
              cy={cy}
              r={r}
              fill="transparent"
              stroke={s.color}
              strokeWidth={hoverIdx === s.idx ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              opacity={hoverIdx !== null && hoverIdx !== s.idx ? 0.35 : 1}
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoverIdx(s.idx)}
              onMouseLeave={() => setHoverIdx(null)}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
            {hp ? hp.label : centerLabel}
          </p>
          <p className="font-playfair text-xl font-bold text-text-main mt-0.5">
            {hp ? formatValue(hp.value) : centerValue ?? formatValue(total)}
          </p>
          {hp && (
            <p className="text-[11px] text-text-muted mt-0.5">{(hp.frac * 100).toFixed(1)}%</p>
          )}
        </div>
      </div>

      <div className="flex-1 w-full space-y-2">
        {segments.map((s) => (
          <div
            key={s.label}
            onMouseEnter={() => setHoverIdx(s.idx)}
            onMouseLeave={() => setHoverIdx(null)}
            className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
              hoverIdx === s.idx ? "bg-gray-50" : ""
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="text-xs font-medium text-text-main truncate">{s.label}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[11px] text-text-muted">{(s.frac * 100).toFixed(1)}%</span>
              <span className="text-xs font-semibold text-text-main w-20 text-right">{formatValue(s.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
