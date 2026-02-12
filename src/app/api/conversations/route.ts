import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import {
  insertEncryptedConversation,
  getEncryptedConversations,
} from "@/lib/neon";
import type { ImportConversationRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const body: ImportConversationRequest = await request.json();

    if (!body.nonce || !body.ciphertext || !body.platform || !body.external_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const nonceBuffer = Buffer.from(body.nonce, "base64");
    const ciphertextBuffer = Buffer.from(body.ciphertext, "base64");

    const result = await insertEncryptedConversation(
      auth.orgId,
      nonceBuffer,
      ciphertextBuffer,
      body.platform,
      body.external_id
    );

    if (result) {
      return NextResponse.json({ id: result.id }, { status: 201 });
    }
    // ON CONFLICT DO NOTHING — already exists
    return NextResponse.json({ deduplicated: true }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (
      message === "Missing Authorization or X-Org-Slug header" ||
      message === "Invalid credentials" ||
      message === "Organization not found"
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import conversation" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const auth = await authenticateRequest(request);
    const { searchParams } = new URL(request.url);
    const after = searchParams.get("after") ?? undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 100);

    const rows = await getEncryptedConversations(auth.orgId, after, limit);

    const conversations = rows.map((row: Record<string, unknown>) => ({
      id: row.id,
      nonce: row.nonce_b64,
      ciphertext: row.ciphertext_b64,
      platform: row.platform,
      external_id: row.external_id,
      imported_at: row.imported_at,
    }));

    return NextResponse.json({
      conversations,
      has_more: conversations.length === limit,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (
      message === "Missing Authorization or X-Org-Slug header" ||
      message === "Invalid credentials" ||
      message === "Organization not found"
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
