"use client";

import initSqlJs, { type Database } from "sql.js";
import type { Conversation } from "./types";

let dbInstance: Database | null = null;

export async function initDatabase(existingData?: ArrayLike<number>): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs({
    locateFile: () => "/sql-wasm.wasm",
  });

  dbInstance = existingData ? new SQL.Database(existingData) : new SQL.Database();

  // Always apply schema — IF NOT EXISTS makes this safe for existing databases
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS conversation (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      external_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      model TEXT,
      source_url TEXT,
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      exported_at TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS message (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL REFERENCES conversation(id),
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT,
      metadata TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_msg_conv ON message(conversation_id);
  `);

  // FTS5 virtual tables don't support IF NOT EXISTS — check manually
  const ftsExists = dbInstance.exec(
    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='message_fts'"
  );
  if (!ftsExists.length || !ftsExists[0].values.length) {
    dbInstance.run(`
      CREATE VIRTUAL TABLE message_fts USING fts5(
        content,
        conversation_id UNINDEXED,
        message_id UNINDEXED
      );
    `);
  }

  return dbInstance;
}

export function getDatabase(): Database | null {
  return dbInstance;
}

export function insertConversation(
  db: Database,
  conversation: Conversation,
  serverId: string,
  importedAt: string
): void {
  // Check if already exists
  const existing = db.exec(
    `SELECT 1 FROM conversation WHERE external_id = '${conversation.external_id.replace(/'/g, "''")}'`
  );
  if (existing.length > 0 && existing[0].values.length > 0) return;

  const q = (s: string) => "'" + s.replace(/'/g, "''") + "'";
  const n = (s: string | null) => s === null ? "NULL" : q(s);

  db.exec(
    `INSERT INTO conversation (id, platform, external_id, title, model, source_url, message_count, created_at, exported_at, imported_at, metadata)
     VALUES (${q(serverId)}, ${q(conversation.platform)}, ${q(conversation.external_id)}, ${q(conversation.title)}, ${n(conversation.model ?? null)}, ${q(conversation.source_url)}, ${conversation.messages.length}, ${q(conversation.created_at)}, ${q(conversation.exported_at)}, ${q(importedAt)}, ${q(JSON.stringify(conversation.metadata))})`
  );

  for (const msg of conversation.messages) {
    db.exec(
      `INSERT INTO message (conversation_id, role, content, position, created_at, metadata)
       VALUES (${q(serverId)}, ${q(msg.role)}, ${q(msg.content)}, ${msg.position}, ${n(msg.created_at ?? null)}, ${q(JSON.stringify(msg.metadata))})`
    );

    // Insert into FTS index
    db.exec(
      `INSERT INTO message_fts (content, conversation_id, message_id)
       VALUES (${q(msg.content)}, ${q(serverId)}, last_insert_rowid())`
    );
  }
}

export interface ConversationRow {
  id: string;
  platform: string;
  external_id: string;
  title: string;
  model: string | null;
  source_url: string;
  message_count: number;
  created_at: string;
  imported_at: string;
}

export function listConversations(
  db: Database,
  platform?: string,
  limit = 50,
  offset = 0
): ConversationRow[] {
  const where = platform ? `WHERE platform = '${platform}'` : "";
  const results = db.exec(
    `SELECT id, platform, external_id, title, model, source_url, message_count, created_at, imported_at
     FROM conversation ${where}
     ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`
  );
  if (!results.length) return [];

  return results[0].values.map((row) => ({
    id: row[0] as string,
    platform: row[1] as string,
    external_id: row[2] as string,
    title: row[3] as string,
    model: row[4] as string | null,
    source_url: row[5] as string,
    message_count: row[6] as number,
    created_at: row[7] as string,
    imported_at: row[8] as string,
  }));
}

export function getConversation(db: Database, id: string) {
  const convResult = db.exec(
    `SELECT id, platform, external_id, title, model, source_url, message_count, created_at, imported_at, metadata
     FROM conversation WHERE id = ?`,
    [id]
  );
  if (!convResult.length || !convResult[0].values.length) return null;

  const row = convResult[0].values[0];
  const msgResult = db.exec(
    `SELECT role, content, position, created_at, metadata
     FROM message WHERE conversation_id = ? ORDER BY position ASC`,
    [id]
  );

  return {
    id: row[0] as string,
    platform: row[1] as string,
    external_id: row[2] as string,
    title: row[3] as string,
    model: row[4] as string | null,
    source_url: row[5] as string,
    message_count: row[6] as number,
    created_at: row[7] as string,
    imported_at: row[8] as string,
    metadata: row[9] ? JSON.parse(row[9] as string) : {},
    messages: msgResult.length
      ? msgResult[0].values.map((m) => ({
          role: m[0] as string,
          content: m[1] as string,
          position: m[2] as number,
          created_at: m[3] as string | null,
          metadata: m[4] ? JSON.parse(m[4] as string) : {},
        }))
      : [],
  };
}

export interface SearchResult {
  conversation_id: string;
  title: string;
  platform: string;
  snippet: string;
  role: string;
}

export function searchMessages(db: Database, query: string): SearchResult[] {
  const safeQuery = query.replace(/"/g, '""');
  const results = db.exec(
    `SELECT m.conversation_id, c.title, c.platform, snippet(message_fts, 0, '<mark>', '</mark>', '...', 40) as snippet, msg.role
     FROM message_fts m
     JOIN conversation c ON c.id = m.conversation_id
     JOIN message msg ON msg.id = m.message_id
     WHERE message_fts MATCH '"${safeQuery}"'
     ORDER BY rank
     LIMIT 50`
  );
  if (!results.length) return [];

  return results[0].values.map((row) => ({
    conversation_id: row[0] as string,
    title: row[1] as string,
    platform: row[2] as string,
    snippet: row[3] as string,
    role: row[4] as string,
  }));
}

export function getConversationCount(db: Database): number {
  const result = db.exec("SELECT COUNT(*) FROM conversation");
  return result.length ? (result[0].values[0][0] as number) : 0;
}

export function exportDatabase(db: Database): Uint8Array {
  return db.export();
}
