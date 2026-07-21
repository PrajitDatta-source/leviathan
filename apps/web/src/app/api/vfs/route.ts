import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/core/backend/db";

export async function GET() {
  const db = readDB();
  return NextResponse.json(db.vfsNodes);
}

export async function POST(request: Request) {
  try {
    const nodes = await request.json();
    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: "Nodes must be an array" }, { status: 400 });
    }
    await writeDB({ vfsNodes: nodes });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid VFS sync payload" }, { status: 400 });
  }
}
