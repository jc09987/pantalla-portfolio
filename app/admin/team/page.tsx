import { AdminHeader } from "@/app/admin/AdminHeader";
import { SupportForm } from "@/app/admin/team/SupportForm";
import { redirectIfCatalogBlocked } from "@/lib/admin/guard";
import { loadAdminCatalog } from "@/lib/menu/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Soporte · Pantalla",
};

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const loaded = await loadAdminCatalog();
  redirectIfCatalogBlocked(loaded);

  return (
    <div className="min-h-full">
      <AdminHeader
        email={loaded.ok ? loaded.catalog.email : ""}
        current="team"
        store={loaded.ok ? loaded.catalog.store : undefined}
        stores={loaded.ok ? loaded.catalog.stores : []}
      />
      {loaded.ok ? (
        <SupportForm email={loaded.catalog.email} storeName={loaded.catalog.store.name} />
      ) : (
        <p className="mx-auto max-w-xl px-6 py-16 text-sm font-semibold text-amber-800">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
