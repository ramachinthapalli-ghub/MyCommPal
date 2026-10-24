import { NextRequest, NextResponse } from 'next/server';
import { updateSessionFeedback, saveFeedbackRecord, getUserSessions } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, rating, tags, comment, userId, goal, audience, focus } = body;

    if (!rating || typeof rating !== 'number') {
      return NextResponse.json({ error: 'A numerical rating (1-5) is required.' }, { status: 400 });
    }

    let effectiveUserId = userId;
    if (!effectiveUserId || effectiveUserId === 'anonymous') {
      const userCookie = req.cookies.get('mycommpal_user')?.value;
      if (userCookie) {
        try {
          const u = JSON.parse(userCookie);
          if (u.id) effectiveUserId = u.id;
        } catch (e) {}
      }
    }

    let updatedSession = false;

    // 1. If sessionId is provided, update that session's feedback
    if (sessionId) {
      updatedSession = await updateSessionFeedback(sessionId, {
        rating,
        tags: tags || [],
        comment: comment || '',
      });
    }

    // 2. If no sessionId or update failed, attempt attaching to user's latest practice session
    if (!updatedSession && effectiveUserId && effectiveUserId !== 'anonymous') {
      try {
        const userSessions = await getUserSessions(effectiveUserId);
        if (userSessions.length > 0) {
          updatedSession = await updateSessionFeedback(userSessions[0].id, {
            rating,
            tags: tags || [],
            comment: comment || '',
          });
        }
      } catch (e) {
        console.warn('Could not attach feedback to latest session:', e);
      }
    }

    // 3. Store dedicated feedback record (persists to Supabase, memory store, and server log)
    const feedbackRecord = await saveFeedbackRecord({
      userId: effectiveUserId || 'anonymous',
      sessionId: sessionId || null,
      rating,
      tags: tags || [],
      comment: comment || '',
      goal,
      audience,
      focus,
    });

    return NextResponse.json({
      success: true,
      updatedSession,
      feedbackId: feedbackRecord.id,
    });
  } catch (error: any) {
    console.error('Error saving feedback:', error);
    return NextResponse.json({ error: error.message || 'Failed to save feedback' }, { status: 500 });
  }
}
