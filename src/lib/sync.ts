"use client";

import type { Database } from "sql.js";
import type { Conversation, DerivedKeys, SyncResponse } from "./types";
import { decrypt, fromBase64, hashAuthKey } from "./crypto";
import {
  insertConversation,
  exportDatabase,
  getConversationCount,
} from "./sqlite";
import { saveDatabase, getLastSyncedAt, setLastSyncedAt } from "./storage";

export interface SyncProgress {
  fetched: number;
  decrypted: number;
  failed: number;
  done: boolean;
}

export async function syncConversations(
  db: Database,
  orgSlug: string,
  keys: DerivedKeys,
  onProgress?: (progress: SyncProgress) => void
): Promise<number> {
  const authKeyHex = await hashAuthKey(keys.authKeyMaterial);

  // If local DB is empty, reset sync cursor to fetch everything
  if (getConversationCount(db) === 0) {
    setLastSyncedAt(orgSlug, "");
  }

  let after = getLastSyncedAt(orgSlug) || undefined;
  let totalImported = 0;
  let totalFailed = 0;
  let firstError: string | null = null;

  while (true) {
    const params = new URLSearchParams({ limit: "100" });
    if (after) params.set("after", after);

    const response = await fetch(`/api/conversations?${params}`, {
      headers: {
        Authorization: `Bearer ${authKeyHex}`,
        "X-Org-Slug": orgSlug,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        `Sync failed: ${response.status} ${(body as Record<string, string>).error || ""}`
      );
    }

    const data: SyncResponse = await response.json();

    if (data.conversations.length === 0) break;

    let lastSuccessTimestamp: string | null = null;

    for (const row of data.conversations) {
      try {
        const plaintext = await decrypt(
          fromBase64(row.ciphertext),
          fromBase64(row.nonce),
          keys.encryptionKey
        );
        const conversation: Conversation = JSON.parse(plaintext);
        insertConversation(db, conversation, row.id, row.imported_at);
        totalImported++;
        lastSuccessTimestamp = row.imported_at;
      } catch (err) {
        totalFailed++;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!firstError) firstError = errMsg;
        console.warn(`Failed to decrypt conversation ${row.id}:`, err);
      }
    }

    // Persist after each page
    await saveDatabase(exportDatabase(db));

    // Only advance cursor if we successfully imported something
    if (lastSuccessTimestamp) {
      after = lastSuccessTimestamp;
      setLastSyncedAt(orgSlug, after);
    } else {
      // All decryptions failed — advance cursor anyway to avoid infinite loop,
      // but only if there were rows (prevents re-fetching the same broken page)
      const lastRow = data.conversations[data.conversations.length - 1];
      after = lastRow.imported_at;
      setLastSyncedAt(orgSlug, after);
    }

    onProgress?.({
      fetched: data.conversations.length,
      decrypted: totalImported,
      failed: totalFailed,
      done: !data.has_more,
    });

    if (!data.has_more) break;
  }

  if (totalFailed > 0 && totalImported === 0) {
    throw new Error(
      `Decryption failed for all ${totalFailed} conversations: ${firstError}`
    );
  }

  return totalImported;
}
