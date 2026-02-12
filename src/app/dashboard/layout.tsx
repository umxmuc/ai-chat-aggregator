"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { deriveKeys, fromBase64 } from "@/lib/crypto";
import { initDatabase } from "@/lib/sqlite";
import { loadDatabase, getLastSyncedAt } from "@/lib/storage";
import { AppProvider } from "@/lib/context";
import type { DerivedKeys } from "@/lib/types";
import type { Database } from "sql.js";

type State =
  | { phase: "loading" }
  | { phase: "ready"; orgSlug: string; keys: DerivedKeys; db: Database; lastSynced: string | null };

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const orgSlug = sessionStorage.getItem("orgSlug");
      const orgPassword = sessionStorage.getItem("orgPassword");

      if (!orgSlug || !orgPassword) {
        router.replace("/");
        return;
      }

      try {
        // Fetch salt
        const saltRes = await fetch(`/api/org/${encodeURIComponent(orgSlug)}/salt`);
        if (!saltRes.ok) throw new Error("Could not fetch org salt");
        const { salt: saltB64 } = await saltRes.json();
        const salt = fromBase64(saltB64);

        // Derive keys
        const keys = await deriveKeys(orgPassword, salt);

        // Init SQLite (load from OPFS/IndexedDB if available)
        const existingData = await loadDatabase();
        const db = await initDatabase(existingData ?? undefined);

        const lastSynced = getLastSyncedAt(orgSlug);

        setState({ phase: "ready", orgSlug, keys, db, lastSynced });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Initialization failed");
      }
    }

    init();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => {
              sessionStorage.clear();
              router.replace("/");
            }}
            className="mt-4 text-sm text-zinc-500 underline"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-100" />
          <p className="text-sm text-zinc-400">Deriving encryption keys...</p>
        </div>
      </div>
    );
  }

  return (
    <AppProvider
      orgSlug={state.orgSlug}
      keys={state.keys}
      db={state.db}
      initialLastSynced={state.lastSynced}
    >
      <DashboardShell orgSlug={state.orgSlug}>{children}</DashboardShell>
    </AppProvider>
  );
}

function DashboardShell({ orgSlug, children }: { orgSlug: string; children: ReactNode }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              AI Chat Aggregator
            </a>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {orgSlug}
            </span>
          </div>
          <button
            onClick={() => {
              sessionStorage.clear();
              router.replace("/");
            }}
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Log out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-6">{children}</main>
    </div>
  );
}
