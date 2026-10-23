export type AuthType = 'email' | 'phone' | 'guest';

export interface UserProfile {
  id: string;
  authType: AuthType;
  identifier: string;
  createdAt?: string;
  lastActiveAt?: string;
}

export type GoalType = 'Articulation' | 'Storytelling' | 'Presentations';

export interface Scores {
  clarity: number;
  structure: number;
  conciseness: number;
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

export interface MentorAssessRequest {
  mode: 'assess';
  goal: GoalType | string;
  audience: string;
  scenario: string;
  transcript: string;
  scenarioMode?: 'vira' | 'mine';
}

export interface MentorAssessResponse {
  scores: Scores;
  strongest: 'clarity' | 'structure' | 'conciseness';
  focus: 'clarity' | 'structure' | 'conciseness';
  focusExplanation: string;
  highlights: Highlight[];
  technique: Technique;
  exercise: string;
}

export interface MentorCompareRequest {
  mode: 'compare';
  goal: GoalType | string;
  audience: string;
  scenario: string;
  firstTranscript: string;
  secondTranscript: string;
  focus: 'clarity' | 'structure' | 'conciseness' | string;
  firstScores: Scores;
}

export interface MentorCompareResponse {
  secondScores: Scores;
  focusBefore: number;
  focusAfter: number;
  verdict: 'improved' | 'similar' | 'less clear';
  meaningPreserved: boolean;
  meaningNote: string;
  whatImproved: string;
  stillNeedsWork: string;
  nextStep: string;
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
