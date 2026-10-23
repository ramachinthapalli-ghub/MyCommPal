import { NextRequest, NextResponse } from 'next/server';
import { updateSessionFeedback } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, rating, tags, comment } = await req.json();

    if (!rating || typeof rating !== 'number') {
      return NextResponse.json({ error: 'A numerical rating (1-5) is required.' }, { status: 400 });
    }

    if (sessionId) {
      await updateSessionFeedback(sessionId, {
        rating,
        tags: tags || [],
        comment: comment || '',
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ error: error.message || 'Failed to save feedback' }, { status: 500 });
  }
}
