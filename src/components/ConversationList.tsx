"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { listConversations, getConversationCount, type ConversationRow } from "@/lib/sqlite";
import { clsx } from "clsx";

const PLATFORMS = ["all", "chatgpt", "claude"] as const;
const PAGE_SIZE = 50;

export function ConversationList() {
  const { db } = useApp();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [platform, setPlatform] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(() => {
    const filter = platform === "all" ? undefined : platform;
    const rows = listConversations(db, filter, PAGE_SIZE, offset);
    setConversations(rows);
    setTotal(getConversationCount(db));
  }, [db, platform, offset]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-refresh when syncing completes
  const { syncing } = useApp();
  useEffect(() => {
    if (!syncing) refresh();
  }, [syncing, refresh]);

  return (
    <div>
      {/* Platform filter tabs */}
      <div className="mb-4 flex gap-1 rounded-md border border-zinc-200 p-1 dark:border-zinc-700">
        {PLATFORMS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setPlatform(p);
              setOffset(0);
            }}
            className={clsx(
              "flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              platform === p
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-zinc-400">
        {total} conversation{total !== 1 ? "s" : ""}
      </p>

      {/* Conversation list */}
      <div className="space-y-1">
        {conversations.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-400">
            No conversations yet. Export some from the Chrome extension.
          </p>
        ) : (
          conversations.map((conv) => (
            <Link
              key={conv.id}
              href={`/dashboard/conversation/${conv.id}`}
              className="block rounded-md border border-zinc-100 px-4 py-3 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-800/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {conv.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <span
                      className={clsx(
                        "rounded px-1.5 py-0.5 font-medium",
                        conv.platform === "chatgpt"
                          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                          : "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                      )}
                    >
                      {conv.platform === "chatgpt" ? "ChatGPT" : "Claude"}
                    </span>
                    <span>{conv.message_count} messages</span>
                    {conv.model && <span>{conv.model}</span>}
                  </div>
                </div>
                <time className="shrink-0 text-xs text-zinc-400">
                  {new Date(conv.created_at).toLocaleDateString()}
                </time>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={offset === 0}
            className="rounded px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Previous
          </button>
          <span className="text-xs text-zinc-400">
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
          </span>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={offset + PAGE_SIZE >= total}
            className="rounded px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
