import { getOrgBySlug } from "./neon";

interface AuthResult {
  orgId: string;
  orgSlug: string;
}

export async function authenticateRequest(
  request: Request
): Promise<AuthResult> {
  const authHeader = request.headers.get("Authorization");
  const orgSlug = request.headers.get("X-Org-Slug");

  if (!authHeader?.startsWith("Bearer ") || !orgSlug) {
    throw new Error("Missing Authorization or X-Org-Slug header");
  }

  const authKeyHex = authHeader.slice(7); // strip "Bearer "

  const org = await getOrgBySlug(orgSlug);
  if (!org) {
    throw new Error("Organization not found");
  }

  // Hash the provided auth key material and compare
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(authKeyHex)
  );
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (hashHex !== org.auth_key_hash) {
    throw new Error("Invalid credentials");
  }

  return { orgId: org.id, orgSlug: org.slug };
}
