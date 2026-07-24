import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseClient';

const expectedToken = process.env.HF_BOOTSTRAP_TOKEN || process.env.BOOTSTRAP_TOKEN;

function checkAuth(token: string): boolean {
  if (!expectedToken) return true; // matches the main telegram route's fail-open-with-warning behavior
  return token === expectedToken;
}

// Called by engine_tg.py right when a message arrives, so its text
// survives a Space restart. This is a durable backstop for the same RAM
// cache the bot already keeps — the bot checks RAM first (fast), and only
// falls back to this endpoint on a cache miss (e.g. right after a restart).
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, msg_id, sender, text } = body;

    if (!checkAuth(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!msg_id || !text) {
      return NextResponse.json({ error: 'Missing msg_id or text' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('telegram_message_log').upsert({
      msg_id,
      sender: sender || 'Unknown',
      text,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Best-effort cleanup so this table doesn't grow forever — delete
    // anything older than 48 hours. Deletions past that point just fall
    // back to "too old to recover", same as before this fix existed.
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await supabase.from('telegram_message_log').delete().lt('created_at', cutoff);

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Called by engine_tg.py on a RAM cache miss (i.e. after a restart) to try
// to recover the original text of a deleted message before giving up.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token') || '';
    const msgId = searchParams.get('msg_id');

    if (!checkAuth(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!msgId) {
      return NextResponse.json({ error: 'Missing msg_id' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('telegram_message_log')
      .select('sender, text')
      .eq('msg_id', msgId)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || null);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
