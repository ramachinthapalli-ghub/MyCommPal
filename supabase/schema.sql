-- ============================================================
-- MyCommPal Database Schema (PostgreSQL for Supabase)
-- ============================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Email, Mobile, or Guest users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_type TEXT NOT NULL CHECK (auth_type IN ('email', 'phone', 'guest')),
    identifier TEXT NOT NULL, -- email, phone number, or guest ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index on identifier for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_identifier ON public.profiles(identifier);

-- 2. Auth OTPs Table (Simple Email or Mobile OTP login)
CREATE TABLE IF NOT EXISTS public.auth_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_otps_lookup ON public.auth_otps(identifier, code, used);

-- 3. Practice Sessions Table (Persisting user practice attempts)
CREATE TABLE IF NOT EXISTS public.practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal TEXT NOT NULL, -- e.g. Articulation, Storytelling, Presentations
    audience TEXT NOT NULL, -- e.g. Leadership and executives
    scenario_mode TEXT NOT NULL DEFAULT 'vira', -- 'vira' or 'mine'
    scenario_text TEXT NOT NULL,
    
    -- Baseline response & feedback
    baseline_transcript TEXT NOT NULL,
    baseline_scores JSONB NOT NULL, -- { clarity: 3, structure: 2, conciseness: 4 }
    focus_skill TEXT NOT NULL, -- clarity | structure | conciseness
    focus_explanation TEXT,
    highlights JSONB DEFAULT '[]'::jsonb, -- [{ quote, issue, suggestion }]
    technique JSONB, -- { name, steps, example }
    practice_plan JSONB, -- { minutes: 5, frequency: 3 }
    
    -- Retry attempt & comparison
    retry_transcript TEXT,
    retry_scores JSONB,
    comparison JSONB, -- { verdict, meaningPreserved, meaningNote, whatImproved, stillNeedsWork, nextStep }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON public.practice_sessions(user_id, created_at DESC);

-- 4. User Feedback Table (Storing user feedback on Vira guidance)
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    tags TEXT[] DEFAULT '{}',
    comment TEXT,
    goal TEXT,
    audience TEXT,
    focus TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON public.user_feedback(rating, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public read/write through server-side / anon role with appropriate access
CREATE POLICY "Allow public profile operations" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public auth_otps operations" ON public.auth_otps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public practice_sessions operations" ON public.practice_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public user_feedback operations" ON public.user_feedback FOR ALL USING (true) WITH CHECK (true);
