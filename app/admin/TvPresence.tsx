"use client";

import {
  FORCE_RELOAD_EVENT,
  storeChannelName,
  type PresenceMeta,
} from "@/lib/realtime/channels";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useEffect, useRef, useState } from "react";

export function TvPresence({ slug }: { slug: string }) {
  const [count, setCount] = useState(0);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;

    const supabase = createSupabaseBrowserClient();
    const channel = supabase.channel(storeChannelName(slug), {
      config: { presence: { key: `admin-${crypto.randomUUID()}` } },
    });
    channelRef.current = channel;

    const sync = () => {
      const state = channel.presenceState<PresenceMeta>();
      const tvs = Object.values(state)
        .flat()
        .filter((entry) => entry.role === "tv");
      setCount(tvs.length);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const meta: PresenceMeta = { role: "admin", startedAt: Date.now() };
          await channel.track(meta);
        }
      });

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [slug]);

  async function forceReload() {
    if (!channelRef.current) return;
    setSending(true);
    await channelRef.current.send({
      type: "broadcast",
      event: FORCE_RELOAD_EVENT,
      payload: { at: Date.now() },
    });
    setSending(false);
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-semibold text-zinc-600">
        {count === 1 ? "1 pantalla en vivo" : `${count} pantallas en vivo`}
      </p>
      <button
        type="button"
        disabled={sending}
        onClick={() => void forceReload()}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-800 disabled:opacity-60"
      >
        Recargar TVs
      </button>
    </div>
  );
}
