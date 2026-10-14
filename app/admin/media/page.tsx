import { AdminHeader } from "@/app/admin/AdminHeader";
import { MediaLibrary } from "@/app/admin/media/MediaLibrary";
import { redirectIfCatalogBlocked } from "@/lib/admin/guard";
import { loadAdminCatalog } from "@/lib/menu/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Medios · Pantalla",
};

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const loaded = await loadAdminCatalog();
  redirectIfCatalogBlocked(loaded);

  return (
    <div className="min-h-full">
      <AdminHeader
        email={loaded.ok ? loaded.catalog.email : ""}
        current="media"
        store={loaded.ok ? loaded.catalog.store : undefined}
        stores={loaded.ok ? loaded.catalog.stores : []}
      />
      {loaded.ok ? (
        <MediaLibrary
          catalog={loaded.catalog}
          blobConfigured={Boolean(process.env.BLOB_READ_WRITE_TOKEN)}
        />
      ) : (
        <p className="mx-auto max-w-xl px-6 py-16 text-sm font-semibold text-amber-800">
          {loaded.error}
        </p>
      )}
    </div>
  );
}
