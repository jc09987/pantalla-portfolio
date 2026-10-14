"use client";

import { switchStore } from "@/app/admin/onboarding/actions";
import { SignOutButton } from "@/app/admin/SignOutButton";
import { BusyOverlay } from "@/app/admin/ui";
import type { StoreMembership } from "@/lib/store/session";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

const NAV = [
  { href: "/admin", id: "menu", label: "Menú" },
  { href: "/admin/layout", id: "layout", label: "Diseño" },
  { href: "/admin/branding", id: "branding", label: "Marca" },
  { href: "/admin/media", id: "media", label: "Medios" },
  { href: "/admin/team", id: "team", label: "Soporte" },
] as const;

export type AdminNavId = (typeof NAV)[number]["id"] | "automations";

function NavPendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <div className="admin-page-progress" />;
}

export function AdminHeader({
  email,
  current,
  store,
  stores = [],
}: {
  email: string;
  current: AdminNavId;
  store?: StoreMembership;
  stores?: StoreMembership[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="relative flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
      {pending ? <div className="admin-page-progress" /> : null}
      <BusyOverlay show={pending} cover="page" label="Cambiando negocio…" />
      <div className="flex min-w-0 items-center gap-6">
        <Link href="/admin" className="text-sm font-black tracking-widest text-pink-600">
          PANTALLA
          <NavPendingBar />
        </Link>
        <nav className="flex flex-wrap items-center gap-3">
          {NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`text-sm font-bold ${
                current === item.id ? "text-pink-600" : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {item.label}
              <NavPendingBar />
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {stores.length > 0 ? (
          <select
            className="max-w-[180px] rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm font-semibold text-zinc-800"
            value={store?.id ?? ""}
            disabled={pending}
            onChange={(event) => {
              const next = event.target.value;
              if (next === "__new__") {
                router.push("/admin/onboarding");
                return;
              }
              startTransition(async () => {
                await switchStore(next);
                router.refresh();
              });
            }}
          >
            {stores.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
            <option value="__new__">+ Nuevo negocio</option>
          </select>
        ) : null}
        {email ? <p className="hidden text-sm text-zinc-600 sm:block">{email}</p> : null}
        <SignOutButton />
      </div>
    </div>
  );
}
