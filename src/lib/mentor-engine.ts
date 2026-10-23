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

// System prompt for Vira: World-Class PM Communication Mentor
const VIRA_SYSTEM_PROMPT = `You are Vira, an elite, warm, and highly calibrated communication mentor for Product Managers.
Your mission is to help PMs articulate ideas, defend decisions, influence without authority, tell compelling product stories, and deliver punchy executive presentations.

Evaluation Rubric (1-5 scale):
- Clarity: Is the core message/decision unmistakable in the first 20 seconds? Can any listener instantly understand the recommendation or moral?
- Structure: Does the response follow a deliberate logical progression (e.g., PREP, BLUF, Hook-Journey-Reflection, 3Ps)? Are transitions natural?
- Conciseness: Does every sentence add value? Is unnecessary preamble, filler ("um", "like", "you know"), or redundant context eliminated?

Scoring Calibration:
- 1 Poor: Disorganized, rambles without arriving at a point, or merely echoes the prompt question.
- 2 Developing: Has good underlying thoughts but buried under heavy preamble, passive language, or missing rationale.
- 3 Adequate: Main point is understandable, but lacks executive punch, crisp structure, or memorable takeaway.
- 4 Strong: Well-structured, clear recommendation/story, good supporting evidence, concise delivery.
- 5 Exceptional: Flawless executive delivery, compelling hook, airtight logic, zero fluff (very rare).

CRITICAL ANALYSIS RULES:
1. DEEP SITUATIONAL RELEVANCE:
   - Identify the user's specific context, domain, audience, and scenario (e.g., career talk to aspiring PMs, tough feature delay to leadership, roadmap prioritization, cross-functional alignment).
   - NEVER provide canned or mismatched examples (e.g., NEVER show an onboarding vs reporting example if the user is talking about their career journey, a technical migration, or a customer story!).
   - Craft an illustrative example under 45 words that models EXACTLY how to speak about THEIR specific topic.

2. DETECT PROMPT ECHOES / NON-ANSWERS:
   - If the user simply repeats or copies the prompt question without expressing their own thoughts/decisions, score Clarity as 1, explain that they repeated the prompt, and challenge them to share their own stance.

3. SELECT THE HIGHEST-LEVERAGE FOCUS SKILL:
   - Focus on the single lowest-scoring dimension (ties resolve: Structure -> Clarity -> Conciseness).
   - Explain the specific gap with empathy and precision.

4. VERBATIM HIGHLIGHTS WITH ACTIONABLE REWRITES:
   - Cite 1-3 exact quotes (<25 words) from their actual transcript.
   - For each quote, explain why it diluted their impact and provide a concrete "Say this instead:" suggestion.

5. ACCURATE COMPARISON IN RETRY MODE:
   - Compare Attempt 1 and Attempt 2 rigorously.
   - Detect if Attempt 2 pasted framework headers/instructions (e.g., "Active Technique: PREP Framework...") or went off-topic. If so, mark meaningPreserved=false, verdict="less clear", and DO NOT increase scores.
   - Only award a score improvement if Attempt 2 applied the technique to their real message and improved clarity/structure without dropping critical facts.`;

