"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useApp } from "@/lib/context";
import { searchMessages, type SearchResult } from "@/lib/sqlite";
import { clsx } from "clsx";

export function SearchBar() {
  const { db } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(
    (q: string) => {
      if (q.trim().length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }
      const found = searchMessages(db, q.trim());
      setResults(found);
      setOpen(found.length > 0);
    },
    [db]
  );

  function handleChange(value: string) {
    setQuery(value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), 300);
  }

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search messages..."
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-80 overflow-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.map((r, i) => (
            <Link
              key={`${r.conversation_id}-${i}`}
              href={`/dashboard/conversation/${r.conversation_id}`}
              onClick={() => setOpen(false)}
              className="block border-b border-slate-100 px-4 py-3 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
            >
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium",
                    r.platform === "chatgpt"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                      : "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                  )}
                >
                  {r.platform === "chatgpt" ? "GPT" : "Claude"}
                </span>
                <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {r.title}
                </span>
              </div>
              <p
                className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400"
                dangerouslySetInnerHTML={{ __html: r.snippet }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
