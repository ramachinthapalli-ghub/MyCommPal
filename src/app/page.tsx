'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UserProfile,
  GoalType,
  Scores,
  Highlight,
  Technique,
  PracticePlan,
  MentorAssessResponse,
  MentorCompareResponse,
  PracticeSessionRecord,
} from '@/lib/types';

const SCENARIOS: Record<GoalType, string[]> = {
  Articulation: [
    "You're a Product Manager. Your VP asks: ‘Our team can build either an onboarding improvement or a reporting feature this quarter. Which would you prioritize, and why?’ Explain your thinking in about 60 seconds.",
    "In a sprint review, the Head of Sales asks why their top-requested enterprise feature is delayed to fix internal customer onboarding friction. Explain your recommendation, customer impact, and trade-offs.",
    "Your tech lead insists on spending 4 weeks addressing legacy technical debt, while business stakeholders want a new checkout capability. How do you articulate the priority, risks, and compromise to leadership?",
    "A major enterprise client threatens to churn unless you commit to a custom one-off roadmap feature by end of week. Articulate your position, strategic reasoning, and trade-offs to your executive team.",
  ],
  Storytelling: [
    "Tell the story of your product management journey and your core product philosophy to aspiring PMs. What was your biggest misconception when starting out, what was your turning-point realization, and what should they remember?",
    "Tell the story of a product experiment that completely failed. What was your initial assumption, what did actual customer behavior reveal, and how did it change your team's direction?",
    "Share the story of an unexpected customer discovery insight that convinced a skeptical engineering and design team to rethink a core workflow.",
    "Tell the story of a high-stakes cross-functional disagreement where you had no direct authority, but successfully influenced the teams to rally around customer value.",
  ],
  Presentations: [
    "You have 60 seconds to open an executive review proposing a major overhaul to your product's core funnel. State the customer problem, why now, and the exact decision you need from leadership today.",
    "Introduce a high-risk, high-reward AI experiment to leadership. Explain the user problem, proposed MVP scope, resource ask, and what metrics determine whether to kill or scale it.",
    "Open a quarterly product roadmap kickoff to cross-functional leads (Sales, Marketing, Eng). Align the room on the two primary business outcomes your team is accountable for delivering this quarter.",
  ],
};

const STEP_TITLES = ['My goal', 'Assess me', 'My plan', 'Practice'];

