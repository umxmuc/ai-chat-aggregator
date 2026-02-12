"use client";

import sodium from "libsodium-wrappers-sumo";
import type { DerivedKeys, EncryptedPayload } from "./types";

let ready = false;

async function ensureReady() {
  if (!ready) {
    await sodium.ready;
    ready = true;
  }
}

export function generateSalt(): Uint8Array {
  return sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES); // 16 bytes
}

export async function deriveKeys(
  password: string,
  salt: Uint8Array
): Promise<DerivedKeys> {
  await ensureReady();

  const derived = sodium.crypto_pwhash(
    64,
    password,
    salt,
    3, // opsLimit (MODERATE)
    67108864, // memLimit (64 MB)
    sodium.crypto_pwhash_ALG_ARGON2ID13
  );

  return {
    encryptionKey: derived.slice(0, 32),
    authKeyMaterial: derived.slice(32, 64),
  };
}

export async function hashAuthKey(authKeyMaterial: Uint8Array): Promise<string> {
  const copy = new Uint8Array(authKeyMaterial);
  const hashBuffer = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function encrypt(
  plaintext: string,
  encryptionKey: Uint8Array
): Promise<EncryptedPayload> {
  await ensureReady();

  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES); // 24 bytes
  const ciphertext = sodium.crypto_secretbox_easy(
    sodium.from_string(plaintext),
    nonce,
    encryptionKey
  );

  return { nonce, ciphertext };
}

export async function decrypt(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  encryptionKey: Uint8Array
): Promise<string> {
  await ensureReady();

  const plaintext = sodium.crypto_secretbox_open_easy(
    ciphertext,
    nonce,
    encryptionKey
  );

  return sodium.to_string(plaintext);
}

// Encoding helpers
export function toBase64(bytes: Uint8Array): string {
  return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

export function fromBase64(b64: string): Uint8Array {
  return sodium.from_base64(b64, sodium.base64_variants.ORIGINAL);
}
