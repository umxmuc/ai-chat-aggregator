import { NextResponse } from "next/server";
import { getOrgBySlug } from "@/lib/neon";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const org = await getOrgBySlug(slug);

    if (!org) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // salt comes as a Buffer from Neon — convert to base64
    const saltBase64 =
      org.salt instanceof Buffer
        ? org.salt.toString("base64")
        : Buffer.from(org.salt).toString("base64");

    return NextResponse.json({ salt: saltBase64 });
  } catch (error) {
    console.error("Get salt error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve salt" },
      { status: 500 }
    );
  }
}
