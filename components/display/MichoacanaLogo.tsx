export function MichoacanaLogo({ size = 148 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 160 160" aria-hidden="true">
      <circle cx="80" cy="80" r="78" fill="#fff" stroke="#e91e8c" strokeWidth="4" />
      <circle cx="80" cy="80" r="70" fill="#fff5fa" />
      <path d="M40 118 L80 42 L120 118 Z" fill="#e91e8c" />
      <rect x="68" y="78" width="24" height="40" fill="#fff" />
      <rect x="72" y="86" width="7" height="10" fill="#e91e8c" />
      <rect x="81" y="86" width="7" height="10" fill="#e91e8c" />
      <circle cx="52" cy="46" r="10" fill="#ffd54a" />
      <circle cx="80" cy="32" r="11" fill="#ff6ba8" />
      <circle cx="108" cy="46" r="10" fill="#7ed957" />
      <path d="M48 56 L52 70 L56 56" fill="#c9a227" />
      <path d="M76 42 L80 58 L84 42" fill="#c9a227" />
      <path d="M104 56 L108 70 L112 56" fill="#c9a227" />
    </svg>
  );
}
