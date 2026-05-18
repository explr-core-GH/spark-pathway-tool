import { RIASEC, type RIASECCode } from "@/lib/riasec";

type Props = {
  size?: number;
  active?: RIASECCode | null;
  onSelect?: (code: RIASECCode) => void;
};

// 6 vertices of a regular hexagon, top-most first, clockwise.
// hexAngle in riasec.ts: 0 = top, +60° clockwise.
function vertex(angleDeg: number, r: number) {
  // 0° -> top (-y). screen y axis points down, so y = -cos.
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.sin(rad) * r, y: -Math.cos(rad) * r };
}

export function HollandHexagon({ size = 360, active, onSelect }: Props) {
  const r = size * 0.36;
  const cx = size / 2;
  const cy = size / 2;
  const codes = Object.values(RIASEC).sort((a, b) => a.hexAngle - b.hexAngle);
  const points = codes.map((d) => {
    const p = vertex(d.hexAngle, r);
    return { ...d, x: cx + p.x, y: cy + p.y };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none">
      {/* outer hexagon outline */}
      <path d={path} fill="none" stroke="var(--color-charcoal-200)" strokeWidth={1} />
      {/* contrast diagonals (R↔S, I↔E, A↔C) */}
      {[0, 1, 2].map((i) => {
        const a = points[i];
        const b = points[i + 3];
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="var(--color-charcoal-100)"
            strokeWidth={1}
          />
        );
      })}
      {points.map((p) => {
        const isActive = active === p.code;
        const dotR = isActive ? 26 : 22;
        return (
          <g
            key={p.code}
            transform={`translate(${p.x},${p.y})`}
            style={{ cursor: onSelect ? "pointer" : "default" }}
            onClick={() => onSelect?.(p.code)}
          >
            <circle r={dotR + 4} fill={p.colorSoft} />
            <circle r={dotR} fill={p.color} />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontFamily="Lexend, sans-serif"
              fontSize={20}
              fontWeight={500}
              fill="white"
            >
              {p.code}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
