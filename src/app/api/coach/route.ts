import { NextRequest, NextResponse } from 'next/server';
import {
  runMentorAssess,
  runMentorCompare,
  runMentorNextPractice,
} from '@/lib/mentor-engine';
import { savePracticeSession, getOrCreateProfile } from '@/lib/supabase';
import {
  MentorAssessRequest,
  MentorCompareRequest,
  CoachNextPracticeRequest,
} from '@/lib/types';
import { AIConfigurationError, AIServiceError } from '@/lib/ai-provider';

// Simple per-IP rate limiter (30 requests per minute)
const ipRateMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 30;

  const record = ipRateMap.get(ip);
  if (!record || now > record.resetTime) {
    ipRateMap.set(ip, { count: 1, resetTime: now + windowMs });
    return false;
  }

  if (record.count >= maxRequests) {
    return true;
  }

  record.count++;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'You are submitting requests too quickly. Please pause for a moment before trying again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const mode = body.mode || body.operation;

    // Read user from body or cookie
    let userId = (body as any).userId || 'anonymous';
    if (userId === 'anonymous') {
      const userCookie = req.cookies.get('mycommpal_user')?.value;
      if (userCookie) {
        try {
          const u = JSON.parse(userCookie);
          if (u.id) userId = u.id;
        } catch (e) {}
      }
    }

    // 1. OPERATION: ASSESS
    if (mode === 'assess') {
      const { goal, audience, scenario, transcript, scenarioMode, attemptType } = body as MentorAssessRequest;

      if (!transcript || typeof transcript !== 'string') {
        return NextResponse.json({ error: 'Please share your spoken or typed response.' }, { status: 400 });
      }

      const trimmed = transcript.trim();
      if (trimmed.length < 35) {
        return NextResponse.json(
          { error: 'Please share a little more of your thinking (at least 35 characters) so Vira can give meaningful feedback.' },
          { status: 400 }
        );
      }

      if (trimmed.length > 4000) {
        return NextResponse.json(
          { error: 'Response exceeds 4,000 characters. Please share a more concise response.' },
          { status: 400 }
        );
      }

      const assessment = await runMentorAssess({
        mode: 'assess',
        goal: goal || 'Articulation',
        audience: audience || 'Cross-functional stakeholders',
        scenario: scenario || 'General PM Scenario',
        transcript: trimmed,
        scenarioMode: scenarioMode || 'vira',
        attemptType: attemptType || 'baseline',
      });

      return NextResponse.json(assessment);
    }

    // 2. OPERATION: COMPARE
    if (mode === 'compare') {
      const {
        goal,
        audience,
        scenario,
        firstTranscript,
        secondTranscript,
        thirdTranscript,
        focus,
        firstScores,
        practice1Scores,
        practicePlan,
        assessment,
        scenarioMode,
        attemptIndex,
      } = body;

      const compareTarget = thirdTranscript || secondTranscript;
      if (!compareTarget || typeof compareTarget !== 'string') {
        return NextResponse.json({ error: 'Please share your practice retry response before comparing.' }, { status: 400 });
      }

      const trimmedTarget = compareTarget.trim();
      if (trimmedTarget.length < 35) {
        return NextResponse.json(
          { error: 'Please complete your retry attempt (at least 35 characters) before comparing.' },
          { status: 400 }
        );
      }

      if (trimmedTarget.length > 4000) {
        return NextResponse.json(
          { error: 'Retry response exceeds 4,000 characters.' },
          { status: 400 }
        );
      }

      const comparison = await runMentorCompare({
        mode: 'compare',
        goal: goal || 'Articulation',
        audience: audience || 'Leadership and executives',
        scenario: scenario || 'General Scenario',
        firstTranscript: firstTranscript || '',
        secondTranscript: secondTranscript || '',
        thirdTranscript,
        focus: focus || 'structure',
        firstScores: firstScores || { clarity: 2, structure: 2, conciseness: 2 },
        practice1Scores,
        attemptIndex: attemptIndex || (thirdTranscript ? 2 : 1),
      });

      // Persist the full session to database
      let savedSession = null;
      try {
        let sessionUserId = userId;
        if (!sessionUserId || sessionUserId === 'anonymous') {
          const guestProfile = await getOrCreateProfile('guest', `guest_${Math.floor(1000 + Math.random() * 9000)}`);
          sessionUserId = guestProfile.id;
        }

        savedSession = await savePracticeSession({
          userId: sessionUserId,
          goal: goal || 'Articulation',
          audience: audience || 'Cross-functional stakeholders',
          scenarioMode: scenarioMode || 'mine',
          scenarioText: scenario || '',
          baselineTranscript: firstTranscript || '',
          baselineScores: firstScores || { clarity: 2, structure: 2, conciseness: 2 },
          focusSkill: focus || 'structure',
          focusExplanation: assessment?.focusExplanation || '',
          highlights: assessment?.highlights || [],
          technique: assessment?.technique || { name: 'Framework', steps: [], example: '' },
          practicePlan: practicePlan || { minutes: 5, frequency: 3 },
          retryTranscript: trimmedTarget,
          retryScores: comparison.secondScores,
          comparison,
        });
      } catch (dbErr) {
        console.warn('Session persistence error:', dbErr);
      }

      return NextResponse.json({
        ...comparison,
        savedSessionId: savedSession?.id,
      });
    }

    // 3. OPERATION: NEXT_PRACTICE
    if (mode === 'next_practice') {
      const { goal, audience, scenario, focus, weaknessSummary, lastTranscript } = body as CoachNextPracticeRequest;

      const nextPractice = await runMentorNextPractice({
        mode: 'next_practice',
        goal: goal || 'Articulation',
        audience: audience || 'Leadership and executives',
        scenario: scenario || 'General Scenario',
        focus: focus || 'clarity',
        weaknessSummary,
        lastTranscript,
      });

      return NextResponse.json(nextPractice);
    }

    return NextResponse.json(
      { error: 'Invalid operation. Supported operations are "assess", "compare", and "next_practice".' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Coach API error:', error);

    if (error instanceof AIConfigurationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'AI_CONFIG_ERROR',
        },
        { status: 503 }
      );
    }

    if (error instanceof AIServiceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: 'AI_SERVICE_ERROR',
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Vira encountered an unexpected issue evaluating your response. Please retry.' },
      { status: 500 }
    );
  }
}
