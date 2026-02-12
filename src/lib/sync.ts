"use client";

import type { Database } from "sql.js";
import type { Conversation, DerivedKeys, SyncResponse } from "./types";
import { decrypt, fromBase64, hashAuthKey } from "./crypto";
import { insertConversation, exportDatabase } from "./sqlite";
import { saveDatabase, getLastSyncedAt, setLastSyncedAt } from "./storage";

export interface SyncProgress {
  fetched: number;
  decrypted: number;
  done: boolean;
}

export async function syncConversations(
  db: Database,
  orgSlug: string,
  keys: DerivedKeys,
  onProgress?: (progress: SyncProgress) => void
): Promise<number> {
  const authKeyHex = await hashAuthKey(keys.authKeyMaterial);
  let after = getLastSyncedAt(orgSlug);
  let totalImported = 0;

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
      throw new Error(`Sync failed: ${response.status}`);
    }

    const data: SyncResponse = await response.json();

    if (data.conversations.length === 0) break;

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
      } catch {
        console.warn(`Failed to decrypt conversation ${row.id}, skipping`);
      }
    }

    // Persist after each page
    await saveDatabase(exportDatabase(db));

    const lastRow = data.conversations[data.conversations.length - 1];
    after = lastRow.imported_at;
    setLastSyncedAt(orgSlug, after);

    onProgress?.({
      fetched: totalImported,
      decrypted: totalImported,
      done: !data.has_more,
    });

    if (!data.has_more) break;
  }

  return totalImported;
}
