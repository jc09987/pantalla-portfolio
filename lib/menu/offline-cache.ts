import type { MenuSnapshot } from "@/lib/menu/types";

const DB_NAME = "pantalla";
const STORE = "snapshots";

function localKey(slug: string) {
  return `pantalla-snapshot:${slug}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheSnapshot(slug: string, snapshot: MenuSnapshot) {
  try {
    localStorage.setItem(localKey(slug), JSON.stringify(snapshot));
  } catch {
    /* quota / private mode */
  }

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(snapshot, slug);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* IndexedDB missing on some TV browsers */
  }
}

export async function readCachedSnapshot(
  slug: string,
): Promise<MenuSnapshot | null> {
  try {
    const db = await openDb();
    const snapshot = await new Promise<MenuSnapshot | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(slug);
      request.onsuccess = () => resolve((request.result as MenuSnapshot) ?? null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (snapshot) return snapshot;
  } catch {
    /* fall through */
  }

  try {
    const raw = localStorage.getItem(localKey(slug));
    return raw ? (JSON.parse(raw) as MenuSnapshot) : null;
  } catch {
    return null;
  }
}
