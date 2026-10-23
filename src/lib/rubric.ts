/**
 * Behavioral Anchors and Multi-Layer Evaluation Rubric for Vira (MyCommPal)
 * 
 * Layer A: Core Communication Skills (Clarity, Structure, Conciseness)
 * Layer B: Goal-Specific Effectiveness (Storytelling, Articulation, Stakeholder, Leadership, Presentation, Persuasion)
 * Scenario Alignment: Explicit Prompt Requirements Fulfillment
 */

export interface RubricLevel {
  score: number;
  label: string;
  anchor: string;
}

export interface DimensionRubric {
  name: string;
  description: string;
  levels: Record<1 | 2 | 3 | 4 | 5, string>;
}

// =========================================================================
// LAYER A: CORE COMMUNICATION SKILLS (1-5 Rubric)
// =========================================================================

export const CORE_SKILL_RUBRICS: Record<'clarity' | 'structure' | 'conciseness', DimensionRubric> = {
  clarity: {
    name: 'Clarity',
    description: 'Can the audience understand the main message, core recommendation, and intended takeaway?',
    levels: {
      1: 'Unclear / Incomprehensible / Echo: The main point is impossible to identify, rambles incoherently, or merely copies the prompt question without answering.',
      2: 'Buried / Vague: The listener must piece together the point. Heavy use of passive language, non-committal hedging ("we might consider looking into..."), or jargon obscures intent.',
      3: 'Adequate: The core message is understandable upon reflection, but lacks executive punch. Key takeaway is somewhat softened by surrounding details.',
      4: 'Clear & Direct: The main point or recommendation is unambiguous and established early. Audience immediately grasps the intended direction.',
      5: 'Exceptional Clarity: Crystal-clear headline delivery. The listener understands the decision, stakes, and outcome effortlessly in the opening moments.',
    },
  },
  structure: {
    name: 'Structure',
    description: 'Are ideas logically ordered with clear progression, transitions, and supporting reasoning?',
    levels: {
      1: 'Disorganized: Unconnected thoughts jump erratically without transitions, sequencing, or logical foundation.',
      2: 'Clunky / Fractured: Jumps between context and conclusion without a connecting bridge. Missing supporting reasoning for claims.',
      3: 'Conventional: Basic beginning-middle-end, but follows an uncalibrated sequence (e.g. detailed backstory before stating the recommendation).',
      4: 'Disciplined Framework: Employs a recognized communication pattern (e.g. PREP, BLUF, Hook-Journey-Reflection, 3Ps). Progression is logical and natural.',
      5: 'Airtight Architecture: Seamless narrative or decision architecture. Every sentence purposefully builds upon the previous one with flawless transitions.',
    },
  },
  conciseness: {
    name: 'Conciseness',
    description: 'Is the response focused, eliminating unnecessary repetition or filler without omitting essential information?',
    levels: {
      1: 'Excessive Fluff / Rambling: Severe repetition, frequent filler words ("um", "like", "you know"), or wandering tangents that obscure the message.',
      2: 'Verbose or Too Sparse: Either includes lengthy irrelevant background context, or is so artificially short that critical reasoning is lost.',
      3: 'Acceptable Brevity: Communicates within reasonable time/length, but retains minor conversational padding or repeated points.',
      4: 'Tight & Focused: High signal-to-noise ratio. Delivers essential facts and rationale without airtime waste or verbal clutter.',
      5: 'Maximum Signal per Syllable: Surgical economy of language. Every single sentence earns its place; not a word wasted, yet completely thorough.',
    },
  },
};

// =========================================================================
// LAYER B: GOAL-SPECIFIC EFFECTIVENESS (1-5 Rubric)
// =========================================================================

export interface GoalCriteriaDefinition {
  goal: string;
  coreCriteria: string[];
  levels: Record<1 | 2 | 3 | 4 | 5, string>;
}

