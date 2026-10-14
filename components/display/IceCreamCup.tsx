type IceCreamCupProps = {
  scoopColors: string[];
  size?: "sm" | "md" | "lg";
  garnish?: "mango" | "fresa" | "none";
};

const SIZES = {
  sm: { w: 108, h: 118, cup: 78 },
  md: { w: 168, h: 188, cup: 118 },
  lg: { w: 280, h: 320, cup: 188 },
} as const;

export function IceCreamCup({
  scoopColors,
  size = "sm",
  garnish = "none",
}: IceCreamCupProps) {
  const dim = SIZES[size];
  const colors = scoopColors.slice(0, 3);
  const cupTop = dim.h * 0.42;

  return (
    <svg
      width={dim.w}
      height={dim.h}
      viewBox={`0 0 ${dim.w} ${dim.h}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      {garnish === "mango" ? <MangoGarnish width={dim.w} height={dim.h} /> : null}
      {garnish === "fresa" ? <FresaGarnish width={dim.w} height={dim.h} /> : null}

      {colors.map((color, index) => {
        const r = dim.cup * (0.28 - index * 0.015);
        const spread = colors.length === 1 ? 0 : (index - (colors.length - 1) / 2) * r * 0.95;
        const cx = dim.w / 2 + spread;
        const cy = cupTop - r * 0.35 + (index === 2 ? -r * 0.55 : 0);
        return (
          <g key={`${color}-${index}`}>
            <ellipse cx={cx} cy={cy + r * 0.12} rx={r * 1.02} ry={r * 0.95} fill={color} />
            <ellipse
              cx={cx - r * 0.28}
              cy={cy - r * 0.22}
              rx={r * 0.38}
              ry={r * 0.22}
              fill="rgba(255,255,255,0.38)"
            />
          </g>
        );
      })}

      <path
        d={`M ${dim.w / 2 - dim.cup * 0.42} ${cupTop + 6}
            L ${dim.w / 2 - dim.cup * 0.34} ${dim.h - 8}
            Q ${dim.w / 2} ${dim.h + 4} ${dim.w / 2 + dim.cup * 0.34} ${dim.h - 8}
            L ${dim.w / 2 + dim.cup * 0.42} ${cupTop + 6}
            Z`}
        fill="#fff7fb"
        stroke="#d9c3d0"
        strokeWidth="2"
      />
      <ellipse
        cx={dim.w / 2}
        cy={cupTop + 8}
        rx={dim.cup * 0.44}
        ry={10}
        fill="#ffe4f2"
        stroke="#e91e8c"
        strokeWidth="2"
      />
      <circle
        cx={dim.w / 2}
        cy={cupTop + dim.cup * 0.38}
        r={dim.cup * 0.11}
        fill="#e91e8c"
      />
    </svg>
  );
}

function MangoGarnish({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <ellipse cx={width * 0.16} cy={height * 0.62} rx={28} ry={16} fill="#f5b942" transform={`rotate(-28 ${width * 0.16} ${height * 0.62})`} />
      <ellipse cx={width * 0.84} cy={height * 0.7} rx={24} ry={14} fill="#ffcc4d" transform={`rotate(22 ${width * 0.84} ${height * 0.7})`} />
      <path d={`M ${width * 0.12} ${height * 0.28} C ${width * 0.02} ${height * 0.18}, ${width * 0.2} ${height * 0.08}, ${width * 0.28} ${height * 0.22}`} fill="#3d8c4a" />
      <path d={`M ${width * 0.78} ${height * 0.18} C ${width * 0.92} ${height * 0.08}, ${width * 0.96} ${height * 0.28}, ${width * 0.82} ${height * 0.3}`} fill="#2f7a3e" />
    </g>
  );
}

function FresaGarnish({ width, height }: { width: number; height: number }) {
  return (
    <g>
      <path d={`M ${width * 0.14} ${height * 0.58} C ${width * 0.02} ${height * 0.48}, ${width * 0.08} ${height * 0.72}, ${width * 0.2} ${height * 0.78} C ${width * 0.3} ${height * 0.7}, ${width * 0.26} ${height * 0.5}, ${width * 0.14} ${height * 0.58}`} fill="#e53935" />
      <path d={`M ${width * 0.86} ${height * 0.52} C ${width * 0.74} ${height * 0.44}, ${width * 0.78} ${height * 0.7}, ${width * 0.9} ${height * 0.74} C ${width * 0.98} ${height * 0.64}, ${width * 0.96} ${height * 0.44}, ${width * 0.86} ${height * 0.52}`} fill="#d32f2f" />
      <ellipse cx={width * 0.2} cy={height * 0.84} rx={22} ry={12} fill="#ffb74d" transform={`rotate(-18 ${width * 0.2} ${height * 0.84})`} />
      <path d={`M ${width * 0.12} ${height * 0.5} L ${width * 0.18} ${height * 0.42} L ${width * 0.24} ${height * 0.5}`} fill="#2e7d32" />
      <path d={`M ${width * 0.82} ${height * 0.44} L ${width * 0.88} ${height * 0.34} L ${width * 0.94} ${height * 0.44}`} fill="#388e3c" />
    </g>
  );
}
