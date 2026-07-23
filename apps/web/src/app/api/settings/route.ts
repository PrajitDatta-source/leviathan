import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/core/backend/db";

export async function GET() {
  const db = await readDB();
  return NextResponse.json(db.preferences);
}

export async function POST(request: Request) {
  try {
    const preferences = await request.json();
    await writeDB({ preferences });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Invalid preferences payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