export const GOAL_SPECIFIC_RUBRICS: Record<string, GoalCriteriaDefinition> = {
  Storytelling: {
    goal: 'Storytelling',
    coreCriteria: [
      'Engaging opening hook (establishes the human struggle or misconception)',
      'Relatable personal or team context (what was at stake)',
      'Pivotal turning-point realization or hurdle (the transformation)',
      'Clear, actionable takeaway / philosophy for the audience',
    ],
    levels: {
      1: 'No narrative: Reads like a dry list of tasks or disconnected slogans without a story arc.',
      2: 'Fragmented narrative: Has an anecdote or analogy, but missing the turning point or personal takeaway.',
      3: 'Basic narrative: Follows chronological events, but emotional stakes or turning point are muted.',
      4: 'Compelling story: Clear hook, vivid turning-point realization, and an authentic takeaway for the audience.',
      5: 'Masterful narrative: Gripping hook, relatable vulnerability in the struggle, transformative realization, and an inspiring mental model.',
    },
  },
  Articulation: {
    goal: 'Articulation',
    coreCriteria: [
      'Direct, unequivocal answer or recommendation upfront',
      'Data-backed or customer-backed reasoning',
      'Precise, authoritative product language',
      'Explicit acknowledgement of trade-offs and risks',
    ],
    levels: {
      1: 'Evading / Ambiguous: Avoids taking a stance, speaks in vague generalities, or fails to answer the question.',
      2: 'Tentative: States a preference but lacks firm reasoning or ducks the trade-off.',
      3: 'Adequate: Recommendation is present with basic justification, but trade-off is unstated or soft.',
      4: 'Crisp & Defensible: Decisive recommendation, explicit rationale, and transparently acknowledges the trade-off.',
      5: 'Executive Articulation: Masterful trade-off defense. Balances customer value, business metrics, and constraints with complete poise.',
    },
  },
  Presentations: {
    goal: 'Presentations',
    coreCriteria: [
      'Executive opening (Purpose of the meeting / talk)',
      'Core friction or customer opportunity (Why now)',
      'High-level strategic narrative (Logical flow)',
      'Decisive closing payoff or call-to-action (What alignment is needed)',
    ],
    levels: {
      1: 'Disoriented: Lacks purpose, jumps straight into weeds or slides without setting context.',
      2: 'Slow setup: Spends excessive time on agenda and background before addressing the core problem.',
      3: 'Standard presentation: Clear purpose and problem, but transitions are abrupt and call-to-action is vague.',
      4: 'High-Impact Opening: Purpose, problem, and expected outcome clearly framed in the first 60 seconds.',
      5: 'C-Suite Command: Gripping hook, urgent problem framing, airtight narrative flow, and crystal-clear alignment ask.',
    },
  },
  'Stakeholder communication': {
    goal: 'Stakeholder communication',
    coreCriteria: [
      'Directly answers the stakeholder’s specific concern or question',
      'Demonstrates empathy for stakeholder constraints (e.g. sales targets, engineering sprint commitments)',
      'Explains the strategic "why now" transparently',
      'Offers a collaborative alternative or clear milestone commitment',
    ],
    levels: {
      1: 'Dismissive or defensive: Ignores the stakeholder’s concern or dictates without context.',
      2: 'Vague brush-off: Gives an generic "it’s not on the roadmap" without explaining rationale or impact.',
      3: 'Reasonable explanation: Explains why the feature is delayed or deprioritized, but lacks alternative or alignment.',
      4: 'Empathetic & Firm: Acknowledges stakeholder stakes, provides compelling customer/business reasoning, and proposes next steps.',
      5: 'Masterful Alignment: Transforms a potential conflict into shared ownership of business trade-offs.',
    },
  },
  'Leadership communication': {
    goal: 'Leadership communication',
    coreCriteria: [
      'Bottom-line recommendation delivered in the opening sentence (BLUF)',
      'Business impact and customer metrics highlighted',
      'Clear risk analysis and resource trade-offs',
      'Appropriate level of zoom (strategic altitude, not tactical weeds)',
    ],
    levels: {
      1: 'Tactical weeds: Drowns executives in implementation minutiae, sprint tickets, or internal drama.',
      2: 'Unprepared: Lacks concrete metrics or business impact; stumbles when defending the recommendation.',
      3: 'Adequate briefing: Reaches the main point after some preamble; metrics are present but not prioritized.',
      4: 'Executive-Ready: Leads with the decision, grounds in business metrics, and frames the trade-off clearly.',
      5: 'Boardroom-Calibrated: Concise, decisive, ROI-focused, answers the unasked executive question proactively.',
    },
  },
  Persuasion: {
    goal: 'Persuasion',
    coreCriteria: [
      'Firm, unambiguous thesis',
      'Convincing evidence (data, user quotes, market signals)',
      'Proactively addresses the primary counter-argument or objection',
      'Compelling call to action',
    ],
    levels: {
      1: 'Unconvincing: Makes unsupported assertions without evidence or logic.',
      2: 'One-sided: Presents arguments but completely ignores obvious counter-arguments and risks.',
      3: 'Plausible: Good evidence presented, but fails to anticipate skepticism from critical stakeholders.',
      4: 'Persuasive: Strong narrative, backed by concrete evidence, and directly disarms the main objection.',
      5: 'Irresistible: Unites emotional hook and airtight evidence, neutralizes objections, and makes the proposed path obvious.',
    },
  },
};

// =========================================================================
// SCENARIO ALIGNMENT (1-5 Rubric)
// =========================================================================

export const SCENARIO_ALIGNMENT_RUBRIC: DimensionRubric = {
  name: 'Scenario Alignment',
  description: 'Does the response address the specific prompt requirements, context, and essential elements?',
  levels: {
    1: 'Off-topic or Echo: Completely ignores the scenario, talks about an unrelated topic, or merely copies the question.',
    2: 'Superficial: Mentions general buzzwords but avoids answering the specific dilemma or required questions.',
    3: 'Partial: Addresses the primary theme, but omits 1 or 2 explicit prompt requirements (e.g., gave a decision, but omitted the trade-off).',
    4: 'Substantially Complete: Addresses all explicit scenario requirements with relevant PM substance.',
    5: 'Flawlessly Aligned: Directly and comprehensively fulfills every requirement of the prompt with authentic depth and realism.',
  },
};

