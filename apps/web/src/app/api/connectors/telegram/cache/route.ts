import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseClient';

const expectedToken = process.env.HF_BOOTSTRAP_TOKEN || process.env.BOOTSTRAP_TOKEN;

function checkAuth(token: string): boolean {
  if (!expectedToken) return true; // matches the main telegram route's fail-open-with-warning behavior
  return token === expectedToken;
}

// Called by engine_tg.py the moment a message arrives. This is the
// permanent record behind both the Inbox tab (all messages) and Ghost
// Vault's "recover deleted text" lookup — previously that was RAM-only in
// the Python process and got wiped on every Space restart.
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
    const { error } = await supabase.from('telegram_messages').upsert({
      msg_id,
      sender: sender || 'Unknown',
      text,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Two modes:
//   ?msg_id=X   -> single-message lookup, called by the Python bot for
//                  Ghost Vault deletion recovery — requires the bootstrap
//                  token, same as POST above.
//   (no msg_id) -> recent message list for the Inbox tab, called directly
//                  by the browser. No bootstrap token here — the browser
//                  has no safe way to hold that secret, and this endpoint
//                  is already only reachable after the vault PIN unlock.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const msgId = searchParams.get('msg_id');
    const supabase = getSupabase();

    if (msgId) {
      const token = searchParams.get('token') || '';
      if (!checkAuth(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data, error } = await supabase
        .from('telegram_messages')
        .select('sender, text')
        .eq('msg_id', msgId)
        .maybeSingle();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json(data || null);
    }

    const limit = Math.min(Number(searchParams.get('limit')) || 300, 1000);
    const { data, error } = await supabase
      .from('telegram_messages')
      .select('msg_id, sender, text, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ messages: data || [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