export async function runMentorAssess(req: MentorAssessRequest): Promise<MentorAssessResponse> {
  const { goal, audience, scenario, transcript } = req;

  if (ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('your_anthropic')) {
    try {
      const prompt = `Analyze this Product Manager's baseline response and deliver calibrated mentorship feedback.

Context:
- Goal: ${goal}
- Audience: ${audience}
- Scenario / Situation: ${scenario}

User Transcript:
"${transcript}"

Instructions:
1. Examine the user's actual words against their specific situation and audience.
2. Check if the user merely repeated the question prompt. If so, flag in focusExplanation and give an opening sentence to start answering.
3. Recommend ONE communication framework best suited to their topic:
   - Storytelling / Career / Journey -> Hook, Journey, Reflection (HJR Arc) or Situation, Complication, Resolution (SCR)
   - Presentations / Pitches -> The 3Ps Opening (Purpose, Problem, Payoff) or BLUF Executive Opening
   - Articulation / Prioritization / Trade-offs -> PREP (Point, Reason, Example, Point) or DRT (Decision, Rationale, Trade-off)
4. Craft an illustrative example under 45 words that explicitly demonstrates how to speak about THEIR exact topic and situation.
5. Provide 1-3 verbatim highlights with constructive "Say this instead" suggestions.

Return raw JSON strictly matching:
{
  "scores": { "clarity": 1-5, "structure": 1-5, "conciseness": 1-5 },
  "strongest": "clarity" | "structure" | "conciseness",
  "focus": "clarity" | "structure" | "conciseness",
  "focusExplanation": "Clear diagnosis of why this dimension is their biggest opportunity for growth in this situation",
  "highlights": [
    {
      "quote": "verbatim quote <=25 words from transcript",
      "issue": "specific reason this part weakened their message",
      "suggestion": "Say this instead: [crisp alternative phrasing]"
    }
  ],
  "technique": {
    "name": "Specific Framework Name",
    "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ..."],
    "example": "High-impact illustrative example under 45 words tailored to their specific topic"
  },
  "exercise": "Actionable drill telling them how to start their next retry attempt"
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
          temperature: 0.1,
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
      console.warn('Anthropic call failed, falling back to calibrated engine:', e);
    }
  }

  // Calibrated Contextual Fallback Engine
  return fallbackAssess(req);
}

export async function runMentorCompare(req: MentorCompareRequest): Promise<MentorCompareResponse> {
  const { goal, audience, scenario, firstTranscript, secondTranscript, focus, firstScores } = req;

  if (ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.includes('your_anthropic')) {
    try {
      const prompt = `Evaluate whether this PM improved their communication in their guided retry.

Context:
- Goal: ${goal}
- Audience: ${audience}
- Scenario: ${scenario}
- Focus Skill: ${focus}
- Baseline Scores: ${JSON.stringify(firstScores)}

Baseline Response (Attempt 1):
"${firstTranscript}"

Retry Response (Attempt 2):
"${secondTranscript}"

Strict Evaluation Rules:
1. Relevance Verification:
   - If Attempt 2 merely copied the prompt instructions (e.g. "Active Technique: PREP...", "Goal: Explain..."), or is unrelated/nonsense:
     * Set meaningPreserved: false
     * Set meaningNote: "The retry attempt pasted the exercise instructions or was off-topic rather than delivering an authentic response."
     * Set verdict: "less clear"
     * Set focusAfter: ${firstScores[focus as keyof Scores] || 2} (DO NOT increase scores!)
     * Set whatImproved: "No improvement could be measured because the second attempt did not respond to the situation."
2. Genuine Progress Check:
   - If Attempt 2 genuinely applied the framework to their situation:
     * Verify if the message, core facts, and intent were preserved without distortion.
     * Compare opening sentences, structure, and brevity.
     * Award an increase in ${focus} only if tangible structural clarity is demonstrated.

Return raw JSON strictly matching:
{
  "secondScores": { "clarity": 1-5, "structure": 1-5, "conciseness": 1-5 },
  "focusBefore": ${firstScores[focus as keyof Scores] || 2},
  "focusAfter": 1-5,
  "verdict": "improved" | "similar" | "less clear",
  "meaningPreserved": true or false,
  "meaningNote": "Evaluation of whether core facts and intent were maintained or distorted",
  "whatImproved": "Precise comparison of what Attempt 2 did better than Attempt 1",
  "stillNeedsWork": "Specific next refinement for their delivery",
  "nextStep": "Recommended next action"
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
          temperature: 0.1,
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
// Calibrated Contextual Fallback Engine
// -------------------------------------------------------------

function fallbackAssess(req: MentorAssessRequest): MentorAssessResponse {
  const t = req.transcript.trim();
  const lower = t.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const scenarioLower = (req.scenario || '').toLowerCase();
  const goal = req.goal || 'Articulation';
  const audience = req.audience || 'Cross-functional stakeholders';

  // 1. Detect Prompt Echo / Verbatim Copy
  const isQuestionEcho =
    lower.includes("you're a product manager") ||
    lower.includes('which would you prioritize') ||
    lower.includes('our team can build either') ||
    lower.includes('a stakeholder asks why you are delaying') ||
    lower.includes('tell the story of a product problem') ||
    lower.startsWith('your real situation:') ||
    (scenarioLower.length > 25 && lower.includes(scenarioLower.slice(0, 35)));

  if (isQuestionEcho) {
    return {
      scores: { clarity: 1, structure: 2, conciseness: 3 },
      strongest: 'conciseness',
      focus: 'clarity',
      focusExplanation:
        'I noticed your response repeated the scenario prompt instead of stating your own perspective. The greatest value comes when you take a firm stance and defend your decision.',
      highlights: [
        {
          quote: t.slice(0, 60),
          issue: 'This restates the challenge rather than sharing your point of view.',
          suggestion: 'Say this instead: “My decision is to prioritize [Option X] because [Key Driver] will protect our core customer metric.”',
        },
      ],
      technique: {
        name: 'BLUF (Bottom Line Up Front)',
        steps: [
          '1. Bottom Line: State your choice or takeaway in your very first sentence',
          '2. Rationale: Give two crisp supporting reasons',
          '3. Trade-off: Name the trade-off you are accepting and how you will measure success',
        ],
        example:
          '“My recommendation is that we fund onboarding first. While reporting is requested, 40% of signups stall on day one. Fixing activation compounds all downstream value.”',
      },
      exercise: 'Deliver your real decision in sentence one: Start with “My recommendation is...” followed by your single strongest reason.',
    };
  }

  // 2. Extract Contextual Domain & Topic
  const isCareerOrJourney =
    lower.includes('journey') ||
    lower.includes('career') ||
    lower.includes('aspiring') ||
    lower.includes('transition') ||
    lower.includes('talk') ||
    lower.includes('meetup') ||
    scenarioLower.includes('journey') ||
    scenarioLower.includes('story') ||
    goal === 'Storytelling';

  const isPresentation =
    goal === 'Presentations' ||
    lower.includes('presentation') ||
    lower.includes('pitch') ||
    lower.includes('opening') ||
    lower.includes('proposal') ||
    scenarioLower.includes('presentation') ||
    scenarioLower.includes('open a presentation');

  const isDelayOrFriction =
    scenarioLower.includes('delay') ||
    scenarioLower.includes('friction') ||
    lower.includes('delay') ||
    lower.includes('friction') ||
    lower.includes('debt');

  // 3. Calibrated Scoring Rubric
  const structureMarkers = [
    'first', 'second', 'because', 'therefore', 'recommend', 'trade-off', 'prioritize',
    'turning point', 'learned', 'result', 'impact', 'lesson', 'decision', 'step'
  ];
  const clarityMarkers = ['recommend', 'decision', 'takeaway', 'point is', 'bottom line', 'we chose', 'goal', 'we must'];
  const fillerPenalty = wordCount > 180 || lower.includes('um') || lower.includes('like,') || lower.includes('you know');

  const structMatches = structureMarkers.filter(m => lower.includes(m)).length;
  const clarityMatches = clarityMarkers.filter(m => lower.includes(m)).length;

  let structure = Math.min(5, Math.max(1, Math.round(1.5 + structMatches * 0.7)));
  let clarity = Math.min(5, Math.max(1, Math.round(1.5 + clarityMatches * 0.75)));
  let conciseness = wordCount >= 35 && wordCount <= 125 ? 4 : wordCount < 35 ? 2 : fillerPenalty ? 2 : 3;

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

  // Verbatim quote extraction
  const sentences = t.split(/[.?!]+/).map(s => s.trim()).filter(s => s.length > 8);
  const sampleSentence = sentences[0] || t.slice(0, 80);
  const quoteWords = sampleSentence.split(/\s+/).slice(0, 16).join(' ');

  let highlightSuggestion = '';
  if (focus === 'clarity') {
    highlightSuggestion = isCareerOrJourney
      ? 'Say this instead: “The core lesson I want to share today is that PM is about asking better questions, not having all the answers.”'
      : 'Say this instead: “My direct recommendation is [X], driven by [Key Metric], accepting [Trade-off].”';
  } else if (focus === 'structure') {
    highlightSuggestion = isCareerOrJourney
      ? 'Say this instead: “I started in [Previous Role]. The turning point was [Failure/Insight]. Today, that shapes how I build products.”'
      : 'Say this instead: “First, the decision: [X]. Second, the reason: [Y]. Third, what we monitor: [Z].”';
  } else {
    highlightSuggestion = 'Say this instead: Trim the introductory backstory and deliver your punchline in under 60 seconds.';
  }

  const highlights: Highlight[] = [
    {
      quote: quoteWords || t.slice(0, 60),
      issue:
        focus === 'structure'
          ? 'The transition between your premise and the final conclusion is loose, making it harder for listeners to follow your logic.'
          : focus === 'clarity'
          ? 'Your central point is blended into background context rather than landing as a clear, authoritative headline.'
          : 'Detailed setup took up valuable airtime before getting to the heart of the message.',
      suggestion: highlightSuggestion,
    },
  ];

  // 4. Fully Contextual Techniques & Situational Examples
  let technique: Technique;
  let focusExplanation = '';
  let exercise = '';

  if (isCareerOrJourney) {
    technique = {
      name: 'Hook, Journey, Reflection (HJR Story Arc)',
      steps: [
        '1. Hook (15s): Open with your original misconception or beginner struggle',
        '2. Journey (45s): Share the unexpected hurdle or turning-point project',
        '3. Reflection (30s): State the single mental model aspiring PMs should adopt',
      ],
      example:
        '“When I transitioned into PM, I thought the job was having all the answers. The turning point was shipping a feature nobody used—which taught me PM is actually about asking better customer questions. That shift made me ten times more effective.”',
    };
    focusExplanation =
      'Your story has great authenticity, but structuring it into an explicit Hook → Journey → Reflection arc will make your message unforgettable for aspiring PMs.';
    exercise =
      'Rehearse your talk in 3 beats: 1) What you believed at first, 2) The turning-point experience, and 3) The single takeaway for your audience.';
  } else if (isPresentation) {
    technique = {
      name: 'The 3Ps Opening (Purpose, Problem, Payoff)',
      steps: [
        '1. Purpose: Why we are gathered today in one clear sentence',
        '2. Problem: The critical customer or business friction we face right now',
        '3. Payoff: The concrete alignment or decision we will reach by the end',
      ],
      example:
        '“Today I am presenting our H2 roadmap strategy. Our biggest friction is that 35% of signups abandon during onboarding. By the end of this session, we will align on funding the self-serve workflow to solve it.”',
    };
    focusExplanation =
      'Your opening dictates executive engagement. Using the 3Ps sets a high-authority frame in the first 60 seconds.';
    exercise =
      'Open your presentation using the 3Ps: State the purpose of the talk, the friction point, and what decision you will make together.';
  } else if (isDelayOrFriction) {
    technique = {
      name: 'DRT Framework (Decision, Rationale, Trade-off)',
      steps: [
        '1. Decision: State the timeline change or prioritization directly upfront',
        '2. Rationale: Anchor with customer data, retention risk, or system health',
        '3. Trade-off: State the accepted trade-off and the revised delivery date',
      ],
      example:
        '“We are delaying the analytics dashboard by 3 weeks to fix a core login friction. While the dashboard is anticipated, checkout errors are causing immediate churn. Stabilizing access protects ARR, and we resume dashboard rollout next month.”',
    };
    focusExplanation =
      'When explaining delays or friction, stakeholders respect directness. State the decision first, then justify it with customer protection.';
    exercise =
      'Explain the situation using DRT: Start with the decision, state the customer rationale, and name the trade-off you are consciously accepting.';
  } else {
    technique = {
      name: 'PREP Framework (Point, Reason, Example, Point)',
      steps: [
        '1. Point: State your concrete recommendation upfront',
        '2. Reason: Provide the single most compelling driver',
        '3. Example: Anchor with a concrete customer, business, or data signal',
        '4. Point: Reiterate the decision and expected outcome',
      ],
      example:
        '“My recommendation is prioritizing the onboarding overhaul over reporting. Our data shows 42% first-week drop-off, which caps overall growth. Fixing activation compounds retention for all future users.”',
    };
    focusExplanation =
      'Your reasoning has substance, but organizing it into a disciplined PREP sequence will make it punchy and unmistakable to stakeholders.';
    exercise =
      'Deliver your answer with PREP: Recommendation in sentence one, primary rationale, concrete observation, and reiterate the decision.';
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

  // 1. Check if user pasted framework instructions
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
      focusAfter: beforeScore,
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
  if (lower2.includes('recommend') || lower2.includes('propose') || lower2.includes('point') || lower2.includes('journey') || lower2.includes('decision')) improvedCount++;
  if (lower2.includes('because') || lower2.includes('reason') || lower2.includes('turning point') || lower2.includes('learned') || lower2.includes('rationale')) improvedCount++;
  if (lower2.includes('trade-off') || lower2.includes('impact') || lower2.includes('metric') || lower2.includes('takeaway') || lower2.includes('result')) improvedCount++;

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
