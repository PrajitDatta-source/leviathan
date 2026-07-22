import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Required — no hardcoded fallback. A hardcoded anon key in source means
// anyone who can see this file (including in a public repo diff) can talk
// to your Supabase project directly, bypassing this route's auth check
// entirely. Set these in Vercel's environment variables instead:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Accept either name — the HF Space's engine_tg.py reads BOOTSTRAP_TOKEN,
// this route historically read HF_BOOTSTRAP_TOKEN. Keep both so whichever
// one you've actually set on Vercel works, but they must be the exact
// same secret value on both sides.
const expectedToken = process.env.HF_BOOTSTRAP_TOKEN || process.env.BOOTSTRAP_TOKEN;

function getSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
    );
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let token = '';
    let target_sheet = '';
    let sender = '';
    let payload = '';

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.formData();
      token = body.get('token')?.toString() || '';
      target_sheet = body.get('target_sheet')?.toString() || '';
      sender = body.get('sender')?.toString() || '';
      payload = body.get('payload')?.toString() || '';
    } else {
      const body = await request.json().catch(() => ({}));
      token = body.token || '';
      target_sheet = body.target_sheet || '';
      sender = body.sender || '';
      payload = body.payload || body.text || '';
    }

    // Previously this only rejected when a token WAS sent and it mismatched
    // — sending no token at all skipped the check entirely, so anyone
    // could POST fake Telegram messages into the inbox with zero auth.
    // Now: if a server-side secret is configured, every request must match
    // it, full stop. If nothing is configured server-side, warn loudly
    // instead of silently accepting everything (fail-closed by default is
    // safer, but breaking your own bot silently is worse than a log line
    // while you're still wiring this up).
    if (expectedToken) {
      if (token !== expectedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn(
        '[telegram route] No HF_BOOTSTRAP_TOKEN/BOOTSTRAP_TOKEN set on the server — accepting unauthenticated Telegram bridge requests.'
      );
    }

    if (!sender || !payload) {
      return NextResponse.json({ error: 'Missing sender or payload' }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from('telegram_inbox').insert({
      type: target_sheet || 'TG_DMS',
      sender,
      payload,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase Inbox Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Message staged for Iris OS' });
  } catch (error) {
    console.error('Telegram route processing error:', error);
    const message = error instanceof Error ? error.message : 'Server processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET endpoint so the Telegram UI app can poll for unread messages
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('telegram_inbox')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear staged messages after fetching. Note: if the response never
    // reaches the client (network drop mid-response), these rows are
    // already gone — acceptable for the "Live Mirror" tab (explicitly
    // RAM-only/best-effort by design) but means Ghost Vault entries could
    // theoretically be lost in that narrow window too. A more robust
    // version would mark rows "delivered" and sweep them on a delay
    // instead of deleting inline; flagging this rather than silently
    // leaving it, since it's a real (if rare) way to lose evidence of a
    // deleted/edited message.
    if (data && data.length > 0) {
      const ids = data.map((item: { id: number }) => item.id);
      await supabase.from('telegram_inbox').delete().in('id', ids);
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    console.error('Telegram Inbox GET Error:', error);
    const message = error instanceof Error ? error.message : 'Server processing error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
