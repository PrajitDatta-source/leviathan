import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Determine the base origin (e.g., https://irissys.vercel.app)
  const origin = request.nextUrl.origin;

  if (error) {
    // If Google returned an error, send the user back to desktop with error flag
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?auth_error=missing_code`);
  }

  // Pass the temporary authorization code back to the Iris desktop interface,
  // where GmailWindow's handleTokenExchange() picks it up from the URL and
  // completes the OAuth flow.
  return NextResponse.redirect(`${origin}/?gmail_code=${encodeURIComponent(code)}`);
}
