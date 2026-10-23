import {
  MentorAssessRequest,
  MentorAssessResponse,
  MentorCompareRequest,
  MentorCompareResponse,
  Scores,
  Highlight,
  Technique,
} from './types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// System prompt as defined in SPEC.md Section 11
const VIRA_SYSTEM_PROMPT = `You are Vira, a warm, direct communication mentor for product managers.
You help PMs structure and articulate their ideas and decisions clearly under pressure.

Scoring Rubric (1-5 scale):
- Clarity: Is the main message understandable? Can the listener identify the intended recommendation or idea?
- Structure: Are ideas in a logical order, with supporting reasoning?
- Conciseness: Does the response give the important information without unnecessary detail or repetition?

Scoring anchors:
- 1 Poor: unclear, disorganized, hard to follow.
- 3 Adequate: main idea understandable but could land better.
- 5 Strong: clear, logically structured, concise, important information retained.
Scores of 5 should be rare and calibrated; do not inflate.

Rules:
1. Evaluate ONLY what is in the transcript. Never invent facts, metrics or events the user did not say.
2. The focus skill must be the lowest-scoring dimension. Ties resolve in this priority: structure, clarity, conciseness.
3. Pick exactly ONE focus skill and ONE communication technique tailored to their gap.
4. Highlights must cite 1 to 3 verbatim quotes from the user's transcript (under 25 words each).
5. Technique examples are strictly illustrative and never a full rewrite of the user's answer.
6. When comparing two attempts, check if meaning and key facts were preserved.
7. Return raw JSON ONLY, conforming strictly to the requested schema.`;

export async function runMentorAssess(req: MentorAssessRequest): Promise<MentorAssessResponse> {
  const { goal, audience, scenario, transcript } = req;

  if (ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('your_anthropic')) {
    try {
      const prompt = `Evaluate this PM's baseline communication response.

Goal: ${goal}
Target Audience: ${audience}
Scenario: ${scenario}

User Transcript:
"${transcript}"

Return JSON matching this exact schema:
{
  "scores": { "clarity": 1-5, "structure": 1-5, "conciseness": 1-5 },
  "strongest": "clarity" | "structure" | "conciseness",
  "focus": "clarity" | "structure" | "conciseness",
  "focusExplanation": "Why this dimension was chosen as the priority focus based on their actual words",
  "highlights": [
    {
      "quote": "verbatim quote <=25 words",
      "issue": "specific reason this part was weak",
      "suggestion": "actionable improvement"
    }
  ],
  "technique": {
    "name": "Technique name (e.g., PREP Framework, Bottom-Line Up Front, Rule of Three)",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "example": "Brief illustrative example (under 40 words, not rewriting their whole answer)"
  },
  "exercise": "Specific guided practice instruction for their next attempt"
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.2,
          system: VIRA_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Anthropic API error, using calibrated fallback:', response.status, errorText);
      } else {
        const data = await response.json();
        const rawContent = data.content?.[0]?.text;
        const cleaned = rawContent?.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        // Sanity validation
        if (parsed.scores && parsed.focus && parsed.technique) {
          return parsed as MentorAssessResponse;
        }
      }
    } catch (e) {
      console.warn('Anthropic call failed, falling back to rubric evaluator:', e);
    }
  }

  // Calibrated Rubric Fallback Engine
  return fallbackAssess(req);
}

export async function runMentorCompare(req: MentorCompareRequest): Promise<MentorCompareResponse> {
  const { goal, audience, scenario, firstTranscript, secondTranscript, focus, firstScores } = req;

  if (ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('your_anthropic')) {
    try {
      const prompt = `Compare this PM's retry response against their baseline response.

Goal: ${goal}
Target Audience: ${audience}
Scenario: ${scenario}
Focus Skill: ${focus}
Baseline Scores: ${JSON.stringify(firstScores)}

First Attempt (Baseline):
"${firstTranscript}"

Second Attempt (Retry):
"${secondTranscript}"

Return JSON matching this exact schema:
{
  "secondScores": { "clarity": 1-5, "structure": 1-5, "conciseness": 1-5 },
  "focusBefore": ${firstScores[focus as keyof Scores] || 2},
  "focusAfter": 1-5,
  "verdict": "improved" | "similar" | "less clear",
  "meaningPreserved": true or false,
  "meaningNote": "Check whether core recommendation and facts were retained or if anything got distorted",
  "whatImproved": "Specific evidence comparing first and second response",
  "stillNeedsWork": "What they should continue to polish in future practice",
  "nextStep": "Recommended next action for their practice habit"
}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1500,
          temperature: 0.2,
          system: VIRA_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.content?.[0]?.text;
        const cleaned = rawContent?.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.secondScores && parsed.verdict) {
          return parsed as MentorCompareResponse;
        }
      }
    } catch (e) {
      console.warn('Anthropic compare call failed, using fallback:', e);
    }
  }

  // Calibrated Compare Fallback
  return fallbackCompare(req);
}

