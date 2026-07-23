import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseClient';

// Accept either name — the HF Space's engine_tg.py reads BOOTSTRAP_TOKEN,
// this route historically read HF_BOOTSTRAP_TOKEN. Keep both so whichever
// one you've actually set on Vercel works, but they must be the exact
// same secret value on both sides.
const expectedToken = process.env.HF_BOOTSTRAP_TOKEN || process.env.BOOTSTRAP_TOKEN;

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

    const isGhost = target_sheet === 'TG_GHOST_DELETE' || target_sheet === 'TG_GHOST_EDIT';

    const supabase = getSupabase();
    const { error } = await supabase.from('telegram_inbox').insert({
      type: target_sheet || 'TG_DMS',
      sender,
      payload,
      is_ghost: isGhost,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase Inbox Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Message staged for Iris OS' });
  } catch (error) {
    console.error('Telegram route processing error:', error);
    // getSupabase() throws a specific, actionable message when env vars are
    // missing/malformed (e.g. a project ID pasted instead of the full
    // URL) — surface that instead of a generic "Server processing error".
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
