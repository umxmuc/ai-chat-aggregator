"use client";

import { use } from "react";
import Link from "next/link";
import { ConversationView } from "@/components/ConversationView";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div>
      <Link
        href="/dashboard"
        className="mb-4 inline-block text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        &larr; Back to conversations
      </Link>
      <ConversationView id={id} />
    </div>
  );
}
