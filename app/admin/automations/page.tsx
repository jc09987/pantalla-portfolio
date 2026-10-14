import { AdminHeader } from "@/app/admin/AdminHeader";
import { AutomationsClient } from "@/app/admin/automations/AutomationsClient";
import { redirectIfCatalogBlocked } from "@/lib/admin/guard";
import { loadAdminCatalog, requireUser } from "@/lib/menu/catalog";
import { apiFrom } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Automatizaciones · Pantalla",
};

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const loaded = await loadAdminCatalog();
  redirectIfCatalogBlocked(loaded);

  const auth = await requireUser();
  const sendersResult =
    loaded.ok && auth.supabase
      ? await apiFrom(auth.supabase)
          .from("store_senders")
          .select("id, channel, sender, label")
          .eq("store_id", loaded.catalog.store.id)
          .order("created_at")
      : { data: [] as never[], error: null };
  const commandsResult =
    loaded.ok && auth.supabase
      ? await apiFrom(auth.supabase)
          .from("command_log")
          .select("id, channel, sender, raw, status, reply, created_at")
          .eq("store_id", loaded.catalog.store.id)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: [] as never[], error: null };

  const schemaError = sendersResult.error?.message ?? commandsResult.error?.message;
  const senders = sendersResult.data ?? [];
  const commands = commandsResult.data ?? [];

  return (
    <div className="min-h-full">
      <AdminHeader
        email={loaded.ok ? loaded.catalog.email : ""}
        current="automations"
        store={loaded.ok ? loaded.catalog.store : undefined}
        stores={loaded.ok ? loaded.catalog.stores : []}
      />
      {schemaError ? (
        <p className="mx-auto max-w-xl px-6 py-16 text-sm font-semibold text-amber-800">
          {schemaError}. Corre supabase/migrations/20260907050000_n8n_ingest.sql en el SQL editor.
        </p>
      ) : loaded.ok ? (
        <AutomationsClient
          senders={senders}
          commands={commands}
          storeSlug={loaded.catalog.store.slug}
          ingestConfigured={Boolean(
            process.env.N8N_WEBHOOK_SECRET && process.env.SUPABASE_SERVICE_ROLE_KEY,
          )}
        />
      ) : (
        <p className="mx-auto max-w-xl px-6 py-16 text-sm font-semibold text-amber-800">
          {loaded.error}
        </p>
      )}
    </div>
  );
}