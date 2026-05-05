"use client";

import { useState } from "react";

type Props = {
  ano: number;
  mes: number;
  valoresPorDia: Record<number, number>;
  formatValue?: (v: number) => string;
};

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

export default function CalendarHeatmap({ ano, mes, valoresPorDia, formatValue = String }: Props) {
  const [hoverDay, setHoverDay] = useState<number | null>(null);

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const primeiraDOW = new Date(ano, mes - 1, 1).getDay();
  const max = Math.max(1, ...Object.values(valoresPorDia));

  function intensidade(v: number): string {
    if (v <= 0) return "bg-gray-50";
    const frac = v / max;
    if (frac < 0.2) return "bg-primary/15";
    if (frac < 0.4) return "bg-primary/30";
    if (frac < 0.6) return "bg-primary/50";
    if (frac < 0.8) return "bg-primary/75";
    return "bg-primary";
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < primeiraDOW; i++) cells.push(null);
  for (let d = 1; d <= diasNoMes; d++) cells.push(d);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-2">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i} className="text-[10px] text-text-muted text-center font-medium">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const v = valoresPorDia[d] || 0;
          return (
            <div
              key={i}
              onMouseEnter={() => setHoverDay(d)}
              onMouseLeave={() => setHoverDay(null)}
              className={`aspect-square rounded-md ${intensidade(v)} flex items-center justify-center text-[10px] font-medium ${v > 0 ? (v / max > 0.5 ? "text-white" : "text-text-main") : "text-text-muted"} cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="text-text-muted">Menos</span>
          <span className="w-3 h-3 rounded-sm bg-gray-50" />
          <span className="w-3 h-3 rounded-sm bg-primary/15" />
          <span className="w-3 h-3 rounded-sm bg-primary/30" />
          <span className="w-3 h-3 rounded-sm bg-primary/50" />
          <span className="w-3 h-3 rounded-sm bg-primary/75" />
          <span className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-text-muted">Mais</span>
        </div>
        {hoverDay !== null && valoresPorDia[hoverDay] > 0 && (
          <span className="text-text-main font-medium">
            Dia {hoverDay}: {formatValue(valoresPorDia[hoverDay])}
          </span>
        )}
      </div>
    </div>
  );
}
