// Conversation types (mirrored from ai-chat-exporter)
export interface Conversation {
  platform: "chatgpt" | "claude";
  external_id: string;
  title: string;
  model?: string;
  source_url: string;
  messages: Message[];
  metadata: Record<string, unknown>;
  created_at: string;
  exported_at: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  position: number;
  metadata: Record<string, unknown>;
  created_at?: string;
}

// Encryption types
export interface DerivedKeys {
  encryptionKey: Uint8Array; // 32 bytes — XSalsa20-Poly1305
  authKeyMaterial: Uint8Array; // 32 bytes — hashed for server auth
}

export interface EncryptedPayload {
  nonce: Uint8Array; // 24 bytes
  ciphertext: Uint8Array;
}

// Org types
export interface OrgInfo {
  id: string;
  name: string;
  slug: string;
  salt: Uint8Array; // 16 bytes
}

// API request/response types
export interface CreateOrgRequest {
  name: string;
  slug: string;
  salt: string; // base64
  auth_key_hash: string; // hex
}

export interface ImportConversationRequest {
  nonce: string; // base64
  ciphertext: string; // base64
  platform: string;
  external_id: string;
}

export interface SyncResponse {
  conversations: {
    id: string;
    nonce: string; // base64
    ciphertext: string; // base64
    platform: string;
    external_id: string;
    imported_at: string;
  }[];
  has_more: boolean;
}
