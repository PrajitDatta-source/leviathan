import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/core/backend/db";

export async function GET() {
  const db = readDB();
  return NextResponse.json(db.preferences);
}

export async function POST(request: Request) {
  try {
    const preferences = await request.json();
    await writeDB({ preferences });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid preferences payload" }, { status: 400 });
  }
}
