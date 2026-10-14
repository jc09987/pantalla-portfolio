import { AdminHeader } from "@/app/admin/AdminHeader";
import { MenuEditor } from "@/app/admin/MenuEditor";
import { redirectIfCatalogBlocked } from "@/lib/admin/guard";
import { loadAdminCatalog } from "@/lib/menu/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CRM · Pantalla",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const loaded = await loadAdminCatalog();
  redirectIfCatalogBlocked(loaded);

  return (
    <div className="min-h-full">
      <AdminHeader
        email={loaded.ok ? loaded.catalog.email : ""}
        current="menu"
        store={loaded.ok ? loaded.catalog.store : undefined}
        stores={loaded.ok ? loaded.catalog.stores : []}
      />
      {loaded.ok ? (
        <MenuEditor key={loaded.catalog.store.id} catalog={loaded.catalog} />
      ) : (
        <p className="mx-auto max-w-xl px-6 py-16 text-sm font-semibold text-amber-800">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
