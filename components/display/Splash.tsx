export function WaterSplash({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 140"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        fill="#00b0e0"
        d="M0 90 C 40 40, 80 120, 130 70 C 170 30, 210 110, 260 65 C 310 20, 350 115, 410 72 C 460 38, 510 108, 560 68 C 600 42, 630 88, 640 70 L640 140 L0 140 Z"
      />
      <path
        fill="#4dd0f0"
        d="M0 108 C 70 70, 140 130, 220 90 C 280 58, 340 128, 420 96 C 500 64, 560 120, 640 92 L640 140 L0 140 Z"
      />
      <circle cx="92" cy="48" r="10" fill="#00b0e0" />
      <circle cx="318" cy="36" r="8" fill="#4dd0f0" />
      <circle cx="508" cy="52" r="12" fill="#00b0e0" />
    </svg>
  );
}

export function MilkSplash({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 640 140"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <path
        fill="#ff4fa3"
        d="M0 88 C 50 38, 100 118, 160 72 C 210 34, 250 112, 310 68 C 360 28, 410 118, 470 74 C 520 40, 570 110, 640 66 L640 140 L0 140 Z"
      />
      <path
        fill="#ff8ac4"
        d="M0 110 C 80 72, 150 128, 230 92 C 300 62, 370 126, 450 98 C 530 70, 590 118, 640 94 L640 140 L0 140 Z"
      />
      <circle cx="120" cy="44" r="11" fill="#ff4fa3" />
      <circle cx="360" cy="32" r="9" fill="#ff8ac4" />
      <circle cx="540" cy="48" r="13" fill="#ff4fa3" />
    </svg>
  );
}
