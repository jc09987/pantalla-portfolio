"use client";

import { cacheSnapshot, readCachedSnapshot } from "@/lib/menu/offline-cache";
import { MenuLayout } from "@/lib/menu/layouts/MenuLayout";
import type { MenuSnapshot } from "@/lib/menu/types";
import { parseOrientation } from "@/lib/display/stage";
import {
  FORCE_RELOAD_EVENT,
  storeChannelName,
  type PresenceMeta,
} from "@/lib/realtime/channels";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { useEffect, useId, useRef, useState } from "react";

const FADE_MS = 420;

function deviceKey() {
  const key = "pantalla-device-id";
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  sessionStorage.setItem(key, next);
  return next;
}

export function LiveMenu({
  slug,
  initial,
  live = true,
  onSnapshot,
}: {
  slug: string;
  initial: MenuSnapshot;
  live?: boolean;
  onSnapshot?: (snapshot: MenuSnapshot) => void;
}) {
  const fadeId = useId();
  const [current, setCurrent] = useState(initial);
  const [incoming, setIncoming] = useState<MenuSnapshot | null>(null);
  const [visible, setVisible] = useState(false);
  const [offline, setOffline] = useState(false);
  const currentRef = useRef(current);
  const onSnapshotRef = useRef(onSnapshot);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    if (!live) return;
    void cacheSnapshot(slug, initial);
  }, [slug, initial, live]);

  useEffect(() => {
    if (!live || !hasSupabaseEnv()) return;

    const supabase = createSupabaseBrowserClient();
    let fadeTimer = 0;
    let cancelled = false;

    const apply = (raw: MenuSnapshot, hard = false) => {
      if (cancelled) return;
      const next = {
        ...raw,
        orientation:
          parseOrientation(
            typeof raw.orientation === "string" ? raw.orientation : null,
          ) ??
          currentRef.current.orientation ??
          "landscape",
      };
      onSnapshotRef.current?.(next);
      void cacheSnapshot(slug, next);
      if (
        hard ||
        next.layoutKey !== currentRef.current.layoutKey ||
        next.orientation !== currentRef.current.orientation
      ) {
        currentRef.current = next;
        setIncoming(null);
        setVisible(false);
        setCurrent(next);
        return;
      }
      setIncoming(next);
      requestAnimationFrame(() => setVisible(true));
      window.clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => {
        setCurrent(next);
        setIncoming(null);
        setVisible(false);
      }, FADE_MS);
    };

    const refetch = async () => {
      const { data, error } = await supabase
        .schema("api")
        .from("menu_snapshots")
        .select("payload")
        .eq("store_slug", slug)
        .maybeSingle();
      if (error) {
        const cached = await readCachedSnapshot(slug);
        if (cached) apply(cached, true);
        return;
      }
      if (data?.payload) apply(data.payload as MenuSnapshot);
    };

    const channel = supabase.channel(storeChannelName(slug), {
      config: { presence: { key: deviceKey() } },
    });

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "api",
          table: "menu_snapshots",
          filter: `store_slug=eq.${slug}`,
        },
        (payload) => {
          const row = payload.new as { payload?: MenuSnapshot } | null;
          if (row?.payload) apply(row.payload);
          else void refetch();
        },
      )
      .on("broadcast", { event: FORCE_RELOAD_EVENT }, () => {
        window.location.reload();
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setOffline(false);
          const meta: PresenceMeta = { role: "tv", startedAt: Date.now() };
          await channel.track(meta);
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setOffline(true);
        }
      });

    const handleOnline = () => {
      setOffline(false);
      void refetch();
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cancelled = true;
      window.clearTimeout(fadeTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      void supabase.removeChannel(channel);
    };
  }, [slug, live]);

  if (!live) {
    return (
      <div className="live-menu">
        <div className="live-layer">
          <MenuLayout menu={initial} />
        </div>
      </div>
    );
  }

  return (
    <div className="live-menu">
      <div className="live-layer" key={`${current.layoutKey}-${current.revision}`}>
        <MenuLayout menu={current} />
      </div>
      {incoming ? (
        <div
          className={`live-layer live-layer-in ${visible ? "is-on" : ""}`}
          data-fade={fadeId}
        >
          <MenuLayout menu={incoming} />
        </div>
      ) : null}
      {live && offline ? (
        <p className="live-offline">Sin conexión — mostrando última versión</p>
      ) : null}
    </div>
  );
}
