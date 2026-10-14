"use client";

import { signOut } from "@/app/admin/actions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm font-semibold text-zinc-600"
      onClick={() => {
        startTransition(async () => {
          await signOut();
          router.push("/admin/login");
          router.refresh();
        });
      }}
    >
      Salir
    </button>
  );
}
