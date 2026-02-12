"use client";

const DB_KEY = "aica-sqlite-db";
const SYNC_KEY = "aica-last-synced";

// Try OPFS first, fall back to IndexedDB
export async function saveDatabase(data: Uint8Array): Promise<void> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_KEY, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(new Uint8Array(data));
    await writable.close();
    return;
  } catch {
    // OPFS not available, use IndexedDB
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("aica-storage", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("files");
    };
    request.onsuccess = () => {
      const tx = request.result.transaction("files", "readwrite");
      tx.objectStore("files").put(data, DB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function loadDatabase(): Promise<Uint8Array | null> {
  try {
    const root = await navigator.storage.getDirectory();
    const fileHandle = await root.getFileHandle(DB_KEY);
    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  } catch {
    // OPFS not available or file doesn't exist
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("aica-storage", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("files");
    };
    request.onsuccess = () => {
      const tx = request.result.transaction("files", "readonly");
      const getReq = tx.objectStore("files").get(DB_KEY);
      getReq.onsuccess = () => resolve(getReq.result ?? null);
      getReq.onerror = () => reject(getReq.error);
    };
    request.onerror = () => reject(request.error);
  });
}

export function getLastSyncedAt(orgSlug: string): string | null {
  return localStorage.getItem(`${SYNC_KEY}-${orgSlug}`);
}

export function setLastSyncedAt(orgSlug: string, timestamp: string): void {
  localStorage.setItem(`${SYNC_KEY}-${orgSlug}`, timestamp);
}
