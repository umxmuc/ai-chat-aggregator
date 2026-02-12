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

  // The client sends SHA-256(authKeyMaterial) as hex — compare directly
  if (authKeyHex !== org.auth_key_hash) {
    throw new Error("Invalid credentials");
  }

  return { orgId: org.id, orgSlug: org.slug };
}
