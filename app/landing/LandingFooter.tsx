import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white text-zinc-600">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <p className="text-sm font-black tracking-[0.28em] text-pink-600">PANTALLA</p>
        <nav className="flex flex-wrap gap-4 text-sm font-bold">
          <Link href="/#demo" className="hover:text-zinc-900">
            Demo
          </Link>
          <Link href="/#eval" className="hover:text-zinc-900">
            Eval
          </Link>
          <Link href="/v/la-michoacana" className="hover:text-zinc-900">
            Full-screen TV
          </Link>
          <Link href="/admin/login" className="hover:text-zinc-900">
            Admin
          </Link>
        </nav>
      </div>
    </footer>
  );
}
