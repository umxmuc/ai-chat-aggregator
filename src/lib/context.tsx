"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { Database } from "sql.js";
import type { DerivedKeys } from "./types";
import { syncConversations, type SyncProgress } from "./sync";

interface AppState {
  orgSlug: string;
  keys: DerivedKeys;
  db: Database;
  syncing: boolean;
  syncProgress: SyncProgress | null;
  lastSyncedAt: string | null;
  triggerSync: () => Promise<number>;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function AppProvider({
  orgSlug,
  keys,
  db,
  initialLastSynced,
  children,
}: {
  orgSlug: string;
  keys: DerivedKeys;
  db: Database;
  initialLastSynced: string | null;
  children: ReactNode;
}) {
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(initialLastSynced);

  const triggerSync = useCallback(async () => {
    if (syncing) return 0;
    setSyncing(true);
    setSyncProgress(null);
    try {
      const count = await syncConversations(db, orgSlug, keys, (p) => {
        setSyncProgress(p);
        if (p.done) {
          setLastSyncedAt(new Date().toISOString());
        }
      });
      return count;
    } finally {
      setSyncing(false);
    }
  }, [db, orgSlug, keys, syncing]);

  return (
    <AppContext.Provider
      value={{
        orgSlug,
        keys,
        db,
        syncing,
        syncProgress,
        lastSyncedAt,
        triggerSync,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
