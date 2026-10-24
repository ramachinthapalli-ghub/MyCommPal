import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { UserProfile, PracticeSessionRecord, UserFeedbackRecord, Scores, Highlight, Technique, MentorCompareResponse } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  (supabaseServiceKey || supabaseAnonKey) && 
  !supabaseUrl.includes('your-project')
);

// Clean and normalize phone numbers and emails consistently
export function cleanIdentifier(identifier: string, type?: string): string {
  if (!identifier) return '';
  const trimmed = identifier.trim();
  if (type === 'phone' || /^[+\d\s\-()]+$/.test(trimmed)) {
    // Normalize phone numbers: remove spaces, dashes, parentheses, keep digits and '+'
    return trimmed.replace(/[^\d+]/g, '');
  }
  return trimmed.toLowerCase();
}

// Stateless HMAC challenge for serverless OTP verification
const OTP_SECRET = supabaseServiceKey || supabaseAnonKey || 'mycommpal_serverless_secret_salt_2026';

export function createOtpChallenge(identifier: string, code: string, validitySeconds = 300): string {
  const expiresAt = Date.now() + validitySeconds * 1000;
  const data = `${identifier}:${code}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', OTP_SECRET).update(data).digest('hex');
  return `${identifier}#${expiresAt}#${hmac}`;
}

export function verifyOtpChallenge(identifier: string, code: string, challengeCookie?: string): boolean {
  if (!challengeCookie) return false;
  try {
    const [savedId, expStr, hmac] = challengeCookie.split('#');
    if (savedId !== identifier) return false;
    const expiresAt = Number(expStr);
    if (Date.now() > expiresAt) return false;
    const expectedHmac = crypto.createHmac('sha256', OTP_SECRET).update(`${identifier}:${code}:${expiresAt}`).digest('hex');
    return hmac === expectedHmac;
  } catch (e) {
    return false;
  }
}

// Server-side client with service role key if available, otherwise anon key
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured || !supabaseUrl) return null;
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!key) return null;
  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
}

// In-memory fallback database for local dev / demo when Supabase credentials are not yet set
interface MemoryStore {
  profiles: Map<string, UserProfile>;
  otps: Map<string, { code: string; expiresAt: number; used: boolean }>;
  sessions: Map<string, PracticeSessionRecord>;
  feedbacks: Map<string, UserFeedbackRecord>;
}

const globalForMemory = globalThis as unknown as { __memoryStore?: MemoryStore };
const memoryStore: MemoryStore = globalForMemory.__memoryStore || {
  profiles: new Map(),
  otps: new Map(),
  sessions: new Map(),
  feedbacks: new Map(),
};
if (process.env.NODE_ENV !== 'production') globalForMemory.__memoryStore = memoryStore;

// DB Helper methods for Profiles
export async function getOrCreateProfile(authType: 'email' | 'phone' | 'guest', identifier: string): Promise<UserProfile> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      // Find existing
      const { data: existing, error: findErr } = await client
        .from('profiles')
        .select('*')
        .eq('identifier', identifier)
        .maybeSingle();

      if (findErr) console.warn('Supabase find profile error:', findErr.message);

      if (existing) {
        // Update last active
        await client
          .from('profiles')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', existing.id);

        return {
          id: existing.id,
          authType: existing.auth_type,
          identifier: existing.identifier,
          createdAt: existing.created_at,
          lastActiveAt: existing.last_active_at,
        };
      }

      // Create new
      const { data: created, error: createErr } = await client
        .from('profiles')
        .insert({
          auth_type: authType,
          identifier,
          created_at: new Date().toISOString(),
          last_active_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createErr) throw createErr;

      return {
        id: created.id,
        authType: created.auth_type,
        identifier: created.identifier,
        createdAt: created.created_at,
        lastActiveAt: created.last_active_at,
      };
    } catch (e) {
      console.warn('Falling back to local storage profile due to Supabase error:', e);
    }
  }

  // Fallback in-memory
  let found = Array.from(memoryStore.profiles.values()).find(p => p.identifier === identifier);
  if (!found) {
    const id = `user_${Math.random().toString(36).substring(2, 10)}`;
    found = {
      id,
      authType,
      identifier,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    memoryStore.profiles.set(id, found);
  } else {
    found.lastActiveAt = new Date().toISOString();
  }
  return found;
}

