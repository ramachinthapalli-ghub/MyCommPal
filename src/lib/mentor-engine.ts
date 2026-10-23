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

// System prompt as defined in SPEC.md Section 11, updated for deep situational context
const VIRA_SYSTEM_PROMPT = `You are Vira, a warm, direct communication mentor for product managers.
You help PMs structure and articulate their ideas, decisions, stories, and presentations clearly under pressure.

Scoring Rubric (1-5 scale):
- Clarity: Is the main message understandable? Can the listener identify the intended recommendation or idea?
- Structure: Are ideas in a logical order, with supporting reasoning?
- Conciseness: Does the response give the important information without unnecessary detail or repetition?

Scoring anchors:
- 1 Poor: unclear, disorganized, hard to follow, or just copying the question.
- 3 Adequate: main idea understandable but could land better.
- 5 Strong: clear, logically structured, concise, important information retained.
Scores of 5 should be rare and calibrated; do not inflate.

CRITICAL RULES:
1. ALWAYS maintain deep relevance to the user's specific situation, topic, goal, and audience.
2. If the user is telling a story (e.g., career journey, aspiring PM talk, product failure), recommend a storytelling framework (e.g. Hook-Journey-Reflection, HCP Arc) and provide an illustrative example explicitly about THEIR topic. NEVER give an irrelevant onboarding vs reporting example if the user is talking about their career journey or another topic!
3. If the user's response simply copies or repeats the scenario/question without answering, flag it in focusExplanation and guide them to take a stand.
4. Highlights must cite 1 to 3 verbatim quotes from the user's transcript (under 25 words each).
5. In compare mode: verify if Attempt 2 is relevant to the topic. If Attempt 2 simply copied the prompt instructions (e.g., "Active Technique: PREP Framework...") or is nonsensical, mark meaningPreserved as false, verdict as "less clear", and DO NOT increase the score.
6. Return raw JSON ONLY, conforming strictly to the requested schema.`;

