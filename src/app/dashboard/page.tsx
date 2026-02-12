"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/context";
import { SearchBar } from "@/components/SearchBar";
import { ConversationList } from "@/components/ConversationList";
import { SyncStatus } from "@/components/SyncStatus";

export default function DashboardPage() {
  const { triggerSync } = useApp();

  // Auto-sync on mount
  useEffect(() => {
    triggerSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Conversations
        </h2>
        <SyncStatus />
      </div>
      <div className="mb-6">
        <SearchBar />
      </div>
      <ConversationList />
    </div>
  );
}