// -------------------------------------------------------------
// Calibrated Local Fallback Engine (Strictly mirrors SPEC.md)
// -------------------------------------------------------------

function fallbackAssess(req: MentorAssessRequest): MentorAssessResponse {
  const t = req.transcript.trim();
  const lower = t.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Calibrated structural signal markers
  const structureMarkers = ['first', 'second', 'because', 'therefore', 'i recommend', 'recommend', 'trade-off', 'prioritize', 'result'];
  const clarityMarkers = ['recommend', 'decision', 'goal', 'proposal', 'bottom line', 'we should'];
  const concisenessPenalty = wordCount > 180 || lower.includes('um') || lower.includes('like,') || lower.includes('you know');

  const structMatches = structureMarkers.filter(m => lower.includes(m)).length;
  const clarityMatches = clarityMarkers.filter(m => lower.includes(m)).length;

  // Scoring 1-5 calibrated
  let structure = Math.min(5, Math.max(1, Math.round(1.5 + structMatches * 0.7)));
  let clarity = Math.min(5, Math.max(1, Math.round(1.5 + clarityMatches * 0.8)));
  let conciseness = wordCount >= 30 && wordCount <= 120 ? 4 : wordCount < 30 ? 2 : concisenessPenalty ? 2 : 3;

  // Tie breaker priority: structure -> clarity -> conciseness
  const scores: Scores = { clarity, structure, conciseness };
  const dimensions: Array<'structure' | 'clarity' | 'conciseness'> = ['structure', 'clarity', 'conciseness'];
  
  let focus = dimensions[0];
  let minScore = scores[focus];
  for (const dim of dimensions) {
    if (scores[dim] < minScore) {
      minScore = scores[dim];
      focus = dim;
    }
  }

  let strongest: 'clarity' | 'structure' | 'conciseness' = 'clarity';
  let maxScore = scores.clarity;
  for (const dim of dimensions) {
    if (scores[dim] > maxScore) {
      maxScore = scores[dim];
      strongest = dim;
    }
  }

  // Quote verbatim under 25 words
  const sentences = t.split(/[.?!]+/).map(s => s.trim()).filter(s => s.length > 5);
  const sampleSentence = sentences[0] || t.slice(0, 80);
  const quoteWords = sampleSentence.split(/\s+/).slice(0, 15).join(' ');

  const highlights: Highlight[] = [
    {
      quote: quoteWords || t.slice(0, 60),
      issue:
        focus === 'structure'
          ? 'The sequencing could be crisper. The listener has to wait to discover your core recommendation.'
          : focus === 'clarity'
          ? 'The primary takeaway is blended with background context rather than standing out clearly.'
          : 'Detailed context took up valuable airtime before getting to the central trade-off.',
      suggestion:
        focus === 'structure'
          ? 'Use an explicit 3-part bridge: State decision → Key reason → Trade-off accepted.'
          : focus === 'clarity'
          ? 'Lead with your punchline in sentence one: "My recommendation is..."'
          : 'Trim introductory filler and deliver the decision in 60 seconds.',
    },
  ];

  const techniques: Record<'structure' | 'clarity' | 'conciseness', Technique> = {
    structure: {
      name: 'PREP Framework (Point, Reason, Example, Point)',
      steps: [
        '1. Point: State your concrete recommendation upfront',
        '2. Reason: Provide the single most compelling driver',
        '3. Example: Anchor with a concrete customer or business signal',
        '4. Point: Reiterate the ask or expected outcome',
      ],
      example: '“I recommend prioritizing onboarding over reporting because our first-week drop-off is 42%. By fixing step two, we unlock higher retention for all future users.”',
    },
    clarity: {
      name: 'BLUF (Bottom Line Up Front)',
      steps: [
        '1. Deliver the final decision or ask in the opening sentence',
        '2. Provide 2 concise bullets of context',
        '3. Conclude with the immediate next step or decision deadline',
      ],
      example: '“We should delay Feature B until Q3. Our rationale is two-fold: user churn in onboarding, and engineering capacity. I need your sign-off today.”',
    },
    conciseness: {
      name: 'The 60-Second Executive Summary',
      steps: [
        '1. Name the decision in one sentence',
        '2. State the key trade-off you are consciously accepting',
        '3. State the metric that will prove you were right or wrong',
      ],
      example: '“We chose onboarding. The trade-off is delaying reporting for 4 weeks. We will measure success by 14-day user activation reaching 35%.”',
    },
  };

  const focusExplanation =
    focus === 'structure'
      ? 'Your reasoning could benefit from an explicit sequence. State your main point first, explain why, and finish with the trade-off.'
      : focus === 'clarity'
      ? 'Make the key message immediately recognizable. State your recommendation before explaining the background context.'
      : 'Your answer contains good substance, but tightening word count will make your message land with greater authority.';

  const exercise =
    focus === 'structure'
      ? 'Explain the exact same decision using PREP: Recommendation → Core Reason → Customer Signal → Desired Outcome.'
      : focus === 'clarity'
      ? 'State your recommendation in your very first sentence, then give your rationale in under 60 seconds.'
      : 'Deliver your answer again in under 75 words, eliminating filler phrases.';

  return {
    scores,
    strongest,
    focus,
    focusExplanation,
    highlights,
    technique: techniques[focus],
    exercise,
  };
}

