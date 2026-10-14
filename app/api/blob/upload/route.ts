import { upsertMediaAsset } from "@/lib/blob/record";
import {
  MAX_IMAGE_BYTES,
  extensionForMime,
  isAllowedImageType,
  mediaPathname,
} from "@/lib/blob/rules";
import { loadAdminCatalog, requireUser } from "@/lib/menu/catalog";
import { apiFrom } from "@/lib/supabase/server";
import { putStoreBlob } from "@/lib/blob/put";

export async function POST(request: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json({ error: "BLOB_READ_WRITE_TOKEN is not set" }, { status: 503 });
  }

  const auth = await requireUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  const loaded = await loadAdminCatalog();
  if (!loaded.ok) {
    return Response.json({ error: loaded.error }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const mime = (file.type || "image/jpeg").split(";")[0]?.trim().toLowerCase() ?? "";
  if (!isAllowedImageType(mime)) {
    return Response.json({ error: "Solo JPEG, PNG o WebP." }, { status: 400 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return Response.json({ error: "La foto no puede pesar más de 8 MB." }, { status: 400 });
  }

  const givenName = String(form.get("filename") ?? file.name);
  const pathname = mediaPathname(
    loaded.catalog.store.slug,
    givenName.replace(/\.[^.]+$/, ""),
    extensionForMime(mime),
  );

  try {
    const blob = await putStoreBlob(pathname, file, mime);
    await upsertMediaAsset(apiFrom(auth.supabase), {
      storeId: loaded.catalog.store.id,
      blobUrl: blob.url,
      blobPathname: blob.pathname,
      mime,
    });

    return Response.json({
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
