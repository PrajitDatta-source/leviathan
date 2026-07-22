import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oeanbxyfldivpiufvyez.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lYW5ieHlmbGRpdnBpdWZ2eWV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjk2MDQsImV4cCI6MjEwMDIwNTYwNH0.aT6-astS8Drm6X_KQ0wHiAnQp9ziSZtn4s_RZY2WmF8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

    if (process.env.HF_BOOTSTRAP_TOKEN && token && token !== process.env.HF_BOOTSTRAP_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Insert message into Supabase staging table for the UI to fetch
    const { error } = await supabase.from('telegram_inbox').insert({
      type: target_sheet || 'TG_DMS',
      sender: sender || 'Telegram User',
      payload: payload || '',
      created_at: new Date().toISOString()
    });

    if (error) {
      console.error('Supabase Inbox Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Message staged for Iris OS' });
  } catch (error) {
    console.error('Telegram route processing error:', error);
    return NextResponse.json({ error: 'Server processing error' }, { status: 500 });
  }
}

// GET endpoint so the Telegram UI app can poll for unread messages
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('telegram_inbox')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear staged messages after fetching
    if (data && data.length > 0) {
      const ids = data.map((item: any) => item.id);
      await supabase.from('telegram_inbox').delete().in('id', ids);
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    console.error('Telegram Inbox GET Error:', error);
    return NextResponse.json({ error: 'Server processing error' }, { status: 500 });
  }
}

