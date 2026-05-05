type Props = {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
};

export default function Sparkline({
  values,
  width = 120,
  height = 36,
  color = "#fff",
  fillOpacity = 0.25,
}: Props) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const padTop = 2;
  const padBottom = 2;
  const usableH = height - padTop - padBottom;

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = padTop + (1 - (v - min) / range) * usableH;
    return { x, y };
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={area} fill={color} opacity={fillOpacity} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
