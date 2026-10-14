import { OnboardingForm } from "@/app/admin/onboarding/OnboardingForm";
import { requireUser } from "@/lib/menu/catalog";
import { claimInvites, listStoreMemberships } from "@/lib/store/session";
import { apiFrom } from "@/lib/supabase/server";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Nuevo negocio · Pantalla",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const auth = await requireUser();
  if (auth.error === "unauthenticated" || !auth.supabase || !auth.user) {
    redirect("/admin/login?next=/admin/onboarding");
  }
  if (auth.error === "missing-env") {
    return (
      <p className="mx-auto max-w-xl px-6 py-16 text-sm font-semibold text-amber-800">
        Faltan las llaves de Supabase en el entorno.
      </p>
    );
  }

  const api = apiFrom(auth.supabase);
  await claimInvites(api);
  const stores = await listStoreMemberships(api, auth.user.id);

  return (
    <main className="grid min-h-full place-items-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8">
        <p className="text-sm font-bold tracking-widest text-pink-600">PANTALLA</p>
        <h1 className="mt-2 text-2xl font-black text-zinc-900">Tu negocio</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Crea una pantalla para tu menú, o entra con el mismo correo al que te invitaron
          para unirte al equipo.
        </p>
        <div className="mt-6">
          <OnboardingForm />
        </div>
        {stores.length ? (
          <p className="mt-6 text-sm text-zinc-600">
            <Link href="/admin" className="font-bold text-pink-600">
              Volver al panel
            </Link>
          </p>
        ) : (
          <p className="mt-6 text-xs text-zinc-500">
            Si te invitaron, recarga esta página después de entrar con ese correo.
          </p>
        )}
      </div>
    </main>
  );
}
