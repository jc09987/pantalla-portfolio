import { cookies } from "next/headers";
import type { ApiClient } from "@/lib/supabase/server";

export const STORE_COOKIE = "pantalla-store-id";

export type StoreMembership = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  role: "owner" | "admin" | "editor";
};

export async function readPreferredStoreId() {
  return (await cookies()).get(STORE_COOKIE)?.value ?? null;
}

export async function setPreferredStoreId(storeId: string) {
  (await cookies()).set(STORE_COOKIE, storeId, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function claimInvites(api: ApiClient) {
  await api.rpc("accept_pending_invites");
}

export async function listStoreMemberships(
  api: ApiClient,
  userId: string,
): Promise<StoreMembership[]> {
  const first = await api
    .from("store_members")
    .select("role, store_id, email, created_at")
    .eq("user_id", userId)
    .order("created_at");
  const rows =
    first.error
      ? (await api
          .from("store_members")
          .select("role, store_id, created_at")
          .eq("user_id", userId)
          .order("created_at")).data
      : first.data;
  if (!rows?.length) return [];

  const ids = rows.map((row) => row.store_id as string);
  const withLogo = await api
    .from("stores")
    .select("id, slug, name, logo_url")
    .in("id", ids);
  const storeRows =
    withLogo.error
      ? ((await api.from("stores").select("id, slug, name").in("id", ids)).data ?? []).map(
          (store) => ({ ...store, logo_url: null }),
        )
      : (withLogo.data ?? []);
  const byId = new Map(storeRows.map((store) => [store.id as string, store]));

  return rows.flatMap((row) => {
    const store = byId.get(row.store_id as string);
    if (!store) return [];
    const role = row.role === "owner" || row.role === "admin" ? row.role : "editor";
    return [
      {
        id: store.id as string,
        slug: store.slug as string,
        name: store.name as string,
        logoUrl: (store.logo_url as string | null) ?? null,
        role,
      },
    ];
  });
}

export async function resolveActiveStore(
  api: ApiClient,
  userId: string,
): Promise<StoreMembership | null> {
  await claimInvites(api);
  const stores = await listStoreMemberships(api, userId);
  if (!stores.length) return null;
  const preferred = await readPreferredStoreId();
  return stores.find((store) => store.id === preferred) ?? stores[0];
}