export function getGoalRubric(goal: string): GoalCriteriaDefinition {
  const normalized = Object.keys(GOAL_SPECIFIC_RUBRICS).find(
    g => g.toLowerCase() === goal.toLowerCase()
  );
  if (normalized && GOAL_SPECIFIC_RUBRICS[normalized]) {
    return GOAL_SPECIFIC_RUBRICS[normalized];
  }
  // Default to Articulation if unknown
  return GOAL_SPECIFIC_RUBRICS['Articulation'];
}

export function getShortScoreExplanation(dimension: string, score: number, goal?: string): string {
  const clamped = Math.min(5, Math.max(1, Math.round(score))) as 1 | 2 | 3 | 4 | 5;
  const d = dimension.toLowerCase();

  if (d === 'clarity') {
    switch (clamped) {
      case 1: return 'Main message is unclear or echoes the prompt without taking a stance.';
      case 2: return 'Point is buried under hesitation, passive phrasing, or preamble.';
      case 3: return 'Main point is understandable, but lacks immediate executive punch.';
      case 4: return 'Clear, direct recommendation established early with strong focus.';
      case 5: return 'Crystal-clear headline delivery with zero ambiguity or hesitation.';
    }
  }

  if (d === 'structure') {
    switch (clamped) {
      case 1: return 'Thoughts are disconnected without transitions or logical sequence.';
      case 2: return 'Ideas jump between context and conclusion without connecting rationale.';
      case 3: return 'Basic sequential order, but transitions between points could be tighter.';
      case 4: return 'Follows a disciplined, recognizable communication framework.';
      case 5: return 'Airtight narrative architecture with seamless logical progression.';
    }
  }

  if (d === 'conciseness') {
    switch (clamped) {
      case 1: return 'Heavy verbal filler, repetition, or wandering tangents.';
      case 2: return 'Either verbose with excessive preamble, or too sparse to convey key points.';
      case 3: return 'Reasonable brevity, but retains minor conversational padding.';
      case 4: return 'Tight, focused delivery with a high signal-to-noise ratio.';
      case 5: return 'Surgical economy of language; every sentence adds distinct value.';
    }
  }

  if (d.includes('align') || d === 'scenarioalignment') {
    switch (clamped) {
      case 1: return 'Did not address the prompt; spoke off-topic or merely echoed the question.';
      case 2: return 'Mentions general buzzwords without answering the specific scenario requirements.';
      case 3: return 'Partially addressed scenario, but omitted 1 or 2 explicit prompt elements.';
      case 4: return 'Substantially complete; directly answered all required scenario elements.';
      case 5: return 'Flawlessly aligned; comprehensively fulfilled every prompt requirement.';
    }
  }

  // Goal-specific dimensions
  const goalRubric = goal ? getGoalRubric(goal) : getGoalRubric(dimension);
  if (goalRubric && goalRubric.levels[clamped]) {
    // Return first sentence of level anchor
    const full = goalRubric.levels[clamped];
    const firstSentence = full.split(/[:.]/)[1]?.trim() || full;
    return firstSentence.length > 10 ? firstSentence : full;
  }

  return `Evaluated as Level ${clamped} based on standard communication anchors.`;
}


export function formatRubricsForSystemPrompt(): string {
  let promptText = `### LAYER A: CORE COMMUNICATION SKILLS (1-5 SCALE)\n`;
  for (const [key, dim] of Object.entries(CORE_SKILL_RUBRICS)) {
    promptText += `\n**${dim.name}**: ${dim.description}\n`;
    for (const [lvl, text] of Object.entries(dim.levels)) {
      promptText += `  - Level ${lvl}: ${text}\n`;
    }
  }

  promptText += `\n### LAYER B: GOAL-SPECIFIC EFFECTIVENESS (1-5 SCALE)\n`;
  for (const [goal, def] of Object.entries(GOAL_SPECIFIC_RUBRICS)) {
    promptText += `\n**Goal: ${goal}**\nCriteria: ${def.coreCriteria.join('; ')}\n`;
    for (const [lvl, text] of Object.entries(def.levels)) {
      promptText += `  - Level ${lvl}: ${text}\n`;
    }
  }

  promptText += `\n### SCENARIO ALIGNMENT (1-5 SCALE)\n`;
  promptText += `${SCENARIO_ALIGNMENT_RUBRIC.description}\n`;
  for (const [lvl, text] of Object.entries(SCENARIO_ALIGNMENT_RUBRIC.levels)) {
    promptText += `  - Level ${lvl}: ${text}\n`;
  }

  return promptText;
}

