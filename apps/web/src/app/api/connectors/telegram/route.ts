import { NextResponse } from "next/server";
import { readDB, writeDB } from "@/core/backend/db";

export async function GET() {
  const db = readDB();
  return NextResponse.json(db.telegramChats);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.text) {
      return NextResponse.json({ error: "Message text is required" }, { status: 400 });
    }

    const db = readDB();
    const newChat = {
      id: `tg_${Date.now()}`,
      sender: body.sender || "You (Owner)",
      text: body.text,
      timestamp: new Date().toISOString(),
    };

    const updatedChats = [...db.telegramChats, newChat];

    // Simulate an automatic response from Telegram bot after 1.5 seconds
    if (body.sender !== "Telegram Bot") {
      updatedChats.push({
        id: `tg_reply_${Date.now()}`,
        sender: "Telegram Bot",
        text: `Echo: Received "${body.text}". Server transaction committed.`,
        timestamp: new Date().toISOString(),
      });
    }

    await writeDB({ telegramChats: updatedChats });
    return NextResponse.json(updatedChats);
  } catch (e) {
    return NextResponse.json({ error: "Invalid Telegram message payload" }, { status: 400 });
  }
}
