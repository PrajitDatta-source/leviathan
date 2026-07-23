import { NextResponse } from "next/server";
import { readDB, isPersistent } from "@/core/backend/db";
import { checkSupabaseConfig, getSupabase } from "@/lib/supabaseClient";

export async function GET() {
  const db = await readDB();
  const supabaseStatus = checkSupabaseConfig();

  // Live-ping the telegram_inbox table so a config that *looks* right
  // (valid URL shape, valid-looking key) but is actually wrong (wrong
  // project, table doesn't exist yet, RLS blocking anon) still surfaces a
  // real error instead of just reporting "looks fine".
  let telegramBridge: { ok: boolean; detail: string };
  if (!supabaseStatus.ok) {
    telegramBridge = { ok: false, detail: supabaseStatus.reason || "Supabase not configured" };
  } else {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("telegram_inbox").select("id").limit(1);
      telegramBridge = error
        ? { ok: false, detail: `Connected to Supabase, but querying telegram_inbox failed: ${error.message}` }
        : { ok: true, detail: "Reachable." };
    } catch (e) {
      telegramBridge = { ok: false, detail: e instanceof Error ? e.message : "Unknown error" };
    }
  }

  const hasBootstrapToken = Boolean(process.env.HF_BOOTSTRAP_TOKEN || process.env.BOOTSTRAP_TOKEN);

  return NextResponse.json({
    environment: process.env.VERCEL
      ? "Vercel (Serverless)"
      : process.env.NODE_ENV === "production"
      ? "Production (Self-hosted)"
      : "Development (Localhost)",
    storage: {
      adapter: isPersistent ? "supabase" : "json-file (ephemeral)",
      persistent: isPersistent,
      note: isPersistent
        ? "Settings and files are stored in Supabase and survive redeploys."
        : "Supabase isn't configured, so settings/files are falling back to a local file that Vercel wipes on every redeploy/cold start — this is very likely why your theme isn't sticking. Configure NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY to fix it.",
    },
    telegramBridge: {
      ...telegramBridge,
      bootstrapTokenConfigured: hasBootstrapToken,
    },
    counts: {
      vfsNodes: db.vfsNodes.length,
    },
  });
}
