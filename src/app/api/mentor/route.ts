import { NextRequest, NextResponse } from 'next/server';
import { runMentorAssess, runMentorCompare } from '@/lib/mentor-engine';
import { savePracticeSession } from '@/lib/supabase';
import { MentorAssessRequest, MentorCompareRequest } from '@/lib/types';

// Simple per-IP rate limiter (FR: Basic per-IP rate limit on /api/mentor)
const ipRateMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30; // 30 requests per minute

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
    const mode = body.mode;

    // Read user from cookie if available
    let userId = 'anonymous';
    const userCookie = req.cookies.get('mycommpal_user')?.value;
    if (userCookie) {
      try {
        const u = JSON.parse(userCookie);
        if (u.id) userId = u.id;
      } catch (e) {}
    }

    if (mode === 'assess') {
      const { goal, audience, scenario, transcript, scenarioMode } = body as MentorAssessRequest;

      // Validation according to SPEC.md section 10
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
      });

      return NextResponse.json(assessment);
    } else if (mode === 'compare') {
      const {
        goal,
        audience,
        scenario,
        firstTranscript,
        secondTranscript,
        focus,
        firstScores,
        practicePlan,
        assessment,
        scenarioMode,
      } = body;

      if (!secondTranscript || typeof secondTranscript !== 'string') {
        return NextResponse.json({ error: 'Please share your retry response before comparing.' }, { status: 400 });
      }

      const trimmed2 = secondTranscript.trim();
      if (trimmed2.length < 35) {
        return NextResponse.json(
          { error: 'Please complete your retry attempt (at least 35 characters) before comparing.' },
          { status: 400 }
        );
      }

      if (trimmed2.length > 4000) {
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
        secondTranscript: trimmed2,
        focus: focus || 'structure',
        firstScores: firstScores || { clarity: 2, structure: 2, conciseness: 2 },
      });

      // Persist the full session to database!
      let savedSession = null;
      if (userId) {
        try {
          savedSession = await savePracticeSession({
            userId,
            goal: goal || 'Articulation',
            audience: audience || 'Cross-functional stakeholders',
            scenarioMode: scenarioMode || 'vira',
            scenarioText: scenario || '',
            baselineTranscript: firstTranscript || '',
            baselineScores: firstScores || { clarity: 2, structure: 2, conciseness: 2 },
            focusSkill: focus || 'structure',
            focusExplanation: assessment?.focusExplanation || '',
            highlights: assessment?.highlights || [],
            technique: assessment?.technique || { name: 'Framework', steps: [], example: '' },
            practicePlan: practicePlan || { minutes: 5, frequency: 3 },
            retryTranscript: trimmed2,
            retryScores: comparison.secondScores,
            comparison,
          });
        } catch (dbErr) {
          console.warn('Session persistence error:', dbErr);
        }
      }

      return NextResponse.json({
        ...comparison,
        savedSessionId: savedSession?.id,
      });
    }

    return NextResponse.json({ error: 'Invalid mode. Use "assess" or "compare".' }, { status: 400 });
  } catch (error: any) {
    console.error('Mentor API error:', error);
    return NextResponse.json(
      { error: error.message || 'Vira encountered an unexpected issue evaluating your response. Please retry.' },
      { status: 500 }
    );
  }
}
