import { NextResponse } from "next/server";
import { createOrg, getOrgBySlug } from "@/lib/neon";
import type { CreateOrgRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body: CreateOrgRequest = await request.json();

    if (!body.name || !body.slug || !body.salt || !body.auth_key_hash) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(body.slug)) {
      return NextResponse.json(
        { error: "Slug must be lowercase alphanumeric with hyphens" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await getOrgBySlug(body.slug);
    if (existing) {
      return NextResponse.json(
        { error: "Organization slug already taken" },
        { status: 409 }
      );
    }

    const org = await createOrg(body.name, body.slug, body.salt, body.auth_key_hash);

    return NextResponse.json(org, { status: 201 });
  } catch (error) {
    console.error("Create org error:", error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }
}