// DB Helper methods for OTPs
export async function saveOtp(identifier: string, code: string, validitySeconds = 300): Promise<void> {
  const expiresAt = new Date(Date.now() + validitySeconds * 1000);
  const client = getSupabaseServerClient();

  if (client) {
    try {
      const { error } = await client.from('auth_otps').insert({
        identifier,
        code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });
      if (error) throw error;
      return;
    } catch (e: any) {
      console.warn('Falling back to memory store for OTP:', e?.message || e);
    }
  }

  memoryStore.otps.set(identifier, {
    code,
    expiresAt: expiresAt.getTime(),
    used: false,
  });
}

export async function verifyOtp(identifier: string, inputCode: string, challengeCookie?: string): Promise<boolean> {
  // 1. Universal demo/test codes: accept 123456 or 000000
  if (inputCode === '123456' || inputCode === '000000') return true;

  // 2. Stateless HMAC challenge cookie check (100% resilient across serverless lambdas)
  if (challengeCookie && verifyOtpChallenge(identifier, inputCode, challengeCookie)) {
    return true;
  }

  // 3. Database check in Supabase
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('auth_otps')
        .select('*')
        .eq('identifier', identifier)
        .eq('code', inputCode)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) console.warn('Supabase OTP check error:', error.message);

      if (data) {
        await client.from('auth_otps').update({ used: true }).eq('id', data.id);
        return true;
      }
    } catch (e) {
      console.warn('Falling back to memory store for OTP verification:', e);
    }
  }

  // 4. Memory fallback
  const rec = memoryStore.otps.get(identifier);
  if (rec && !rec.used && rec.code === inputCode && Date.now() < rec.expiresAt) {
    rec.used = true;
    return true;
  }
  return false;
}

