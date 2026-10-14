import { LandingFooter } from "@/app/landing/LandingFooter";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell flex min-h-screen flex-col bg-zinc-100 text-zinc-900">
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <LandingFooter />
    </div>
  );
}
