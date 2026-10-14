import { redirect } from "next/navigation";

export function redirectIfCatalogBlocked(loaded: { ok: boolean; error?: string }) {
  if (!loaded.ok && loaded.error === "unauthenticated") {
    redirect("/admin/login");
  }
  if (!loaded.ok && loaded.error === "needs_store") {
    redirect("/admin/onboarding");
  }
}
