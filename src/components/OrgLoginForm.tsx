"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deriveKeys, generateSalt, hashAuthKey, toBase64 } from "@/lib/crypto";
import { clsx } from "clsx";

type Mode = "join" | "create";

export function OrgLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("join");
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Fetch salt for this org
      const saltRes = await fetch(`/api/org/${encodeURIComponent(slug)}/salt`);
      if (!saltRes.ok) {
        if (saltRes.status === 404) {
          setError("Organization not found. Check the slug or create a new one.");
          return;
        }
        throw new Error("Failed to fetch org info");
      }

      const { salt: saltB64 } = await saltRes.json();
      const { fromBase64 } = await import("@/lib/crypto");
      const salt = fromBase64(saltB64);

      // Derive keys to verify password works (auth will verify server-side on sync)
      const keys = await deriveKeys(password, salt);
      const authKeyHex = await hashAuthKey(keys.authKeyMaterial);

      // Quick auth check
      const checkRes = await fetch("/api/conversations?limit=1", {
        headers: {
          Authorization: `Bearer ${authKeyHex}`,
          "X-Org-Slug": slug,
        },
      });

      if (!checkRes.ok) {
        setError("Invalid password for this organization.");
        return;
      }

      // Store credentials in sessionStorage
      sessionStorage.setItem("orgSlug", slug);
      sessionStorage.setItem("orgPassword", password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const salt = generateSalt();
      const keys = await deriveKeys(password, salt);
      const authKeyHash = await hashAuthKey(keys.authKeyMaterial);

      const res = await fetch("/api/org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          salt: toBase64(salt),
          auth_key_hash: authKeyHash,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to create organization");
        return;
      }

      // Store credentials and navigate
      sessionStorage.setItem("orgSlug", slug);
      sessionStorage.setItem("orgPassword", password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Mode tabs */}
      <div className="mb-6 flex rounded-md border border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setMode("join")}
          className={clsx(
            "flex-1 rounded-l-md px-4 py-2 text-sm font-medium transition-colors",
            mode === "join"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          Join Org
        </button>
        <button
          type="button"
          onClick={() => setMode("create")}
          className={clsx(
            "flex-1 rounded-r-md px-4 py-2 text-sm font-medium transition-colors",
            mode === "create"
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          )}
        >
          Create Org
        </button>
      </div>

      <form onSubmit={mode === "join" ? handleJoin : handleCreate}>
        {mode === "create" && (
          <div className="mb-4">
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Organization Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Team"
              required
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="slug" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Org Slug
          </label>
          <input
            id="slug"
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="my-team"
            required
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-400">Lowercase letters, numbers, and hyphens only</p>
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Organization Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Shared secret for your team"
            required
            minLength={8}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <p className="mt-1 text-xs text-zinc-400">
            {mode === "create"
              ? "Choose a strong password. It encrypts all data — if lost, data cannot be recovered."
              : "Enter the password shared with your team."}
          </p>
        </div>

        {error && (
          <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading
            ? "Deriving keys..."
            : mode === "join"
              ? "Join Organization"
              : "Create Organization"}
        </button>
      </form>
    </div>
  );
}
