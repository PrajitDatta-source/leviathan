import { NextResponse } from 'next/server';
import { readDB, writeDB } from '@/core/backend/db';

export async function GET() {
  const db = readDB();
  return NextResponse.json(db.telegramChats);
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let token = '';
    let target_sheet = ''; // TG_DMS, TG_DELETIONS, TG_UNSENT, etc.
    let sender = '';
    let payload = '';

    if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const body = await request.formData();
      token = body.get('token')?.toString() || '';
      target_sheet = body.get('target_sheet')?.toString() || '';
      sender = body.get('sender')?.toString() || '';
      payload = body.get('payload')?.toString() || '';
    } else {
      const body = await request.json();
      token = body.token || '';
      target_sheet = body.target_sheet || '';
      sender = body.sender || '';
      payload = body.payload || body.text || '';
    }

    if (process.env.HF_BOOTSTRAP_TOKEN && token && token !== process.env.HF_BOOTSTRAP_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isGhostIntercept = target_sheet.toUpperCase().includes('DELETE') || target_sheet.toUpperCase().includes('UNSENT');

    if (isGhostIntercept) {
      console.log(`[Telegram Intercept] Type: ${target_sheet} | From: ${sender} | Text: ${payload}`);
    } else {
      console.log(`[Telegram INBOX] ${target_sheet || 'default'} | ${sender}: ${payload}`);
    }

    // Save to DB
    if (payload) {
      const db = readDB();
      const newChat = {
        id: `tg_${Date.now()}`,
        sender: sender || "Telegram Bot",
        text: payload,
        timestamp: new Date().toISOString(),
        isIntercepted: isGhostIntercept
      };
      await writeDB({ telegramChats: [...db.telegramChats, newChat] });
    }

    return NextResponse.json({ success: true, message: isGhostIntercept ? 'Message intercepted and archived.' : 'Payload received by Iris OS' });
  } catch (error) {
    console.error('Telegram Gateway Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
