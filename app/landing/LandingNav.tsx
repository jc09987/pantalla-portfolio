import Link from "next/link";

const LINKS = [
  { href: "/#demo", label: "Demo" },
  { href: "/#eval", label: "Eval" },
  { href: "/v/la-michoacana", label: "TV" },
];

export function LandingNav() {
  return (
    <header className="landing-nav">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-sm font-black tracking-[0.28em] text-pink-600">
          PANTALLA
        </Link>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-bold text-zinc-600 hover:text-zinc-900"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/admin/login"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
