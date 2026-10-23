export type AuthType = 'email' | 'phone' | 'guest';

export interface UserProfile {
  id: string;
  authType: AuthType;
  identifier: string;
  createdAt?: string;
  lastActiveAt?: string;
}

export type GoalType =
  | 'Articulation'
  | 'Storytelling'
  | 'Presentations'
  | 'Stakeholder communication'
  | 'Leadership communication'
  | 'Persuasion'
  | string;

// Layer A: Core Communication Skills (1-5 scale)
export interface Scores {
  clarity: number;
  structure: number;
  conciseness: number;
}

// Layer B: Goal-Specific Effectiveness (1-5 scale)
export interface GoalCriteriaResult {
  criterion: string;
  status: 'met' | 'partially_met' | 'missed';
  note: string;
}

export interface GoalEffectiveness {
  goal: string;
  score: number; // 1-5
  rationale: string;
  criteriaResults?: GoalCriteriaResult[];
}

// Scenario Alignment (1-5 scale)
export interface RequiredScenarioElement {
  element: string;
  addressed: boolean;
  evidence?: string;
}

export interface ScenarioAlignment {
  score: number; // 1-5
  rationale: string;
  requiredElements?: RequiredScenarioElement[];
}

export interface Highlight {
  quote: string;
  issue: string;
  suggestion: string;
}

export interface Technique {
  name: string;
  steps: string[];
  example: string;
}

export interface PracticePlan {
  minutes: number;
  frequency: number;
}

// Evidence-Based 4-Part Coaching Structure
export interface EvidenceCoaching {
  whatWorked: {
    summary: string;
    quote: string;
    impact: string;
  };
  whatNeedsWork: {
    summary: string;
    quote: string;
    audienceImpact: string;
    missingElements?: string[];
  };
  primaryImprovementArea: string;
  technique: Technique;
  nextChallenge: {
    title: string;
    exercise: string;
    sentenceStarter: string;
  };
}

export interface MentorAssessRequest {
  mode: 'assess';
  goal: GoalType;
  audience: string;
  scenario: string;
  transcript: string;
  scenarioMode?: 'vira' | 'mine';
}

export interface MentorAssessResponse {
  scores: Scores; // Layer A
  goalEffectiveness: GoalEffectiveness; // Layer B
  scenarioAlignment: ScenarioAlignment; // Prompt requirement fulfillment
  strongest: 'clarity' | 'structure' | 'conciseness';
  focus: 'clarity' | 'structure' | 'conciseness';
  focusExplanation: string;
  highlights: Highlight[];
  technique: Technique;
  exercise: string;
  evidenceCoaching: EvidenceCoaching;
}

export interface DimensionComparison {
  dimension: 'clarity' | 'structure' | 'conciseness' | 'goalEffectiveness' | 'scenarioAlignment' | string;
  originalScore: number;
  revisedScore: number;
  change: number;
  classification: 'improved' | 'similar' | 'declined';
  explanation: string;
  baselineQuote?: string;
  retryQuote?: string;
}

export interface MentorCompareRequest {
  mode: 'compare';
  goal: GoalType;
  audience: string;
  scenario: string;
  firstTranscript: string;
  secondTranscript: string;
  focus: 'clarity' | 'structure' | 'conciseness' | string;
  firstScores: Scores;
  assessment?: MentorAssessResponse;
  firstGoalEffectiveness?: GoalEffectiveness;
  firstScenarioAlignment?: ScenarioAlignment;
}

export interface MentorCompareResponse {
  secondScores: Scores;
  firstScores?: Scores;
  firstGoalEffectiveness?: GoalEffectiveness;
  secondGoalEffectiveness?: GoalEffectiveness;
  firstScenarioAlignment?: ScenarioAlignment;
  secondScenarioAlignment?: ScenarioAlignment;
  dimensions?: {
    clarity: DimensionComparison;
    structure: DimensionComparison;
    conciseness: DimensionComparison;
    goalEffectiveness?: DimensionComparison;
    scenarioAlignment?: DimensionComparison;
  };
  focusBefore: number;
  focusAfter: number;
  focusChange?: number;
  verdict: 'improved' | 'similar' | 'declined' | 'less clear';
  meaningPreserved: boolean;
  meaningNote: string;
  tradeOffAnalysis?: string; // Explicitly recognizes trade-offs (e.g. clarity improved, storytelling declined)
  whatImproved: string;
  stillNeedsWork: string;
  nextStep: string;
  savedSessionId?: string;
  userFeedback?: {
    rating: number;
    tags?: string[];
    comment?: string;
    submittedAt?: string;
  };
}

export interface PracticeSessionRecord {
  id: string;
  userId: string;
  goal: string;
  audience: string;
  scenarioMode: 'vira' | 'mine';
  scenarioText: string;
  baselineTranscript: string;
  baselineScores: Scores;
  focusSkill: string;
  focusExplanation: string;
  highlights: Highlight[];
  technique: Technique;
  practicePlan?: PracticePlan;
  retryTranscript?: string;
  retryScores?: Scores;
  comparison?: MentorCompareResponse;
  createdAt: string;
  updatedAt: string;
}
