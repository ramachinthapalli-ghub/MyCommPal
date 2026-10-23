import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateProfile } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    // Check if guest cookie already exists
    const existingCookie = req.cookies.get('mycommpal_user')?.value;
    if (existingCookie) {
      try {
        const parsed = JSON.parse(existingCookie);
        if (parsed.id && parsed.authType === 'guest') {
          return NextResponse.json({ success: true, user: parsed });
        }
      } catch (e) {}
    }

    const guestNumber = Math.floor(1000 + Math.random() * 9000);
    const guestIdentifier = `guest_${guestNumber}`;
    const profile = await getOrCreateProfile('guest', guestIdentifier);

    const response = NextResponse.json({
      success: true,
      user: profile,
    });

    response.cookies.set('mycommpal_user', JSON.stringify(profile), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Guest login error:', error);
    return NextResponse.json({ error: error.message || 'Failed to login as guest' }, { status: 500 });
  }
}