export default function MyCommPalApp() {
  // User Authentication State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Login Landing Dropdown State
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [activeLoginMode, setActiveLoginMode] = useState<'phone' | 'email' | null>(null);

  const [authIdentifier, setAuthIdentifier] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpDevHint, setOtpDevHint] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Flow State
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<GoalType>('Articulation');
  const [audience, setAudience] = useState('Cross-functional stakeholders');
  const [scenarioMode, setScenarioMode] = useState<'vira' | 'mine'>('vira');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [customSituation, setCustomSituation] = useState('');

  // Speech & Text input state
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [isRecording1, setIsRecording1] = useState(false);
  const [isRecording2, setIsRecording2] = useState(false);
  const [recTimer1, setRecTimer1] = useState('00:00');
  const [recTimer2, setRecTimer2] = useState('00:00');
  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  // Mentor Assessment state
  const [assessing, setAssessing] = useState(false);
  const [assessment, setAssessment] = useState<MentorAssessResponse | null>(null);

  // Practice Plan state
  const [planMinutes, setPlanMinutes] = useState(5);
  const [planFrequency, setPlanFrequency] = useState(3);

  // Comparison State
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<MentorCompareResponse | null>(null);

  // Quick User Feedback state
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  // History State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historySessions, setHistorySessions] = useState<PracticeSessionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Initial Auth Check
  useEffect(() => {
    checkCurrentUser();
  }, []);

  async function checkCurrentUser() {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (e) {
      console.error('Failed to check user:', e);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }

  // Auth Handlers
  async function loginAsGuest() {
    try {
      setAuthLoading(true);
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        setShowLoginDropdown(false);
        setActiveLoginMode(null);
      }
    } catch (e) {
      console.error('Guest login failed:', e);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (!authIdentifier.trim()) {
      setAuthError('Please enter your details.');
      return;
    }

    try {
      setOtpSending(true);
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: authIdentifier.trim(), type: activeLoginMode || 'phone' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');

      setOtpSent(true);
      if (data.devCode) {
        setOtpDevHint(`Test code: ${data.devCode}`);
        setOtpCode(data.devCode); // Auto-fill for convenience
      }
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setOtpSending(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    if (!otpCode.trim()) {
      setAuthError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setOtpVerifying(true);
      const res = await fetch('/api/auth/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: authIdentifier.trim(), code: otpCode.trim(), type: activeLoginMode || 'phone' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP code');

      setUser(data.user);
      setShowLoginDropdown(false);
      setActiveLoginMode(null);
      setOtpSent(false);
      setOtpDevHint(null);
      setAuthIdentifier('');
      setOtpCode('');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setOtpVerifying(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setUser(null);
    setShowLoginDropdown(false);
    setActiveLoginMode(null);
    setStep(0);
    setAnswer1('');
    setAnswer2('');
    setAssessment(null);
    setComparison(null);
  }

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setShowHistoryModal(true);
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setHistorySessions(data.sessions || []);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Computed Current Scenario
  const currentScenarioText =
    scenarioMode === 'mine'
      ? customSituation.trim()
        ? `Your real situation: ${customSituation.trim()}\n\nVira: Explain what you would say to your audience. Start with your main point, then your reasoning and desired outcome.`
        : 'Describe your upcoming situation above to practice with your own challenge.'
      : SCENARIOS[goal][scenarioIndex % SCENARIOS[goal].length];

  // Speech Recognition
  function toggleSpeech(inputIndex: 1 | 2) {
    const isRecording = inputIndex === 1 ? isRecording1 : isRecording2;

    if (isRecording) {
      stopSpeech();
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech transcription is not supported in this browser. Please type your response directly.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;

      const baseText = inputIndex === 1 ? answer1 : answer2;
      let finalized = '';
      const startTime = Date.now();

      if (inputIndex === 1) setIsRecording1(true);
      else setIsRecording2(true);

      timerIntervalRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startTime) / 1000);
        const formatted = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
        if (inputIndex === 1) setRecTimer1(formatted);
        else setRecTimer2(formatted);
      }, 250);

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalized += t + ' ';
          else interim += t;
        }
        const updated = [baseText, finalized, interim].filter(Boolean).join(' ').trim();
        if (inputIndex === 1) setAnswer1(updated);
        else setAnswer2(updated);
      };

      recognition.onerror = (e: any) => {
        console.warn('Speech error:', e.error);
        stopSpeech();
      };

      recognition.onend = () => {
        stopSpeech();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error('Speech recognition failed to start:', e);
      stopSpeech();
      alert('Could not access microphone. Please type your answer instead.');
    }
  }

  function stopSpeech() {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording1(false);
    setIsRecording2(false);
  }

  // Assessment Step Handlers
  async function handleAssess() {
    stopSpeech();
    if (scenarioMode === 'mine' && customSituation.trim().length < 15) {
      alert('Please describe your upcoming situation in a little more detail (at least 15 characters).');
      return;
    }

    if (answer1.trim().length < 35) {
      alert('Please share a little more of your thinking (at least 35 characters) so Vira can give calibrated feedback.');
      return;
    }

    try {
      setAssessing(true);
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'assess',
          goal,
          audience,
          scenario: currentScenarioText,
          transcript: answer1.trim(),
          scenarioMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to evaluate response');

      setAssessment(data);
      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      alert(e.message || 'Something went wrong. Please retry.');
    } finally {
      setAssessing(false);
    }
  }

  // Comparison Step Handlers
  async function handleCompare() {
    stopSpeech();
    if (answer2.trim().length < 35) {
      alert('Please complete your retry attempt (at least 35 characters) before comparing.');
      return;
    }

    if (!assessment) return;

    try {
      setComparing(true);
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compare',
          goal,
          audience,
          scenario: currentScenarioText,
          firstTranscript: answer1.trim(),
          secondTranscript: answer2.trim(),
          focus: assessment.focus,
          firstScores: assessment.scores,
          practicePlan: { minutes: planMinutes, frequency: planFrequency },
          assessment,
          scenarioMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to compare responses');

      setComparison(data);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e: any) {
      alert(e.message || 'Comparison failed. Please retry.');
    } finally {
      setComparing(false);
    }
  }

  async function handleSubmitFeedback() {
    if (!feedbackRating) return;
    try {
      setFeedbackSubmitting(true);
      await fetch('/api/sessions/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: comparison?.savedSessionId,
          rating: feedbackRating,
          tags: feedbackTags,
          comment: feedbackComment.trim(),
        }),
      });
      setFeedbackSubmitted(true);
    } catch (e) {
      console.error('Failed to submit feedback:', e);
      setFeedbackSubmitted(true);
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  function handleCopySummary() {
    const feedbackLine = feedbackRating
      ? `\n\nUser Feedback on Guidance: ${feedbackRating}/5 ${feedbackTags.length ? '· ' + feedbackTags.join(', ') : ''} ${feedbackComment ? '· "' + feedbackComment + '"' : ''}`
      : '';

    const summary = `MyCommPal Practice Session with Vira
Goal: ${goal}
Audience: ${audience}
Scenario: ${currentScenarioText}
Focus Skill: ${assessment?.focus || 'Structure'}
Initial Score: ${assessment?.scores[assessment.focus]} / 5
Retry Score: ${comparison?.focusAfter || 'N/A'} / 5
Verdict: ${comparison?.verdict || 'N/A'}

Baseline Attempt:
"${answer1}"

Retry Attempt:
"${answer2}"

Key Improvement:
${comparison?.whatImproved || 'Applied calibrated structure technique.'}${feedbackLine}`;

    navigator.clipboard?.writeText(summary)
      .then(() => alert('Practice session summary copied to clipboard!'))
      .catch(() => alert('Clipboard access unavailable.'));
  }

  function handleStartOver() {
    if (confirm('Start a fresh practice session? Your past completed sessions remain safely stored in your history.')) {
      setAnswer1('');
      setAnswer2('');
      setAssessment(null);
      setComparison(null);
      setFeedbackRating(null);
      setFeedbackTags([]);
      setFeedbackComment('');
      setFeedbackSubmitted(false);
      setStep(0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function handleNextScenario() {
    setScenarioIndex(prev => prev + 1);
    setAnswer1('');
    setAnswer2('');
    setAssessment(null);
    setComparison(null);
    setFeedbackRating(null);
    setFeedbackTags([]);
    setFeedbackComment('');
    setFeedbackSubmitted(false);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // =========================================================================
  // VIEW 1: INITIAL LOGIN SCREEN (Shown initially when user accesses the app)
  // =========================================================================
  if (!user && !authLoading) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="brand" style={{ justifyContent: 'center', marginBottom: '8px' }}>
            <span className="brand-logo">✨</span>
            <span className="wordmark">
              My<span>Comm</span>Pal
            </span>
          </div>
          <div className="tiny" style={{ marginBottom: '24px' }}>
            Your personal AI communication mentor
          </div>

          <div className="vira" style={{ textAlign: 'left', marginBottom: '24px' }}>
            <span className="avatar">👩‍💼</span>
            <div className="bubble">
              <b>Meet Vira</b>
              <p>Practice realistic PM conversations, receive calibrated feedback, and strengthen your articulation one session at a time.</p>
            </div>
          </div>

          {authError && (
            <div
              style={{
                background: '#ffeef2',
                border: '1px solid #ffccd7',
                color: '#cf1746',
                padding: '10px 14px',
                borderRadius: '12px',
                fontSize: '13px',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              {authError}
            </div>
          )}

          {/* If an active mode (mobile or email) is selected, show the input form */}
          {activeLoginMode ? (
            <div style={{ textAlign: 'left', marginTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 800 }}>
                  {activeLoginMode === 'phone' ? '📱 Mobile OTP Login' : '✉️ Email OTP Login'}
                </h3>
                <button
                  type="button"
                  className="reset"
                  onClick={() => {
                    setActiveLoginMode(null);
                    setOtpSent(false);
                    setAuthError(null);
                    setAuthIdentifier('');
                    setOtpCode('');
                  }}
                >
                  ← Other options
                </button>
              </div>

              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <label className="field" htmlFor="loginInput">
                    {activeLoginMode === 'phone' ? 'Mobile phone number' : 'Work or personal email'}
                  </label>
                  <input
                    id="loginInput"
                    className="input"
                    type={activeLoginMode === 'phone' ? 'tel' : 'email'}
                    placeholder={activeLoginMode === 'phone' ? 'e.g. 9989624123 or +1 555-0199' : 'e.g. alex@company.com'}
                    value={authIdentifier}
                    onChange={e => setAuthIdentifier(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="btn"
                    style={{ width: '100%', marginTop: '16px' }}
                    disabled={otpSending}
                  >
                    {otpSending ? 'Sending verification code...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <label className="field" htmlFor="otpInput">
                    Enter 6-digit verification code sent to {authIdentifier}
                  </label>
                  <input
                    id="otpInput"
                    className="input"
                    type="text"
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    required
                    autoFocus
                  />
                  <div className="tiny" style={{ color: '#6545e8', marginTop: '6px', fontWeight: 600 }}>
                    {otpDevHint ? `${otpDevHint} (Auto-filled)` : '💡 Quick test code: 123456'}
                  </div>
                  <button
                    type="submit"
                    className="btn"
                    style={{ width: '100%', marginTop: '16px' }}
                    disabled={otpVerifying}
                  >
                    {otpVerifying ? 'Verifying...' : 'Verify & Enter MyCommPal'}
                  </button>
                  <div style={{ textAlign: 'center', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="reset"
                      onClick={() => setOtpSent(false)}
                    >
                      ← Change {activeLoginMode === 'phone' ? 'phone number' : 'email'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Otherwise, show the Login Button with Dropdown */
            <div className="login-dropdown-wrapper">
              <button
                type="button"
                className="btn login-trigger-btn"
                onClick={() => setShowLoginDropdown(prev => !prev)}
              >
                <span>Login to MyCommPal</span>
                <span style={{ fontSize: '18px', transition: 'transform 0.2s', transform: showLoginDropdown ? 'rotate(180deg)' : 'none' }}>
                  ▾
                </span>
              </button>

              {showLoginDropdown && (
                <div className="login-dropdown-menu">
                  {/* Option 1: Mobile OTP */}
                  <button
                    type="button"
                    className="login-dropdown-item"
                    onClick={() => {
                      setActiveLoginMode('phone');
                      setShowLoginDropdown(false);
                      setAuthError(null);
                    }}
                  >
                    <span className="login-dropdown-icon">📱</span>
                    <div>
                      <strong>Mobile OTP</strong>
                      <span>Sign in with your mobile phone number</span>
                    </div>
                  </button>

                  {/* Option 2: Email OTP */}
                  <button
                    type="button"
                    className="login-dropdown-item"
                    onClick={() => {
                      setActiveLoginMode('email');
                      setShowLoginDropdown(false);
                      setAuthError(null);
                    }}
                  >
                    <span className="login-dropdown-icon">✉️</span>
                    <div>
                      <strong>Email OTP</strong>
                      <span>Sign in with your email address</span>
                    </div>
                  </button>

                  {/* Option 3: Continue as Guest */}
                  <button
                    type="button"
                    className="login-dropdown-item"
                    onClick={loginAsGuest}
                  >
                    <span className="login-dropdown-icon">👤</span>
                    <div>
                      <strong>Continue as Guest</strong>
                      <span>1-click immediate access, no codes needed</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="footer" style={{ justifyContent: 'center', marginTop: '30px' }}>
            <span>Data persists in Supabase. All sessions are secure.</span>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED APP (Full 4-Screen HTML Prototype Flow)
  // =========================================================================
  return (
    <div className="shell">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">✨</span>
          <span className="wordmark">
            My<span>Comm</span>Pal
          </span>
        </div>
        <div className="tiny">Your personal AI communication mentor</div>

        {/* Steps */}
        <div className="steps">
          {STEP_TITLES.map((title, i) => {
            const isActive = step === i;
            const isDone = step > i;
            return (
              <div
                key={title}
                className={`step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                onClick={() => {
                  if (i <= step) {
                    stopSpeech();
                    setStep(i);
                  }
                }}
              >
                <span>{isDone ? '✓' : i + 1}</span>
                {title}
              </div>
            );
          })}
        </div>

        {/* Bottom Profile Widget */}
        <div className="sidebar-bottom">
          <div className="side-profile">
            <span className="avatar">👩‍💼</span>
            <div>
              <b>Meet Vira</b>
              <div className="tiny">Your articulation mentor</div>
            </div>
          </div>
          “No perfect answers needed. We'll make your ideas clearer, together.”
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main">
        {/* Top Header Bar */}
        <div className="top">
          <span className="eyebrow">PRACTICE WITH VIRA · SPEAK WITH IMPACT</span>
          <div className="top-actions">
            {user && (
              <>
                <span className={`badge ${user.authType === 'guest' ? 'guest' : 'verified'}`}>
                  {user.authType === 'guest' ? '👤 Guest' : user.authType === 'phone' ? '📱' : '✉️'}{' '}
                  {user.identifier}
                </span>
                <button className="btn ghost" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={loadHistory}>
                  📜 History
                </button>
                <button className="btn ghost" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={handleLogout}>
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Panels */}
        <div className="panel">
          {/* SCREEN 01: YOUR GOAL */}
          {step === 0 && (
            <section>
              <span className="eyebrow">01 / YOUR GOAL</span>
              <h1>Grow your voice. Grow your impact.</h1>
              <p>
                Meet Vira, your personal AI communication mentor. Practice realistic product management conversations,
                get targeted feedback, and strengthen your articulation one session at a time.
              </p>

              <div className="vira">
                <span className="avatar">👩‍💼</span>
                <div className="bubble">
                  <b>Vira</b>
                  <p>Hi there! What communication skill would you like us to work on together today?</p>
                </div>
              </div>

              {/* Goal Cards */}
              <div className="cards">
                <button
                  type="button"
                  className={`option ${goal === 'Articulation' ? 'selected' : ''}`}
                  onClick={() => setGoal('Articulation')}
                >
                  <strong>💬</strong>
                  Articulate my ideas
                </button>
                <button
                  type="button"
                  className={`option ${goal === 'Storytelling' ? 'selected' : ''}`}
                  onClick={() => setGoal('Storytelling')}
                >
                  <strong>📖</strong>
                  Tell stronger stories
                </button>
                <button
                  type="button"
                  className={`option ${goal === 'Presentations' ? 'selected' : ''}`}
                  onClick={() => setGoal('Presentations')}
                >
                  <strong>🎤</strong>
                  Present with impact
                </button>
              </div>

              {/* Target Audience Dropdown */}
              <label className="field" htmlFor="audienceSelect">
                Who do you usually communicate with?
              </label>
              <select
                id="audienceSelect"
                value={audience}
                onChange={e => setAudience(e.target.value)}
              >
                <option value="Cross-functional stakeholders">Cross-functional stakeholders</option>
                <option value="Leadership and executives">Leadership and executives</option>
                <option value="Product peers and colleagues">Product peers and colleagues</option>
              </select>

              <div className="actions">
                <button className="btn" onClick={() => setStep(1)}>
                  Meet my challenge →
                </button>
              </div>
            </section>
          )}

          {/* SCREEN 02: ASSESS ME */}
          {step === 1 && (
            <section>
              <span className="eyebrow">02 / ASSESS ME</span>
              <h1>Let&apos;s hear your thinking.</h1>
              <p>Answer naturally. You don&apos;t need a polished speech—this is your baseline, not a test.</p>

              {/* Practice Mode Choice */}
              <div className="scenario-choice">
                <div className="scenario-choice-title">How would you like to practice?</div>
                <div className="scenario-options">
                  <button
                    type="button"
                    className={`scenario-option ${scenarioMode === 'vira' ? 'active' : ''}`}
                    onClick={() => setScenarioMode('vira')}
                  >
                    <strong>✨ Let Vira choose</strong>
                    <span>Practice Real PM Conversations</span>
                  </button>
                  <button
                    type="button"
                    className={`scenario-option ${scenarioMode === 'mine' ? 'active' : ''}`}
                    onClick={() => setScenarioMode('mine')}
                  >
                    <strong>✍️ Bring my situation</strong>
                    <span>Prepare for an actual conversation coming up</span>
                  </button>
                </div>

                {scenarioMode === 'mine' && (
                  <div style={{ marginTop: '12px' }}>
                    <label className="field" htmlFor="mySituation">
                      Describe your upcoming situation
                    </label>
                    <textarea
                      id="mySituation"
                      placeholder="Example: Tomorrow my VP will ask why we delayed a feature. I need to explain the customer impact and trade-offs."
                      rows={3}
                      value={customSituation}
                      onChange={e => setCustomSituation(e.target.value)}
                    />
                    <div className="small" style={{ marginTop: '6px' }}>
                      Share the audience, situation, and what you need to communicate. Avoid confidential details.
                    </div>
                  </div>
                )}
              </div>

              {/* Vira Scenario Card */}
              <div className="vira">
                <span className="avatar">👩‍💼</span>
                <div className="bubble">
                  <b>Vira</b>
                  <p style={{ whiteSpace: 'pre-line' }}>{currentScenarioText}</p>
                </div>
              </div>

              {/* Speech Input Box */}
              <div className="speech">
                <div className="tiny" style={{ textAlign: 'center', fontWeight: 700, color: '#6545e8' }}>
                  {isRecording1 ? 'Listening… speak your answer clearly' : 'Tap mic to speak, or type below'}
                </div>
                <div className="record">
                  <button
                    type="button"
                    className={`mic ${isRecording1 ? 'recording' : ''}`}
                    onClick={() => toggleSpeech(1)}
                    title="Tap to speak"
                  >
                    🎙️
                  </button>
                  {isRecording1 && <span className="counter">{recTimer1}</span>}
                </div>

                <label className="field" htmlFor="answer1">
                  Your baseline response
                </label>
                <textarea
                  id="answer1"
                  placeholder="Speak with the mic or type your answer here... (minimum 35 characters)"
                  value={answer1}
                  onChange={e => setAnswer1(e.target.value)}
                />
                <div className="small" style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{answer1.length} characters (min 35)</span>
                  {scenarioMode === 'vira' && (
                    <button
                      type="button"
                      className="reset"
                      onClick={() => setScenarioIndex(prev => prev + 1)}
                    >
                      🎲 Try another PM scenario
                    </button>
                  )}
                </div>
              </div>

              <div className="actions">
                <button
                  className="btn"
                  disabled={assessing || answer1.trim().length < 35}
                  onClick={handleAssess}
                >
                  {assessing ? (
                    <>
                      <span className="spinner" /> Evaluating response...
                    </>
                  ) : (
                    "Get Vira's feedback →"
                  )}
                </button>
                <button className="btn ghost" onClick={() => setStep(0)}>
                  ← Back to Goal
                </button>
              </div>
            </section>
          )}

          {/* SCREEN 03: YOUR PERSONAL PLAN */}
          {step === 2 && assessment && (
            <section>
              <span className="eyebrow">03 / YOUR PERSONAL PLAN</span>
              <h1>Here&apos;s how we&apos;ll grow.</h1>
              <p>
                I listened to your answer. Rather than trying to change all your speaking habits at once,
                we&apos;ll focus on one targeted communication technique.
              </p>

              {/* Mentor Feedback Bubble */}
              <div className="vira">
                <span className="avatar">👩‍💼</span>
                <div className="bubble">
                  <b>Vira</b>
                  <p>
                    I heard your answer! Your highest scoring area was{' '}
                    <strong>{assessment.strongest}</strong>. Our first practice focus is{' '}
                    <strong>{assessment.focus}</strong>.
                  </p>
                </div>
              </div>

              {/* Two-Layer Evaluation & Scenario Alignment */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', marginBottom: '8px' }}>
                <h2 style={{ margin: 0 }}>Layer A — Core Communication Skills</h2>
                <span className="tiny" style={{ background: '#eee8ff', padding: '4px 10px', borderRadius: '12px', color: '#5534c7', fontWeight: 700 }}>
                  1–5 Rubric
                </span>
              </div>
              <p className="tiny" style={{ marginBottom: '16px' }}>Universal communication foundations evaluated across all PM scenarios.</p>

              <div className="skill">
                <div className="skill-name">Clarity</div>
                <div className="bar">
                  <div className="fill" style={{ width: `${(assessment.scores.clarity / 5) * 100}%` }} />
                </div>
                <div className="score">{assessment.scores.clarity}/5</div>
              </div>

              <div className="skill">
                <div className="skill-name">Structure</div>
                <div className="bar">
                  <div className="fill" style={{ width: `${(assessment.scores.structure / 5) * 100}%` }} />
                </div>
                <div className="score">{assessment.scores.structure}/5</div>
              </div>

              <div className="skill">
                <div className="skill-name">Conciseness</div>
                <div className="bar">
                  <div className="fill" style={{ width: `${(assessment.scores.conciseness / 5) * 100}%` }} />
                </div>
                <div className="score">{assessment.scores.conciseness}/5</div>
              </div>

              {/* Layer B: Goal-Specific Effectiveness */}
              {assessment.goalEffectiveness && (
                <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #ede7fb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h2 style={{ margin: 0 }}>Layer B — Goal Effectiveness: {assessment.goalEffectiveness.goal}</h2>
                    <span className="tag" style={{ background: '#eaf8f2', color: '#1a7f5c', fontWeight: 700 }}>
                      Goal Specific
                    </span>
                  </div>
                  <div className="skill">
                    <div className="skill-name" style={{ width: '180px' }}>{assessment.goalEffectiveness.goal} Quality</div>
                    <div className="bar">
                      <div className="fill" style={{ width: `${(assessment.goalEffectiveness.score / 5) * 100}%`, background: 'linear-gradient(90deg, #1f9e76, #4b91f9)' }} />
                    </div>
                    <div className="score" style={{ color: '#1f9e76' }}>{assessment.goalEffectiveness.score}/5</div>
                  </div>
                  <p className="small" style={{ color: '#554e66', margin: '4px 0 12px' }}>
                    {assessment.goalEffectiveness.rationale}
                  </p>
                  {assessment.goalEffectiveness.criteriaResults && assessment.goalEffectiveness.criteriaResults.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', margin: '10px 0' }}>
                      {assessment.goalEffectiveness.criteriaResults.map((c, i) => (
                        <div key={i} style={{ padding: '8px 12px', background: '#f9f8fd', borderRadius: '10px', fontSize: '12px' }}>
                          <span style={{ color: c.status === 'met' ? '#1f9e76' : c.status === 'partially_met' ? '#d97706' : '#dc2626', fontWeight: 700, marginRight: '6px' }}>
                            {c.status === 'met' ? '✓' : c.status === 'partially_met' ? '◐' : '✕'}
                          </span>
                          <strong>{c.criterion}</strong>: <span style={{ color: '#68607c' }}>{c.note}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Scenario Alignment Score */}
              {assessment.scenarioAlignment && (
                <div style={{ marginTop: '20px', padding: '16px 18px', background: '#fdfbfe', border: '1.5px solid #ece4ff', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ fontSize: '14.5px', color: '#3f385c' }}>📋 Scenario Alignment Audit</strong>
                    <span className="tag" style={{ background: assessment.scenarioAlignment.score >= 4 ? '#eaf8f2' : assessment.scenarioAlignment.score >= 3 ? '#fef3c7' : '#fee2e2', color: assessment.scenarioAlignment.score >= 4 ? '#1a7f5c' : assessment.scenarioAlignment.score >= 3 ? '#92400e' : '#b91c1c' }}>
                      {assessment.scenarioAlignment.score}/5 {assessment.scenarioAlignment.score >= 4 ? 'Complete' : assessment.scenarioAlignment.score >= 3 ? 'Partial' : 'Needs Focus'}
                    </span>
                  </div>
                  <p className="small" style={{ color: '#554e66', margin: '4px 0 10px' }}>
                    {assessment.scenarioAlignment.rationale}
                  </p>
                  {assessment.scenarioAlignment.requiredElements && assessment.scenarioAlignment.requiredElements.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {assessment.scenarioAlignment.requiredElements.map((el, i) => (
                        <div key={i} style={{ fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: el.addressed ? '#1f9e76' : '#d97706', fontWeight: 800 }}>
                            {el.addressed ? '✓' : '○'}
                          </span>
                          <span style={{ color: el.addressed ? '#3f385c' : '#7a718c', textDecoration: el.addressed ? 'none' : 'none' }}>
                            {el.element}
                          </span>
                          {el.evidence && (
                            <span className="tiny" style={{ color: '#938aa8', fontStyle: 'italic' }}>
                              ({el.evidence})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Focus Skill Card */}
              <div className="callout" style={{ borderLeft: '4px solid #7153de' }}>
                <h3>Focus: {assessment.focus.toUpperCase()}</h3>
                <p>{assessment.focusExplanation}</p>
              </div>

              {/* Structured 4-Part Evidence Coaching */}
              {assessment.evidenceCoaching ? (
                <div style={{ marginTop: '24px' }}>
                  <h2>Evidence-Based Mentorship</h2>
                  
                  {/* What Worked */}
                  <div className="callout" style={{ background: '#f5fbf8', borderColor: '#c8edd9', borderLeft: '4px solid #1f9e76' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>🌟</span>
                      <h3 style={{ margin: 0, color: '#16654a' }}>What Worked: {assessment.evidenceCoaching.whatWorked.summary}</h3>
                    </div>
                    {assessment.evidenceCoaching.whatWorked.quote && (
                      <div className="quote" style={{ borderLeftColor: '#1f9e76', background: 'rgba(255,255,255,0.7)', margin: '8px 0' }}>
                        “{assessment.evidenceCoaching.whatWorked.quote}”
                      </div>
                    )}
                    <p style={{ margin: 0, color: '#2d6a4f', fontSize: '13.5px' }}>
                      <strong>Why this resonated:</strong> {assessment.evidenceCoaching.whatWorked.impact}
                    </p>
                  </div>

                  {/* What Needs Work */}
                  <div className="callout" style={{ background: '#fff9f6', borderColor: '#fed7aa', borderLeft: '4px solid #f97316' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>🔍</span>
                      <h3 style={{ margin: 0, color: '#9a3412' }}>What Needs Work: {assessment.evidenceCoaching.whatNeedsWork.summary}</h3>
                    </div>
                    {assessment.evidenceCoaching.whatNeedsWork.quote && (
                      <div className="quote" style={{ borderLeftColor: '#f97316', background: 'rgba(255,255,255,0.7)', margin: '8px 0' }}>
                        “{assessment.evidenceCoaching.whatNeedsWork.quote}”
                      </div>
                    )}
                    <p style={{ margin: '0 0 6px', color: '#7c2d12', fontSize: '13.5px' }}>
                      <strong>Audience Impact ({audience}):</strong> {assessment.evidenceCoaching.whatNeedsWork.audienceImpact}
                    </p>
                    {assessment.evidenceCoaching.whatNeedsWork.missingElements && assessment.evidenceCoaching.whatNeedsWork.missingElements.length > 0 && (
                      <div className="tiny" style={{ color: '#9a3412', marginTop: '6px' }}>
                        <strong>Missing elements to address:</strong> {assessment.evidenceCoaching.whatNeedsWork.missingElements.join(', ')}
                      </div>
                    )}
                  </div>

                  {/* Try This */}
                  <h2>Recommended Technique: {assessment.technique.name}</h2>
                  <div className="callout" style={{ borderLeft: '4px solid #7153de' }}>
                    <div style={{ margin: '6px 0 12px' }}>
                      {assessment.technique.steps.map((st, i) => (
                        <p key={i} style={{ fontWeight: 600, margin: '4px 0', fontSize: '14px', color: '#3f385c' }}>
                          {st}
                        </p>
                      ))}
                    </div>
                    <div className="quote" style={{ marginTop: '12px' }}>
                      <strong>💡 Tailored Model Script for Your Situation:</strong>
                      <br />
                      {assessment.technique.example}
                    </div>
                  </div>

                  {/* Your Next Challenge */}
                  <div className="callout" style={{ background: '#f5f0ff', borderColor: '#dfd2fe', borderLeft: '4px solid #8b5cf6' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '16px' }}>🎯</span>
                      <h3 style={{ margin: 0, color: '#5b21b6' }}>Your Next Challenge: {assessment.evidenceCoaching.nextChallenge.title}</h3>
                    </div>
                    <p style={{ margin: '4px 0 10px', color: '#4c1d95', fontSize: '13.5px' }}>
                      {assessment.evidenceCoaching.nextChallenge.exercise}
                    </p>
                    {assessment.evidenceCoaching.nextChallenge.sentenceStarter && (
                      <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.85)', borderRadius: '10px', fontSize: '13px' }}>
                        <strong style={{ color: '#6d28d9' }}>Opening Line Starter:</strong>{' '}
                        <span style={{ color: '#1e1b4b', fontStyle: 'italic' }}>
                          “{assessment.evidenceCoaching.nextChallenge.sentenceStarter}”
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {/* Verbatim Transcript Highlights Fallback */}
                  {assessment.highlights && assessment.highlights.length > 0 && (
                    <div className="callout">
                      <h3>From Your Actual Transcript</h3>
                      {assessment.highlights.map((h, idx) => (
                        <div key={idx} style={{ marginBottom: '12px' }}>
                          <div className="quote">“{h.quote}”</div>
                          <p>
                            <strong>Observation:</strong> {h.issue}
                          </p>
                          <p>
                            <strong>Recommendation:</strong> {h.suggestion}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Technique Recommendation */}
                  <h2>Recommended Technique: {assessment.technique.name}</h2>
                  <div className="callout">
                    {assessment.technique.steps.map((st, i) => (
                      <p key={i} style={{ fontWeight: 600, margin: '4px 0' }}>
                        {st}
                      </p>
                    ))}
                    <div className="quote" style={{ marginTop: '12px' }}>
                      <strong>Illustrative Example:</strong>
                      <br />
                      {assessment.technique.example}
                    </div>
                  </div>
                </>
              )}

              {/* Personalized Practice Schedule Builder */}
              <h2>Your Practice Cadence</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', margin: '14px 0' }}>
                <div>
                  <label className="field" htmlFor="durationSelect">
                    Session Duration
                  </label>
                  <select
                    id="durationSelect"
                    value={planMinutes}
                    onChange={e => setPlanMinutes(Number(e.target.value))}
                  >
                    <option value={3}>3 minutes (quick micro-drill)</option>
                    <option value={5}>5 minutes (recommended)</option>
                    <option value={10}>10 minutes (deep rehearsal)</option>
                  </select>
                </div>
                <div>
                  <label className="field" htmlFor="freqSelect">
                    Sessions This Week
                  </label>
                  <select
                    id="freqSelect"
                    value={planFrequency}
                    onChange={e => setPlanFrequency(Number(e.target.value))}
                  >
                    <option value={1}>1 session</option>
                    <option value={2}>2 sessions</option>
                    <option value={3}>3 sessions (recommended)</option>
                    <option value={5}>5 sessions</option>
                  </select>
                </div>
              </div>

              <div className="plan">
                {Array.from({ length: planFrequency }).map((_, i) => (
                  <div key={i} className="day">
                    <span className="tag">Practice {i + 1}</span>
                    <strong>{i === 0 ? assessment.focus : i === 1 ? 'Apply technique' : 'Fluency & brevity'}</strong>
                    <div>
                      {i === 0
                        ? `Focus directly on ${assessment.focus} using ${assessment.technique.name}.`
                        : i === 1
                        ? 'Practice with follow-up pressure questions.'
                        : 'Rehearse with real stakeholders.'}
                    </div>
                    <div className="tiny" style={{ marginTop: '8px' }}>
                      {planMinutes} minutes
                    </div>
                  </div>
                ))}
              </div>

              <div className="actions">
                <button className="btn" onClick={() => setStep(3)}>
                  Practice this now →
                </button>
                <button className="btn ghost" onClick={() => setStep(1)}>
                  ← Re-record Baseline
                </button>
              </div>
            </section>
          )}

          {/* SCREEN 04: PRACTICE WITH VIRA */}
          {step === 3 && assessment && (
            <section>
              <span className="eyebrow">04 / PRACTICE WITH VIRA</span>
              <h1>One small change. A clearer message.</h1>
              <p>Apply the technique you just learned. Rehearse your answer with focus and intention.</p>

              <div className="callout" style={{ borderLeft: '4px solid #7153de', background: '#f8f6ff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0, color: '#5534c7' }}>🎯 Vira&apos;s Technique Guide: {assessment.technique.name}</h3>
                  <span className="tag" style={{ background: '#eee8ff' }}>Focus: {assessment.focus.toUpperCase()}</span>
                </div>

                <div style={{ margin: '10px 0', padding: '10px 14px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px' }}>
                  <strong style={{ fontSize: '13px', color: '#3f385c' }}>The Structure to Follow:</strong>
                  <ul style={{ margin: '6px 0 0 18px', fontSize: '13.5px', color: '#554e66', lineHeight: 1.5 }}>
                    {assessment.technique.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ul>
                </div>

                <div className="quote" style={{ margin: '10px 0', borderLeftColor: '#7153de' }}>
                  <strong style={{ display: 'block', marginBottom: '4px', color: '#6545e8' }}>💡 Illustrative Model Script:</strong>
                  {assessment.technique.example}
                </div>

                <div style={{ marginTop: '12px', padding: '10px 14px', background: '#f1ebff', borderRadius: '12px', fontSize: '13.5px' }}>
                  <strong style={{ color: '#5534c7' }}>👉 Your Guided Mission:</strong> {assessment.exercise}
                </div>
              </div>

              {/* Retry Speech / Text Input */}
              <div className="speech">
                <div className="tiny" style={{ textAlign: 'center', fontWeight: 700, color: '#6545e8' }}>
                  {isRecording2 ? 'Listening… speak your retry clearly' : 'Tap mic to speak, or type your retry'}
                </div>
                <div className="record">
                  <button
                    type="button"
                    className={`mic ${isRecording2 ? 'recording' : ''}`}
                    onClick={() => toggleSpeech(2)}
                    title="Tap to speak retry"
                  >
                    🎙️
                  </button>
                  {isRecording2 && <span className="counter">{recTimer2}</span>}
                </div>

                <label className="field" htmlFor="answer2">
                  Your guided retry response
                </label>
                <div className="small" style={{ color: '#7a718c', marginBottom: '8px' }}>
                  💡 Deliver your genuine spoken or typed response applying the model above.
                </div>
                <textarea
                  id="answer2"
                  placeholder="Apply your technique and share your second attempt here..."
                  value={answer2}
                  onChange={e => setAnswer2(e.target.value)}
                />
                <div className="small" style={{ marginTop: '6px' }}>
                  {answer2.length} characters (min 35)
                </div>
              </div>

              <div className="actions">
                <button
                  className="btn"
                  disabled={comparing || answer2.trim().length < 35}
                  onClick={handleCompare}
                >
                  {comparing ? (
                    <>
                      <span className="spinner" /> Analyzing improvement...
                    </>
                  ) : (
                    'Compare my answers →'
                  )}
                </button>
                <button className="btn ghost" onClick={() => setStep(2)}>
                  ← Review Technique
                </button>
              </div>

              {/* Comparison Results Card */}
              {comparison && (
                <div style={{ marginTop: '34px', borderTop: '2px dashed #ece6f8', paddingTop: '24px' }}>
                  <span className="eyebrow">PRACTICE RESULTS</span>
                  <h2>
                    {comparison.verdict === 'improved'
                      ? '🎉 Noticeable Articulation Improvement'
                      : comparison.verdict === 'similar'
                      ? 'Solid Attempt — Keep Calibrating'
                      : 'Good Repetition — Keep Practicing'}
                  </h2>

                  <div className="stats">
                    <div className="stat">
                      <span>Baseline ({assessment.focus})</span>
                      <b>{comparison.focusBefore}/5</b>
                    </div>
                    <div className="stat">
                      <span>Retry ({assessment.focus})</span>
                      <b>{comparison.focusAfter}/5</b>
                    </div>
                  </div>

                  {/* Trade-Off Analysis Callout */}
                  {comparison.tradeOffAnalysis && (
                    <div
                      className="callout"
                      style={{
                        background: '#f8f5ff',
                        borderColor: '#ded5ff',
                        borderLeft: '4px solid #7153de',
                        margin: '18px 0',
                      }}
                    >
                      <h3 style={{ color: '#5534c7', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚖️</span> Communication Trade-Off Analysis
                      </h3>
                      <p style={{ margin: 0, color: '#3a3455', fontSize: '13.5px', lineHeight: 1.55 }}>
                        {comparison.tradeOffAnalysis}
                      </p>
                    </div>
                  )}

                  {/* Dimension-by-Dimension Breakdown */}
                  {comparison.dimensions && (
                    <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '15px', marginBottom: '10px', color: '#3f385c' }}>
                        📊 Dimension-by-Dimension Evaluation
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {Object.values(comparison.dimensions).map((dim, idx) => {
                          const isImproved = dim.classification === 'improved';
                          const isDeclined = dim.classification === 'declined';
                          const dimTitle =
                            dim.dimension === 'goalEffectiveness'
                              ? `Goal Execution (${goal})`
                              : dim.dimension === 'scenarioAlignment'
                              ? 'Scenario Alignment'
                              : dim.dimension.charAt(0).toUpperCase() + dim.dimension.slice(1);

                          return (
                            <div
                              key={idx}
                              style={{
                                padding: '12px 16px',
                                background: '#ffffff',
                                border: '1px solid #ebe6f5',
                                borderRadius: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '13.5px', color: '#2d254b' }}>{dimTitle}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '12.5px', color: '#7a718c', fontWeight: 600 }}>
                                    {dim.originalScore}/5 → {dim.revisedScore}/5
                                  </span>
                                  <span
                                    className="tag"
                                    style={{
                                      fontSize: '11px',
                                      padding: '3px 8px',
                                      borderRadius: '8px',
                                      background: isImproved ? '#eaf8f2' : isDeclined ? '#fee2e2' : '#f1f0f5',
                                      color: isImproved ? '#16654a' : isDeclined ? '#991b1b' : '#524b68',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {isImproved ? `+${dim.change} Improved` : isDeclined ? `${dim.change} Declined` : 'Similar'}
                                  </span>
                                </div>
                              </div>
                              <p style={{ margin: 0, fontSize: '12.5px', color: '#635a79', lineHeight: 1.45 }}>
                                {dim.explanation}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Meaning Preserved Check */}
                  <div
                    className="callout"
                    style={{
                      background: comparison.meaningPreserved ? '#eefaf5' : '#fff7ed',
                      borderColor: comparison.meaningPreserved ? '#c3edd8' : '#fcd6aa',
                    }}
                  >
                    <h3>
                      {comparison.meaningPreserved ? '✅ Core Meaning Preserved' : '⚠️ Meaning Shift Detected'}
                    </h3>
                    <p>{comparison.meaningNote}</p>
                  </div>

                  <div className="callout">
                    <h3>What Improved</h3>
                    <p>{comparison.whatImproved}</p>
                  </div>

                  <div className="callout">
                    <h3>Still Needs Work</h3>
                    <p>{comparison.stillNeedsWork}</p>
                  </div>

                  {/* Side by side preview */}
                  <div className="callout">
                    <h3>Before vs After Comparison</h3>
                    <div className="quote">
                      <strong>Baseline:</strong> “{answer1.slice(0, 120)}...”
                    </div>
                    <div className="quote" style={{ borderLeftColor: '#1f9e76' }}>
                      <strong>Retry:</strong> “{answer2.slice(0, 120)}...”
                    </div>
                  </div>

                  {/* Quick User Feedback on Vira Guidance */}
                  <div className="callout" style={{ background: '#fcfaff', border: '1.5px solid #ece4ff', marginTop: '18px' }}>
                    {!feedbackSubmitted ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <strong style={{ fontSize: '14.5px', color: '#3f385c' }}>
                            Was Vira&apos;s guidance helpful for this scenario?
                          </strong>
                          <span className="tiny" style={{ color: '#887c9c' }}>Quick 1-tap rating</span>
                        </div>

                        {/* 1 to 5 rating buttons */}
                        <div style={{ display: 'flex', gap: '8px', margin: '10px 0', flexWrap: 'wrap' }}>
                          {[
                            { score: 1, label: '1 · Not really' },
                            { score: 2, label: '2 · A little' },
                            { score: 3, label: '3 · Helpful' },
                            { score: 4, label: '4 · Very helpful' },
                            { score: 5, label: '5 · Game changer! 🌟' },
                          ].map(item => (
                            <button
                              key={item.score}
                              type="button"
                              className={`btn ${feedbackRating === item.score ? '' : 'ghost'}`}
                              style={{ padding: '8px 12px', fontSize: '12.5px', borderRadius: '10px' }}
                              onClick={() => setFeedbackRating(item.score)}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>

                        {/* Quick tags & optional note once a rating is picked */}
                        {feedbackRating !== null && (
                          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #e9e3fa' }}>
                            <div className="tiny" style={{ fontWeight: 700, color: '#6545e8', marginBottom: '6px' }}>
                              What resonated most? (optional)
                            </div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                              {['Actionable framework', 'Relevant model script', 'Focus gap diagnosis', 'Before/After comparison'].map(tag => {
                                const isSelected = feedbackTags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    className="tag"
                                    style={{
                                      cursor: 'pointer',
                                      padding: '6px 12px',
                                      fontSize: '12px',
                                      background: isSelected ? '#7153de' : '#f0eaff',
                                      color: isSelected ? 'white' : '#6443d6',
                                      border: '0',
                                      borderRadius: '99px',
                                    }}
                                    onClick={() => {
                                      setFeedbackTags(prev =>
                                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                      );
                                    }}
                                  >
                                    {isSelected ? '✓ ' : '+ '} {tag}
                                  </button>
                                );
                              })}
                            </div>

                            <input
                              type="text"
                              className="input"
                              style={{ fontSize: '13px', padding: '9px 12px', borderRadius: '10px', marginBottom: '10px' }}
                              placeholder="Any quick thoughts or suggestions for Vira? (optional)"
                              value={feedbackComment}
                              onChange={e => setFeedbackComment(e.target.value)}
                            />

                            <button
                              type="button"
                              className="btn secondary"
                              style={{ padding: '8px 18px', fontSize: '13px' }}
                              onClick={handleSubmitFeedback}
                              disabled={feedbackSubmitting}
                            >
                              {feedbackSubmitting ? 'Saving...' : 'Submit Feedback'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '10px 0', color: '#1f9e76' }}>
                        <strong style={{ fontSize: '14.5px' }}>✨ Thank you for your feedback!</strong>
                        <div className="tiny" style={{ marginTop: '4px', color: '#4d826a' }}>
                          Your input helps Vira calibrate advice and become a sharper mentor for product managers.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="actions">
                    <button className="btn" onClick={handleCopySummary}>
                      📋 Copy session summary
                    </button>
                    <button className="btn secondary" onClick={handleNextScenario}>
                      Next PM Scenario →
                    </button>
                    <button className="btn ghost" onClick={handleStartOver}>
                      Start fresh
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Footer Disclaimer & Links */}
          <div className="footer">
            <span>Scores are practice signals, not a validated assessment. All transcripts are sent securely.</span>
            <button className="reset" onClick={handleStartOver}>
              Start over
            </button>
          </div>
        </div>
      </main>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2>Your Practice History</h2>
              <button
                type="button"
                className="btn ghost"
                style={{ padding: '4px 10px', fontSize: '13px' }}
                onClick={() => setShowHistoryModal(false)}
              >
                ✕ Close
              </button>
            </div>
            <p style={{ marginBottom: '18px' }}>
              Past sessions persisted in Supabase database for <strong>{user?.identifier}</strong>.
            </p>

            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <span className="spinner" style={{ borderTopColor: '#7153de' }} />
                <div className="tiny" style={{ marginTop: '10px' }}>Loading saved sessions...</div>
              </div>
            ) : historySessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                No completed practice sessions saved yet. Complete a practice retry to view your history here!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '55vh', overflowY: 'auto' }}>
                {historySessions.map(s => (
                  <div key={s.id} className="callout" style={{ margin: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{s.goal}</strong>
                      <span className="tiny">{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '13px', margin: '4px 0', color: '#554e66' }}>
                      <strong>Audience:</strong> {s.audience} · <strong>Focus:</strong> {s.focusSkill}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '13px' }}>
                      <span>
                        Baseline: <b>{s.baselineScores[s.focusSkill as keyof Scores] || 2}/5</b>
                      </span>
                      <span>
                        Retry: <b>{s.retryScores?.[s.focusSkill as keyof Scores] || 'N/A'}/5</b>
                      </span>
                      {s.comparison?.verdict && (
                        <span className={`badge ${s.comparison.verdict === 'improved' ? 'improved' : 'similar'}`}>
                          {s.comparison.verdict}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
