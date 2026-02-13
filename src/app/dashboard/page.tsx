"use client";

import { useCallback, useEffect } from "react";
import { useApp } from "@/lib/context";
import { exportDatabase } from "@/lib/sqlite";
import { SearchBar } from "@/components/SearchBar";
import { ConversationList } from "@/components/ConversationList";
import { SyncStatus } from "@/components/SyncStatus";

export default function DashboardPage() {
  const { db, triggerSync } = useApp();

  // Auto-sync on mount
  useEffect(() => {
    triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExportDb = useCallback(() => {
    const data = exportDatabase(db);
    const blob = new Blob([new Uint8Array(data)], { type: "application/x-sqlite3" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chats.db";
    a.click();
    URL.revokeObjectURL(url);
  }, [db]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Conversations
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportDb}
            className="rounded px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Export DB
          </button>
          <SyncStatus />
        </div>
      </div>
      <div className="mb-6">
        <SearchBar />
      </div>
      <ConversationList />
    </div>
  );
}
