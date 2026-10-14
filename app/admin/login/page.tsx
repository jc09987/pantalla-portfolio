import { LoginForm } from "@/app/admin/login/LoginForm";
import { LandingNav } from "@/app/landing/LandingNav";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Entrar · Pantalla",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="landing-shell flex flex-1 flex-col">
      <LandingNav />
      <main className="grid flex-1 place-items-center px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold tracking-widest text-pink-600">PANTALLA</p>
          <h1 className="mt-2 text-2xl font-black text-zinc-900">Tu pantalla</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Entra con la cuenta que te asignaron para tu negocio.
          </p>
          {hasSupabaseEnv() ? (
            <div className="mt-6">
              <LoginForm next={next} />
            </div>
          ) : (
            <p className="mt-6 text-sm font-semibold text-amber-800">
              Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
              en .env.local para activar el acceso.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
