import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.NEON_DATABASE_URL!);

export async function getOrgBySlug(slug: string) {
  const rows = await sql`
    SELECT id, name, slug, salt, auth_key_hash, created_at
    FROM org WHERE slug = ${slug}
  `;
  return rows[0] ?? null;
}

export async function createOrg(
  name: string,
  slug: string,
  salt: Buffer,
  authKeyHash: string
) {
  const rows = await sql`
    INSERT INTO org (name, slug, salt, auth_key_hash)
    VALUES (${name}, ${slug}, ${salt}, ${authKeyHash})
    RETURNING id, name, slug, created_at
  `;
  return rows[0];
}

export async function insertEncryptedConversation(
  orgId: string,
  nonce: Buffer,
  ciphertext: Buffer,
  platform: string,
  externalId: string
) {
  const rows = await sql`
    INSERT INTO encrypted_conversation (org_id, nonce, ciphertext, platform, external_id)
    VALUES (${orgId}, ${nonce}, ${ciphertext}, ${platform}, ${externalId})
    ON CONFLICT (org_id, platform, external_id) DO NOTHING
    RETURNING id
  `;
  return rows[0] ?? null;
}

export async function getEncryptedConversations(
  orgId: string,
  after?: string,
  limit = 100
) {
  if (after) {
    return sql`
      SELECT id, nonce, ciphertext, platform, external_id, imported_at
      FROM encrypted_conversation
      WHERE org_id = ${orgId} AND imported_at > ${after}
      ORDER BY imported_at ASC
      LIMIT ${limit}
    `;
  }
  return sql`
    SELECT id, nonce, ciphertext, platform, external_id, imported_at
    FROM encrypted_conversation
    WHERE org_id = ${orgId}
    ORDER BY imported_at ASC
    LIMIT ${limit}
  `;
}
