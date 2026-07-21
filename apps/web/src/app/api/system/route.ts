import { NextResponse } from "next/server";
import { isPersistent, readDB } from "@/core/backend/db";

export async function GET() {
  const db = readDB();
  return NextResponse.json({
    environment: process.env.VERCEL
      ? "Vercel (Serverless)"
      : process.env.NODE_ENV === "production"
      ? "Production (Self-hosted)"
      : "Development (Localhost)",
    storage: {
      adapter: "json-file",
      persistent: isPersistent,
      note: isPersistent
        ? "Data is written to iris_db.json next to the server process."
        : "Running on a serverless filesystem — data will NOT survive a redeploy or cold start. Plug in a real database (see core/backend/db.ts).",
    },
    counts: {
      vfsNodes: db.vfsNodes.length,
      telegramChats: db.telegramChats.length,
    },
  });
}
