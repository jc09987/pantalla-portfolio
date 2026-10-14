import { AdminHeader } from "@/app/admin/AdminHeader";
import { LayoutStudio } from "@/app/admin/layout/LayoutStudio";
import { redirectIfCatalogBlocked } from "@/lib/admin/guard";
import { loadAdminCatalog } from "@/lib/menu/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Diseño · Pantalla",
};

export const dynamic = "force-dynamic";

export default async function LayoutPage() {
  const loaded = await loadAdminCatalog();
  redirectIfCatalogBlocked(loaded);

  return (
    <div className="min-h-full">
      <AdminHeader
        email={loaded.ok ? loaded.catalog.email : ""}
        current="layout"
        store={loaded.ok ? loaded.catalog.store : undefined}
        stores={loaded.ok ? loaded.catalog.stores : []}
      />
      {loaded.ok ? (
        <LayoutStudio catalog={loaded.catalog} />
      ) : (
        <p className="mx-auto max-w-xl px-6 py-16 text-sm font-semibold text-amber-800">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
