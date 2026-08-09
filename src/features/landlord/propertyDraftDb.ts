"use client";

/**
 * IndexedDB-backed draft cache for the Add Property wizard. localStorage
 * (used previously) can't hold `File` objects — the old implementation
 * explicitly stripped `images` before persisting, so uploaded photos were
 * silently lost on every remount (tab switch, navigation away and back).
 * IndexedDB's structured-clone storage natively supports `File`/`Blob`, so
 * the whole form — images included — survives a remount, and is cleared
 * only after a successful submission.
 */

const DB_NAME = "propmatch-drafts";
const DB_VERSION = 1;
const STORE_NAME = "add-property";
const DRAFT_KEY = "draft";

export interface PropertyDraftRecord {
  step: number;
  /** Partial<AddPropertyForm> — including `images: File[]`. */
  values: Record<string, unknown>;
  optimizerUsesLeft?: number;
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Never throws — a full/unavailable/blocked IndexedDB must not break the form. */
export async function loadPropertyDraft(): Promise<PropertyDraftRecord | null> {
  const db = await openDb();
  if (!db) return null;
  try {
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(DRAFT_KEY);
      request.onsuccess = () => resolve((request.result as PropertyDraftRecord | undefined) ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

export async function savePropertyDraft(record: PropertyDraftRecord): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(record, DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // Silent — draft caching is a convenience, never a blocker.
  } finally {
    db.close();
  }
}

export async function clearPropertyDraft(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(DRAFT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    });
  } catch {
    // Ignored — nothing to clean up if this fails.
  } finally {
    db.close();
  }
}
