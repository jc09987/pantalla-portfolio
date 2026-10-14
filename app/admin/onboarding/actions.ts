"use server";

import { requireUser } from "@/lib/menu/catalog";
import { hydrateCatalogIfEmpty } from "@/lib/menu/hydrate";
import { isValidSlug, slugifyName } from "@/lib/store/slug";
import { setPreferredStoreId } from "@/lib/store/session";
import { apiFrom } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createBusiness(formData: FormData) {
  const auth = await requireUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { ok: false as const, error: "Sesión expirada." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = isValidSlug(slugInput) ? slugInput : slugifyName(slugInput || name);
  if (!isValidSlug(slug)) {
    return {
      ok: false as const,
      error: "La URL debe ser minúsculas, números y guiones (3 a 40 caracteres).",
    };
  }

  const api = apiFrom(auth.supabase);
  const { data, error } = await api.rpc("create_my_store", {
    p_name: name,
    p_slug: slug,
  });
  if (error) return { ok: false as const, error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.store_id) {
    return { ok: false as const, error: "No se pudo crear el negocio." };
  }

  await hydrateCatalogIfEmpty(api, row.store_id as string);
  await setPreferredStoreId(row.store_id as string);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function switchStore(storeId: string) {
  const auth = await requireUser();
  if (auth.error || !auth.supabase || !auth.user) {
    return { ok: false as const, error: "Sesión expirada." };
  }
  const api = apiFrom(auth.supabase);
  const { data } = await api
    .from("store_members")
    .select("store_id")
    .eq("user_id", auth.user.id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!data) return { ok: false as const, error: "No perteneces a ese negocio." };

  await setPreferredStoreId(storeId);
  revalidatePath("/admin");
  revalidatePath("/admin/branding");
  revalidatePath("/admin/team");
  revalidatePath("/admin/layout");
  revalidatePath("/admin/media");
  revalidatePath("/admin/automations");
  return { ok: true as const };
}