export async function runMentorAssess(req: MentorAssessRequest): Promise<MentorAssessResponse> {
  const { goal, audience, scenario, transcript } = req;

  if (ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('your_anthropic')) {
    try {
      const prompt = `Evaluate this PM's baseline communication response.

Goal: ${goal}
Target Audience: ${audience}
Scenario / Situation: ${scenario}

User Transcript:
"${transcript}"

Requirements:
1. Evaluate ONLY what is in the transcript.
2. Check if the user merely copied/echoed the question prompt without answering. If so, focus on clarity, score 1-2, explain: "Your response repeats the prompt. To practice effectively, answer with your specific decision, story, or recommendation."
3. Select ONE focus skill (lowest scoring: structure, clarity, or conciseness).
4. The technique and illustrative example MUST be deeply relevant to the user's situation and goal (e.g., if the user is giving a talk on their PM journey to aspiring PMs, use a storytelling structure and craft an illustrative example about a PM journey; if articulating a feature trade-off, use a trade-off framework).
5. Highlight 1-3 verbatim phrases (<=25 words) from their transcript.

Return JSON matching this exact schema:
{
  "scores": { "clarity": 1-5, "structure": 1-5, "conciseness": 1-5 },
  "strongest": "clarity" | "structure" | "conciseness",
  "focus": "clarity" | "structure" | "conciseness",
  "focusExplanation": "Why this dimension was chosen as the priority focus based on their actual words and situation",
  "highlights": [
    {
      "quote": "verbatim quote <=25 words",
      "issue": "specific reason this part was weak",
      "suggestion": "actionable improvement"
    }
  ],
  "technique": {
    "name": "Technique name relevant to situation (e.g., Hook-Journey-Reflection for stories, 3Ps for presentations, PREP for decisions)",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "example": "Brief illustrative example under 45 words explicitly demonstrating how to speak about THEIR topic"
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

        if (parsed.scores && parsed.focus && parsed.technique) {
          return parsed as MentorAssessResponse;
        }
      }
    } catch (e) {
      console.warn('Anthropic call failed, falling back to rubric evaluator:', e);
    }
  }

  // Calibrated Contextual Fallback Engine
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

CRITICAL RELEVANCE CHECK:
- Verify whether Attempt 2 is a genuine attempt to communicate about the scenario/topic.
- If Attempt 2 simply copied the exercise prompt (e.g. "Active Technique: PREP Framework...", "Goal: Explain the exact same decision..."), or entered irrelevant text, you MUST:
  1. Set meaningPreserved to false.
  2. Set meaningNote to "The retry attempt pasted the exercise instructions or was off-topic rather than delivering a genuine spoken/typed response."
  3. Set verdict to "less clear".
  4. Keep focusAfter equal to or lower than focusBefore. DO NOT award higher scores for prompt copies.
  5. State in whatImproved that no improvement could be measured.

Return JSON matching this exact schema:
{
  "secondScores": { "clarity": 1-5, "structure": 1-5, "conciseness": 1-5 },
  "focusBefore": ${firstScores[focus as keyof Scores] || 2},
  "focusAfter": 1-5,
  "verdict": "improved" | "similar" | "less clear",
  "meaningPreserved": true or false,
  "meaningNote": "Specific evaluation of message preservation vs distortion or prompt copy",
  "whatImproved": "Evidence comparing both attempts",
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
// Calibrated Contextual Fallback Engine (Strictly mirrors SPEC.md)
// -------------------------------------------------------------

function fallbackAssess(req: MentorAssessRequest): MentorAssessResponse {
  const t = req.transcript.trim();
  const lower = t.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const scenarioLower = (req.scenario || '').toLowerCase();
  const goal = req.goal || 'Articulation';

  // 1. Check for Question Echo (user simply copy-pasted or echoed the prompt)
  const isQuestionEcho =
    (scenarioLower.length > 20 &&
      (lower.includes("you're a product manager") ||
        lower.includes('which would you prioritize') ||
        lower.includes('our team can build either') ||
        lower.includes('a stakeholder asks why you are delaying') ||
        lower.includes('tell the story of a product problem'))) ||
    lower.startsWith('your real situation:') ||
    (scenarioLower.length > 30 && lower.includes(scenarioLower.slice(0, 40)));

  if (isQuestionEcho) {
    return {
      scores: { clarity: 1, structure: 2, conciseness: 3 },
      strongest: 'conciseness',
      focus: 'clarity',
      focusExplanation:
        'I noticed your response repeats the prompt rather than delivering your actual point of view. To get value from this practice, take a clear stand and share your reasoning.',
      highlights: [
        {
          quote: t.slice(0, 60),
          issue: 'This repeats the scenario question rather than providing your answer or decision.',
          suggestion: 'Start directly with your answer: e.g., "My recommendation is..." or "In my journey as a PM..."',
        },
      ],
      technique: {
        name: 'BLUF (Bottom Line Up Front)',
        steps: [
          '1. State your direct decision or key takeaway in the first sentence',
          '2. Provide two clear supporting points',
          '3. Conclude with the call-to-action or next milestone',
        ],
        example:
          '“My recommendation is that we focus on onboarding first. Our data shows 40% user drop-off before feature discovery, so fixing activation compounds every other metric.”',
      },
      exercise: 'Deliver your real answer in one or two sentences. State what you would decide or say to your audience.',
    };
  }

  // 2. Detect Context / Theme
  const isStorytelling =
    goal === 'Storytelling' ||
    lower.includes('story') ||
    lower.includes('journey') ||
    lower.includes('aspiring') ||
    lower.includes('career') ||
    lower.includes('talk') ||
    lower.includes('meetup') ||
    lower.includes('lesson');

  const isPresentation =
    goal === 'Presentations' ||
    lower.includes('presentation') ||
    lower.includes('opening') ||
    lower.includes('slide') ||
    lower.includes('propose') ||
    lower.includes('pitch');

  // Structural markers
  const structureMarkers = [
    'first',
    'second',
    'then',
    'because',
    'therefore',
    'recommend',
    'trade-off',
    'prioritize',
    'turning point',
    'learned',
    'result',
    'impact',
  ];
  const clarityMarkers = ['recommend', 'decision', 'takeaway', 'lesson', 'goal', 'we should', 'bottom line', 'point is'];
  const concisenessPenalty = wordCount > 180 || lower.includes('um') || lower.includes('like,') || lower.includes('you know');

  const structMatches = structureMarkers.filter(m => lower.includes(m)).length;
  const clarityMatches = clarityMarkers.filter(m => lower.includes(m)).length;

  let structure = Math.min(5, Math.max(1, Math.round(1.6 + structMatches * 0.7)));
  let clarity = Math.min(5, Math.max(1, Math.round(1.6 + clarityMatches * 0.7)));
  let conciseness = wordCount >= 30 && wordCount <= 120 ? 4 : wordCount < 30 ? 2 : concisenessPenalty ? 2 : 3;

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
          ? 'The narrative progression needs a tighter bridge between the setup and the key takeaway.'
          : focus === 'clarity'
          ? 'Your central point is woven into the backstory rather than standing out as a memorable headline.'
          : 'Detailed context took up valuable airtime before getting to the core message.',
      suggestion:
        focus === 'structure'
          ? 'Use an explicit 3-part sequence: Opening hook → Pivotal event → Clear takeaway.'
          : focus === 'clarity'
          ? 'Front-load your punchline: state what you learned or what you want the audience to remember upfront.'
          : 'Trim background setup and deliver the primary message in under 90 seconds.',
    },
  ];

  // 3. Tailor Techniques and Illustrative Examples to the User's Actual Situation!
  let technique: Technique;
  let focusExplanation = '';
  let exercise = '';

  if (isStorytelling) {
    technique = {
      name: 'Hook, Journey, Reflection (HJR Arc)',
      steps: [
        '1. Hook: Start with your initial assumption or the core struggle (15s)',
        '2. Journey: Share the unexpected obstacle or turning point (45s)',
        '3. Reflection: Deliver the actionable takeaway for aspiring PMs (30s)',
      ],
      example:
        '“When I started as a PM, I thought the job was having all the answers. The turning point was launching a feature nobody used—which taught me PM is actually about asking better questions. That shift changed how I build products today.”',
    };
    focusExplanation =
      'Your story has great authenticity, but listeners need a clear narrative arc so your message lands with lasting inspiration.';
    exercise =
      'Tell your story in 3 beats: 1) What you believed at first, 2) The turning-point experience, and 3) The single lesson you want aspiring PMs to remember.';
  } else if (isPresentation) {
    technique = {
      name: 'The 3Ps Opening (Purpose, Problem, Payoff)',
      steps: [
        '1. Purpose: Why we are here right now (1 sentence)',
        '2. Problem: The primary friction or customer opportunity we must tackle',
        '3. Payoff: The specific outcome or decision we will reach together',
      ],
      example:
        '“Today I am sharing our H2 product focus. Our biggest hurdle is that 35% of users abandon onboarding on day one. By the end of this talk, we will align on the two core bets we are funding to solve it.”',
    };
    focusExplanation =
      'Your presentation opening sets the tone for stakeholder attention. Leading with purpose and expected payoff grabs immediate engagement.';
    exercise =
      'Open your presentation using the 3Ps: State the purpose of your talk, the problem at hand, and what the audience will gain by listening.';
  } else {
    // Decision / Articulation
    technique = {
      name: 'PREP Framework (Point, Reason, Example, Point)',
      steps: [
        '1. Point: State your concrete recommendation or position upfront',
        '2. Reason: Provide the single most compelling driver',
        '3. Example: Anchor with a concrete customer, business, or data signal',
        '4. Point: Reiterate the decision and immediate next step',
      ],
      example:
        '“My recommendation is prioritizing the onboarding flow over reporting. Our data shows 42% first-week drop-off, which limits downstream adoption. Fixing activation compounds value for all future users.”',
    };
    focusExplanation =
      'Your reasoning has substance, but structuring it into a direct Point → Reason → Example sequence will make it unmistakable to executive stakeholders.';
    exercise =
      'Rehearse your answer with PREP: State your recommendation in sentence one, give your rationale, cite a real observation, and end with the decision.';
  }

  return {
    scores,
    strongest,
    focus,
    focusExplanation,
    highlights,
    technique,
    exercise,
  };
}

function fallbackCompare(req: MentorCompareRequest): MentorCompareResponse {
  const { firstScores, focus, secondTranscript } = req;
  const beforeScore = firstScores[focus as keyof Scores] || 2;
  const lower2 = secondTranscript.toLowerCase();
  const words2 = secondTranscript.split(/\s+/).filter(Boolean);
  const wordCount2 = words2.length;

  // 1. Check if user simply copied framework instructions into the retry box!
  const isInstructionEcho =
    lower2.includes('active technique:') ||
    lower2.includes('goal: explain the exact same decision') ||
    lower2.includes('prep framework (point, reason') ||
    lower2.includes('hook, journey, reflection') ||
    lower2.includes('the 3ps opening') ||
    lower2.startsWith('technique:') ||
    lower2.startsWith('active technique');

  if (isInstructionEcho) {
    return {
      secondScores: { ...firstScores },
      focusBefore: beforeScore,
      focusAfter: beforeScore, // NO ARTIFICIAL SCORE INCREASE!
      verdict: 'less clear',
      meaningPreserved: false,
      meaningNote:
        'The retry response appears to have pasted the technique prompt or instructions, rather than providing your spoken or typed response to the situation.',
      whatImproved: 'No improvement could be assessed because the second attempt did not respond to the original scenario.',
      stillNeedsWork:
        'Please deliver your actual thoughts to the audience using the technique, rather than copying the exercise text.',
      nextStep: 'Tap the mic or type your genuine response applying the steps you just learned.',
    };
  }

  // 2. Check for off-topic or completely disconnected retry
  const lower1 = (req.firstTranscript || '').toLowerCase();
  const words1 = lower1.split(/\s+/).filter(w => w.length > 3);
  const overlap = words1.filter(w => lower2.includes(w)).length;
  const isCompletelyDisconnected = words1.length > 6 && overlap === 0 && wordCount2 > 10;

  if (isCompletelyDisconnected) {
    return {
      secondScores: { ...firstScores },
      focusBefore: beforeScore,
      focusAfter: beforeScore,
      verdict: 'less clear',
      meaningPreserved: false,
      meaningNote:
        'The retry response shifted away from the original situation or message, making it difficult to measure improvement.',
      whatImproved: 'The second attempt introduced unrelated content rather than refining the original message.',
      stillNeedsWork: 'Maintain the same scenario and core message while refining structure and clarity.',
      nextStep: 'Retry the original prompt and apply the structure to your baseline thoughts.',
    };
  }

  // 3. Genuine calibrated comparison
  let improvedCount = 0;
  if (lower2.includes('recommend') || lower2.includes('propose') || lower2.includes('point') || lower2.includes('journey')) improvedCount++;
  if (lower2.includes('because') || lower2.includes('reason') || lower2.includes('turning point') || lower2.includes('learned')) improvedCount++;
  if (lower2.includes('trade-off') || lower2.includes('impact') || lower2.includes('metric') || lower2.includes('takeaway')) improvedCount++;

  const afterScore = Math.min(5, Math.max(1, beforeScore + (improvedCount >= 2 ? 1 : 0)));
  const verdict: 'improved' | 'similar' | 'less clear' =
    afterScore > beforeScore ? 'improved' : afterScore === beforeScore ? 'similar' : 'less clear';

  return {
    secondScores: {
      clarity: Math.min(5, firstScores.clarity + (verdict === 'improved' ? 1 : 0)),
      structure: Math.min(5, firstScores.structure + (focus === 'structure' && verdict === 'improved' ? 1 : 0)),
      conciseness: Math.min(5, firstScores.conciseness + (wordCount2 <= 130 && wordCount2 >= 35 ? 1 : 0)),
    },
    focusBefore: beforeScore,
    focusAfter: afterScore,
    verdict,
    meaningPreserved: true,
    meaningNote: 'The core business intent and message were preserved while sharpening the delivery.',
    whatImproved: 'Your second response connected your main message directly with supporting context and fewer distractions.',
    stillNeedsWork: 'Continue practicing opening immediately with your punchline before adding backstory.',
    nextStep: 'Try another scenario with a different audience to make the technique second nature.',
  };
}
