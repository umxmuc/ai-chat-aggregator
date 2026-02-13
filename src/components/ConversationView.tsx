"use client";

import { useApp } from "@/lib/context";
import { getConversation } from "@/lib/sqlite";
import { clsx } from "clsx";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

const PLATFORM_BADGE: Record<string, { label: string; classes: string }> = {
  chatgpt: {
    label: "ChatGPT",
    classes: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
  claude: {
    label: "Claude",
    classes: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  },
  "claude-code": {
    label: "Claude Code",
    classes: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
  },
};

export function ConversationView({ id }: { id: string }) {
  const { db } = useApp();
  const conversation = getConversation(db, id);

  if (!conversation) {
    return (
      <div className="py-12 text-center text-sm text-slate-400">
        Conversation not found. It may not have been synced yet.
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 border-b border-slate-200 pb-4 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {conversation.title}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <span
            className={clsx(
              "rounded px-1.5 py-0.5 font-medium",
              PLATFORM_BADGE[conversation.platform]?.classes ?? "bg-slate-50 text-slate-600 dark:bg-slate-900/20 dark:text-slate-400"
            )}
          >
            {PLATFORM_BADGE[conversation.platform]?.label ?? conversation.platform}
          </span>
          {conversation.model && <span>{conversation.model}</span>}
          <span>{conversation.message_count} messages</span>
          <span>{new Date(conversation.created_at).toLocaleString()}</span>
          {conversation.metadata?.source_url && (
            <a
              href={conversation.metadata.source_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
                ? "bg-slate-100 dark:bg-slate-800"
                : msg.role === "assistant"
                  ? "bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700"
                  : "bg-yellow-50 dark:bg-yellow-900/20"
            )}
          >
            <div className={clsx(
              "mb-1 text-sm font-semibold",
              msg.role === "user"
                ? "text-slate-500 dark:text-slate-400"
                : "text-slate-500 dark:text-slate-400"
            )}>
              {msg.role === "user" ? "You" : msg.role === "assistant" ? "Assistant" : "System"}
            </div>
            <div className={clsx(
              "prose max-w-none",
              msg.role === "user"
                ? "text-slate-800 dark:prose-invert dark:text-slate-200"
                : "text-slate-800 dark:prose-invert dark:text-slate-200"
            )}>
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
