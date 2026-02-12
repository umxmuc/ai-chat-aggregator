"use client";

import { useApp } from "@/lib/context";

export function SyncStatus() {
  const { syncing, syncProgress, syncError, lastSyncedAt, triggerSync } = useApp();

  return (
    <div className="flex flex-col items-end gap-1 text-xs text-zinc-400">
      <div className="flex items-center gap-3">
        {syncing ? (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Syncing{syncProgress ? ` (${syncProgress.decrypted} decrypted)` : ""}...
          </span>
        ) : (
          <>
            {lastSyncedAt && (
              <span>Last synced: {new Date(lastSyncedAt).toLocaleTimeString()}</span>
            )}
            <button
              onClick={() => triggerSync()}
              className="rounded px-2 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Sync now
            </button>
          </>
        )}
      </div>
      {syncError && (
        <span className="text-red-500">{syncError}</span>
      )}
    </div>
  );
}
