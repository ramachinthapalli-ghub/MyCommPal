import { NextRequest, NextResponse } from 'next/server';
import { getUserSessions } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const userCookie = req.cookies.get('mycommpal_user')?.value;
  if (!userCookie) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const user = JSON.parse(userCookie);
    if (!user.id) {
      return NextResponse.json({ sessions: [] });
    }

    const sessions = await getUserSessions(user.id);
    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch sessions' }, { status: 500 });
  }
}
