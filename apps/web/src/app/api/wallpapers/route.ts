import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("custom_wallpapers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, name, dataUrl } = await request.json();
    if (!id || !dataUrl) {
      return NextResponse.json({ error: "Missing id or dataUrl" }, { status: 400 });
    }

    // Vercel serverless functions cap request bodies around 4.5MB by
    // default — a big uncompressed screenshot as a base64 data URL can
    // blow past that easily. Fail with a clear message instead of a
    // generic 413 the client can't explain to you.
    const approxBytes = dataUrl.length * 0.75;
    if (approxBytes > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "That image is too large (over ~4MB as uploaded). Try a smaller/more compressed file." },
        { status: 413 }
      );
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("custom_wallpapers").insert({
      id,
      name: name || "Custom Wallpaper",
      data_url: dataUrl,
      created_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabase = getSupabase();
    const { error } = await supabase.from("custom_wallpapers").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
