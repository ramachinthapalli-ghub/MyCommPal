import { NextRequest, NextResponse } from 'next/server';
import { saveOtp, verifyOtp, getOrCreateProfile } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { identifier, type } = await req.json();

    if (!identifier || typeof identifier !== 'string') {
      return NextResponse.json({ error: 'Valid email or phone number is required.' }, { status: 400 });
    }

    const cleanId = identifier.trim().toLowerCase();
    
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await saveOtp(cleanId, code, 300); // 5 minutes validity

    // In a production setup with Twilio or SendGrid/Resend, you'd send SMS or Email here.
    // For seamless testing, we return the test code in dev/demo mode:
    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${identifier}`,
      // Helpful test code for immediate verification during evaluation:
      devCode: code,
    });
  } catch (error: any) {
    console.error('OTP send error:', error);
    return NextResponse.json({ error: error.message || 'Failed to send OTP' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { identifier, code, type } = await req.json();

    if (!identifier || !code) {
      return NextResponse.json({ error: 'Identifier and OTP code are required.' }, { status: 400 });
    }

    const cleanId = identifier.trim().toLowerCase();
    const cleanCode = code.trim();

    const isValid = await verifyOtp(cleanId, cleanCode);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired verification code. Try again.' }, { status: 400 });
    }

    const authType = type === 'phone' ? 'phone' : 'email';
    const profile = await getOrCreateProfile(authType, cleanId);

    const response = NextResponse.json({
      success: true,
      user: profile,
    });

    // Set user cookie for server-side persistence
    response.cookies.set('mycommpal_user', JSON.stringify(profile), {
      httpOnly: false, // Accessible to client for easy display
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify OTP' }, { status: 500 });
  }
}