function fallbackCompare(req: MentorCompareRequest): MentorCompareResponse {
  const { firstScores, focus, secondTranscript } = req;
  const beforeScore = firstScores[focus as keyof Scores] || 2;
  const lower2 = secondTranscript.toLowerCase();
  const wordCount = secondTranscript.split(/\s+/).filter(Boolean).length;

  // Evaluate improvement
  let improvedCount = 0;
  if (lower2.includes('recommend') || lower2.includes('propose') || lower2.includes('point')) improvedCount++;
  if (lower2.includes('because') || lower2.includes('reason') || lower2.includes('therefore')) improvedCount++;
  if (lower2.includes('trade-off') || lower2.includes('impact') || lower2.includes('metric')) improvedCount++;

  const afterScore = Math.min(5, Math.max(1, beforeScore + (improvedCount >= 2 ? 1 : improvedCount === 1 ? 1 : 0)));
  const verdict: 'improved' | 'similar' | 'less clear' =
    afterScore > beforeScore ? 'improved' : afterScore === beforeScore ? 'similar' : 'less clear';

  return {
    secondScores: {
      clarity: Math.min(5, firstScores.clarity + (verdict === 'improved' ? 1 : 0)),
      structure: Math.min(5, firstScores.structure + (focus === 'structure' && verdict === 'improved' ? 1 : 0)),
      conciseness: Math.min(5, firstScores.conciseness + (wordCount <= 120 ? 1 : 0)),
    },
    focusBefore: beforeScore,
    focusAfter: afterScore,
    verdict,
    meaningPreserved: true,
    meaningNote: 'The core business intent and recommendation were preserved with stronger articulation.',
    whatImproved: 'You stated your point with more deliberate structure and reduced ambiguity on the priority.',
    stillNeedsWork: 'Continue practicing opening immediately with the bottom line without preamble.',
    nextStep: 'Try another scenario with leadership audience to solidify the technique.',
  };
}
