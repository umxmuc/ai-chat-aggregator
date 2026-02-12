"use client";

import { useApp } from "@/lib/context";
import { getConversation } from "@/lib/sqlite";
import { clsx } from "clsx";

export function ConversationView({ id }: { id: string }) {
  const { db } = useApp();
  const conversation = getConversation(db, id);

  if (!conversation) {
    return (
      <div className="py-12 text-center text-sm text-zinc-400">
        Conversation not found. It may not have been synced yet.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {conversation.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span
            className={clsx(
              "rounded px-1.5 py-0.5 font-medium",
              conversation.platform === "chatgpt"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                : "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
            )}
          >
            {conversation.platform === "chatgpt" ? "ChatGPT" : "Claude"}
          </span>
          {conversation.model && <span>{conversation.model}</span>}
          <span>{conversation.message_count} messages</span>
          <span>{new Date(conversation.created_at).toLocaleString()}</span>
          {conversation.metadata?.source_url && (
            <a
              href={conversation.metadata.source_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Source
            </a>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4">
        {conversation.messages.map((msg, i) => (
          <div
            key={i}
            className={clsx(
              "rounded-lg px-4 py-3",
              msg.role === "user"
                ? "bg-zinc-100 dark:bg-zinc-800"
                : msg.role === "assistant"
                  ? "bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700"
                  : "bg-yellow-50 dark:bg-yellow-900/20"
            )}
          >
            <div className="mb-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {msg.role === "user" ? "You" : msg.role === "assistant" ? "Assistant" : "System"}
            </div>
            <div className="prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200">
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                {msg.content}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