// DB Helper methods for Practice Sessions
export async function savePracticeSession(data: {
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
  practicePlan?: { minutes: number; frequency: number };
  retryTranscript?: string;
  retryScores?: Scores;
  comparison?: MentorCompareResponse;
}): Promise<PracticeSessionRecord> {
  const client = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (client) {
    try {
      const { data: inserted, error } = await client
        .from('practice_sessions')
        .insert({
          user_id: data.userId,
          goal: data.goal,
          audience: data.audience,
          scenario_mode: data.scenarioMode,
          scenario_text: data.scenarioText,
          baseline_transcript: data.baselineTranscript,
          baseline_scores: data.baselineScores,
          focus_skill: data.focusSkill,
          focus_explanation: data.focusExplanation,
          highlights: data.highlights,
          technique: data.technique,
          practice_plan: data.practicePlan,
          retry_transcript: data.retryTranscript,
          retry_scores: data.retryScores,
          comparison: data.comparison,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: inserted.id,
        userId: inserted.user_id,
        goal: inserted.goal,
        audience: inserted.audience,
        scenarioMode: inserted.scenario_mode,
        scenarioText: inserted.scenario_text,
        baselineTranscript: inserted.baseline_transcript,
        baselineScores: inserted.baseline_scores,
        focusSkill: inserted.focus_skill,
        focusExplanation: inserted.focus_explanation,
        highlights: inserted.highlights,
        technique: inserted.technique,
        practicePlan: inserted.practice_plan,
        retryTranscript: inserted.retry_transcript,
        retryScores: inserted.retry_scores,
        comparison: inserted.comparison,
        createdAt: inserted.created_at,
        updatedAt: inserted.updated_at,
      };
    } catch (e) {
      console.warn('Falling back to local session store:', e);
    }
  }

  // Fallback in-memory
  const id = `sess_${Math.random().toString(36).substring(2, 10)}`;
  const record: PracticeSessionRecord = {
    id,
    userId: data.userId,
    goal: data.goal,
    audience: data.audience,
    scenarioMode: data.scenarioMode,
    scenarioText: data.scenarioText,
    baselineTranscript: data.baselineTranscript,
    baselineScores: data.baselineScores,
    focusSkill: data.focusSkill,
    focusExplanation: data.focusExplanation,
    highlights: data.highlights,
    technique: data.technique,
    practicePlan: data.practicePlan,
    retryTranscript: data.retryTranscript,
    retryScores: data.retryScores,
    comparison: data.comparison,
    createdAt: now,
    updatedAt: now,
  };
  memoryStore.sessions.set(id, record);
  return record;
}

export async function getUserSessions(userId: string): Promise<PracticeSessionRecord[]> {
  const client = getSupabaseServerClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('practice_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        return data.map(item => ({
          id: item.id,
          userId: item.user_id,
          goal: item.goal,
          audience: item.audience,
          scenarioMode: item.scenario_mode,
          scenarioText: item.scenario_text,
          baselineTranscript: item.baseline_transcript,
          baselineScores: item.baseline_scores,
          focusSkill: item.focus_skill,
          focusExplanation: item.focus_explanation,
          highlights: item.highlights || [],
          technique: item.technique,
          practicePlan: item.practice_plan,
          retryTranscript: item.retry_transcript,
          retryScores: item.retry_scores,
          comparison: item.comparison,
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        }));
      }
    } catch (e) {
      console.warn('Falling back to memory for user sessions:', e);
    }
  }

  return Array.from(memoryStore.sessions.values())
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function updateSessionFeedback(sessionId: string, feedback: {
  rating: number;
  tags?: string[];
  comment?: string;
}): Promise<boolean> {
  const client = getSupabaseServerClient();
  const feedbackRecord = {
    ...feedback,
    submittedAt: new Date().toISOString(),
  };

  if (client) {
    try {
      const { data: existing } = await client
        .from('practice_sessions')
        .select('comparison')
        .eq('id', sessionId)
        .maybeSingle();

      const updatedComparison = {
        ...(existing?.comparison || {}),
        userFeedback: feedbackRecord,
      };

      const { error } = await client
        .from('practice_sessions')
        .update({ comparison: updatedComparison, updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
      return true;
    } catch (e: any) {
      console.warn('Failed to update session feedback in Supabase:', e?.message || e);
    }
  }

  // Memory fallback
  const mem = memoryStore.sessions.get(sessionId);
  if (mem) {
    if (mem.comparison) {
      mem.comparison.userFeedback = feedbackRecord;
    }
    return true;
  }
  return false;
}

export async function saveFeedbackRecord(data: {
  userId: string;
  sessionId?: string | null;
  rating: number;
  tags?: string[];
  comment?: string;
  goal?: string;
  audience?: string;
  focus?: string;
}): Promise<UserFeedbackRecord> {
  const client = getSupabaseServerClient();
  const now = new Date().toISOString();
  const id = `fb_${Math.random().toString(36).substring(2, 11)}`;

  const record: UserFeedbackRecord = {
    id,
    userId: data.userId,
    sessionId: data.sessionId || null,
    rating: data.rating,
    tags: data.tags || [],
    comment: data.comment || '',
    goal: data.goal,
    audience: data.audience,
    focus: data.focus,
    createdAt: now,
  };

  // Attempt persisting directly to Supabase if client is available
  if (client) {
    try {
      const { data: inserted, error } = await client
        .from('user_feedback')
        .insert({
          user_id: data.userId && data.userId !== 'anonymous' ? data.userId : null,
          session_id: data.sessionId || null,
          rating: data.rating,
          tags: data.tags || [],
          comment: data.comment || '',
          goal: data.goal || null,
          audience: data.audience || null,
          focus: data.focus || null,
          created_at: now,
        })
        .select()
        .maybeSingle();

      if (!error && inserted) {
        record.id = inserted.id;
      }
    } catch (e: any) {
      // Table may not exist yet, fallback to storing inside practice_sessions and memoryStore
      console.warn('Could not insert into user_feedback table directly:', e?.message || e);
    }
  }

  // Store in memoryStore and log
  memoryStore.feedbacks.set(record.id, record);
  console.log('[User Feedback Saved]', {
    id: record.id,
    rating: record.rating,
    tags: record.tags,
    comment: record.comment,
    sessionId: record.sessionId,
    userId: record.userId,
    goal: record.goal,
    focus: record.focus,
    createdAt: now,
  });

  return record;
}
