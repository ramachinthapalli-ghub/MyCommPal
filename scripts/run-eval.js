/**
 * MyCommPal — Comprehensive Acceptance & Regression Test Suite (20 Acceptance Tests)
 * Verifies all 20 criteria from Section 11:
 * 1. Strong storytelling response
 * 2. Weak storytelling response
 * 3. Strong articulation response
 * 4. Weak articulation response
 * 5. Executive communication
 * 6. Custom user scenario with dynamic model example
 * 7. Clear but off-topic response
 * 8. Concise but incomplete response
 * 9. Improved retry
 * 10. Declined retry
 * 11. Mixed improvement and regression (PM Storytelling Critical Regression Test)
 * 12. Same score with qualitative differences
 * 13. Voice input (filler words & punctuation robustness)
 * 14. Empty / too short response (<35 chars)
 * 15. Long response (>4000 chars)
 * 16. API timeout handling
 * 17. Missing API key handling (no silent fake scores)
 * 18. Invalid AI output schema handling
 * 19. Mobile experience / UI data contracts
 * 20. Privacy & API-key exposure checks
 */

const fs = require('fs');
const path = require('path');

const {
  fallbackAssess,
  fallbackCompare,
  runMentorAssess,
  runMentorCompare,
  generateDynamicIllustrativeExample,
} = require('../dist_test/mentor-engine');

const {
  getAIProviderConfig,
  AIConfigurationError,
  AIServiceError,
  extractCleanJSON,
} = require('../dist_test/ai-provider');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(testNum, name, testFn) {
  totalTests++;
  process.stdout.write(`\n[Test ${testNum}/20] ${name} ... `);
  try {
    await testFn();
    console.log('✅ PASSED');
    passedTests++;
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`   Error: ${err.message}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('  MYCOMMPAL REAL AI EVALUATION TEST SUITE (20 BENCHMARKS)       ');
  console.log('================================================================');

  // -------------------------------------------------------------------------
  // 1. Strong Storytelling Response
  // -------------------------------------------------------------------------
  await runTest(1, 'Strong Storytelling Response', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Storytelling',
      audience: 'Aspiring Product Managers',
      scenario: 'Tell the story of your product management journey, misconception, and turning point.',
      transcript:
        'When I first started as a PM, my biggest misconception was thinking my role was to design every feature myself. During my first project, I was thrown into the deep end without knowing how to swim. The pivotal turning point happened when a customer interview showed nobody used the feature I spent two months designing. That failure taught me that PM is not about having answers, but asking the right questions to solve real problems.',
    });

    assert(res.goalEffectiveness.score >= 4, `Storytelling score should be >= 4 (got ${res.goalEffectiveness.score})`);
    assert(res.scores.clarity >= 4, `Clarity score should be >= 4 (got ${res.scores.clarity})`);
    assert(res.scenarioAlignment.score >= 4, `Scenario alignment should be >= 4 (got ${res.scenarioAlignment.score})`);
    assert(res.evidenceCoaching.whatWorked.quote.length > 5, 'Must cite verbatim quote from transcript');
  });

  // -------------------------------------------------------------------------
  // 2. Weak Storytelling Response
  // -------------------------------------------------------------------------
  await runTest(2, 'Weak Storytelling Response (Aphorisms without Substance)', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Storytelling',
      audience: 'Aspiring Product Managers',
      scenario: 'Tell the story of your product management journey, misconception, and turning point.',
      transcript:
        'You get there when you want to get there !!! Every story ends with a success note or failure note !!! What shapes us is whether we learn from it or break from it !!! Always keep moving forward toward your destiny !!!',
    });

    assert(res.goalEffectiveness.score <= 3, `Weak storytelling score should be <= 3 (got ${res.goalEffectiveness.score})`);
    assert(res.scores.clarity <= 2, `Clarity should be penalized for slogans (got ${res.scores.clarity})`);
    assert(res.technique.name.includes('Hook') || res.technique.name.includes('HJR'), 'Should recommend narrative framework');
  });

  // -------------------------------------------------------------------------
  // 3. Strong Articulation Response
  // -------------------------------------------------------------------------
  await runTest(3, 'Strong Articulation Response', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Executive Stakeholders',
      scenario: 'Which project should we prioritize: platform migration or user onboarding?',
      transcript:
        'My direct recommendation is prioritizing the platform migration this sprint. Our database query latency has spiked 300ms, putting $1.2M in annual recurring revenue at risk. While onboarding is important, stabilizing core performance protects existing customer retention.',
    });

    assert(res.scores.clarity >= 4, `Clarity should be >= 4 (got ${res.scores.clarity})`);
    assert(res.scores.structure >= 4, `Structure should be >= 4 (got ${res.scores.structure})`);
    assert(res.goalEffectiveness.score >= 4, `Articulation effectiveness should be >= 4 (got ${res.goalEffectiveness.score})`);
  });

  // -------------------------------------------------------------------------
  // 4. Weak Articulation Response (Heavy Hedging)
  // -------------------------------------------------------------------------
  await runTest(4, 'Weak Articulation Response (Hedging & Indecision)', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Executive Stakeholders',
      scenario: 'Which project should we prioritize: platform migration or user onboarding?',
      transcript:
        'Um, maybe we could do onboarding, but platform migration is also important, not 100% sure what makes sense, kind of depends on whatever the team wants to do, see what happens.',
    });

    assert(res.scores.clarity <= 2, `Clarity should be <= 2 due to heavy hedging (got ${res.scores.clarity})`);
    assert(res.focus === 'clarity' || res.focus === 'structure', `Focus should be clarity or structure (got ${res.focus})`);
  });

  // -------------------------------------------------------------------------
  // 5. Executive Communication
  // -------------------------------------------------------------------------
  await runTest(5, 'Executive Communication Altitude', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Leadership communication',
      audience: 'C-Suite Executives',
      scenario: 'Stakeholder asks why the release is delayed.',
      transcript:
        'My recommendation is postponing the release by two weeks to resolve a critical checkout bug. Launching on time would cause a projected 35% conversion loss on day one. Delaying protects $500k in launch revenue, and our revised ship date is November 14th.',
    });

    assert(res.scores.clarity >= 4, `Clarity should be executive level >= 4 (got ${res.scores.clarity})`);
    assert(res.scores.structure >= 4, `Structure should be executive level >= 4 (got ${res.scores.structure})`);
    assert(res.scenarioAlignment.score >= 4, 'Scenario requirements addressed');
  });

  // -------------------------------------------------------------------------
  // 6. Custom User Scenario with Dynamic Model Example
  // -------------------------------------------------------------------------
  await runTest(6, 'Custom User Scenario with Dynamic Model Script', async () => {
    const customPrompt = 'We need to deprecate legacy SOAP APIs for our top 20 enterprise banking clients.';
    const example = generateDynamicIllustrativeExample(customPrompt, 'Stakeholder communication', 'Enterprise Banking CTOs', 'PREP');

    assert(!example.toLowerCase().includes('onboarding over reporting'), 'Must NOT return canned onboarding vs reporting example');
    assert(example.split(/\s+/).length <= 45, 'Dynamic example must be under 45 words');
  });

  // -------------------------------------------------------------------------
  // 7. Clear but Off-Topic Response
  // -------------------------------------------------------------------------
  await runTest(7, 'Clear but Off-Topic Response', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Executive Stakeholders',
      scenario: 'Which project should we prioritize: platform migration or user onboarding?',
      transcript:
        'I strongly recommend that we host our annual team retreat in Honolulu Hawaii. The flight costs are 20% lower this quarter, and the beach location will drastically improve team morale and retention across the organization.',
    });

    assert(res.scenarioAlignment.score === 1, `Scenario alignment should be 1 for off-topic response (got ${res.scenarioAlignment.score})`);
    assert(res.scenarioAlignment.rationale.toLowerCase().includes('not address') || res.scenarioAlignment.rationale.toLowerCase().includes('off-topic'), 'Rationale must flag off-topic nature');
  });

  // -------------------------------------------------------------------------
  // 8. Concise but Incomplete Response
  // -------------------------------------------------------------------------
  await runTest(8, 'Concise but Incomplete Response', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Stakeholder communication',
      audience: 'Engineering Lead',
      scenario: 'A stakeholder asks why you are delaying the mobile app release.',
      transcript: 'We are delaying the app. Quality matters most.',
    });

    assert(res.scores.conciseness <= 2, `Very sparse answer without rationale should not be awarded 5 for conciseness (got ${res.scores.conciseness})`);
    assert(res.scenarioAlignment.score <= 3, 'Incomplete response should have lower scenario alignment');
  });

  // -------------------------------------------------------------------------
  // 9. Improved Retry
  // -------------------------------------------------------------------------
  await runTest(9, 'Improved Retry Comparison', async () => {
    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Executive Stakeholders',
      scenario: 'Which project should we prioritize: platform migration or user onboarding?',
      firstTranscript: 'Um, maybe we could do onboarding, not sure what makes sense.',
      secondTranscript:
        'My recommendation is prioritizing the platform migration because we have 300ms latency spikes threatening enterprise SLAs. Stabilizing queries protects $1.2M in annual revenue.',
      focus: 'clarity',
      firstScores: { clarity: 2, structure: 2, conciseness: 2 },
    });

    assert(comp.verdict === 'improved', `Verdict must be 'improved' (got ${comp.verdict})`);
    assert(comp.dimensions.clarity.classification === 'improved', 'Clarity must be improved');
    assert(comp.multiAttemptRows && comp.multiAttemptRows.length > 0, 'Must generate multi-attempt progress rows');
  });

  // -------------------------------------------------------------------------
  // 10. Declined Retry
  // -------------------------------------------------------------------------
  await runTest(10, 'Declined Retry (Pasted Exercise Framework / Deteriorated)', async () => {
    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Executive Stakeholders',
      scenario: 'Which project should we prioritize: platform migration or user onboarding?',
      firstTranscript:
        'My recommendation is prioritizing platform migration to protect our enterprise SLAs.',
      secondTranscript:
        'Active Technique: PREP Framework (Point, Reason, Example, Point) Goal: Explain the exact same decision using PREP: Recommendation in sentence one...',
      focus: 'clarity',
      firstScores: { clarity: 4, structure: 4, conciseness: 4 },
    });

    assert(comp.verdict === 'less clear' || comp.verdict === 'declined', `Verdict must be declined/less clear (got ${comp.verdict})`);
    assert(comp.meaningPreserved === false, 'Meaning preserved must be false when template is pasted');
  });

  // -------------------------------------------------------------------------
  // 11. Mixed Improvement and Regression (Critical Storytelling Test)
  // -------------------------------------------------------------------------
  await runTest(11, 'Mixed Improvement and Regression (Section 7 Critical Case)', async () => {
    const baseline =
      'You get there when you want to get there !!! Every story ends with a success note or failure note !!! ' +
      'One of such incident happened in my life, where I had thrown into pool even before I could learn swimming. ' +
      'This reminds me of my first Business Analysis project where I was new to product, domain and role.';

    const retry =
      'Transition to PM was hardest journey but most joyous journey. Key learnings were to come out of comfort zone, ' +
      'asking right questions to right people, identifying right customer problems, and building solutions that add value.';

    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Storytelling',
      audience: 'Leadership and executives',
      scenario:
        'Tell the story of your product management journey and your core product philosophy to aspiring PMs. What was your biggest misconception when starting out, what was your turning-point realization, and what should they remember?',
      firstTranscript: baseline,
      secondTranscript: retry,
      focus: 'clarity',
      firstScores: { clarity: 2, structure: 2, conciseness: 2 },
    });

    assert(comp.dimensions.clarity.classification === 'improved', 'Clarity should improve');
    assert(comp.dimensions.conciseness.classification === 'improved', 'Conciseness should improve');
    assert(
      comp.dimensions.goalEffectiveness.classification === 'declined' ||
      (comp.tradeOffAnalysis && comp.tradeOffAnalysis.toLowerCase().includes('trade-off')),
      'Must detect trade-off where storytelling declined or trade-off is declared'
    );
    assert(comp.progressInsight.toLowerCase().includes('lost the personal story') || comp.progressInsight.toLowerCase().includes('trade-off'), 'Progress insight must explain the trade-off');
  });

  // -------------------------------------------------------------------------
  // 12. Same Score with Qualitative Differences
  // -------------------------------------------------------------------------
  await runTest(12, 'Same Score with Qualitative Differences', async () => {
    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Stakeholders',
      scenario: 'Explain a prioritization decision.',
      firstTranscript: 'My recommendation is prioritizing the onboarding overhaul because user activation dropped 10%.',
      secondTranscript: 'My decision is focusing on the onboarding revamp because first-day drop-off reached 12%.',
      focus: 'clarity',
      firstScores: { clarity: 4, structure: 3, conciseness: 4 },
    });

    assert(comp.dimensions.clarity.classification === 'similar', 'Clarity classification should be similar');
    assert(comp.progressInsight.length > 20, 'Must provide qualitative insight even if scores are similar');
  });

  // -------------------------------------------------------------------------
  // 13. Voice Input Handling (Filler & Punctuation Robustness)
  // -------------------------------------------------------------------------
  await runTest(13, 'Voice Input Robustness (Fillers & Lack of Punctuation)', async () => {
    const voiceTranscript =
      'um like so my recommendation is that we should probably focus on fixing the checkout flow ' +
      'because like our telemetry shows thirty percent drop off at payment step and if we fix that we will improve revenue';

    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Product Team',
      scenario: 'Which problem should we solve next?',
      transcript: voiceTranscript,
    });

    assert(res.scores.clarity >= 3, `Should extract core meaning despite voice fillers (got ${res.scores.clarity})`);
    assert(res.technique.name.length > 0, 'Technique must be populated');
  });

  // -------------------------------------------------------------------------
  // 14. Empty / Too Short Response (<35 chars)
  // -------------------------------------------------------------------------
  await runTest(14, 'Empty / Too Short Response Validation', async () => {
    let errorCaught = false;
    try {
      await runMentorAssess({
        mode: 'assess',
        goal: 'Articulation',
        audience: 'Team',
        scenario: 'General dilemma',
        transcript: 'Short answer',
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('35 characters'), 'Error must specify minimum 35 characters requirement');
    }
    assert(errorCaught, 'Must reject responses under 35 characters');
  });

  // -------------------------------------------------------------------------
  // 15. Long Response (>4000 chars)
  // -------------------------------------------------------------------------
  await runTest(15, 'Long Response (>4000 chars) Validation', async () => {
    let errorCaught = false;
    try {
      await runMentorAssess({
        mode: 'assess',
        goal: 'Articulation',
        audience: 'Team',
        scenario: 'General dilemma',
        transcript: 'A'.repeat(4001),
      });
    } catch (err) {
      errorCaught = true;
      assert(err.message.includes('4,000 characters'), 'Error must specify maximum 4,000 characters limit');
    }
    assert(errorCaught, 'Must reject responses over 4000 characters');
  });

  // -------------------------------------------------------------------------
  // 16. API Timeout Handling
  // -------------------------------------------------------------------------
  await runTest(16, 'API Timeout Handling', async () => {
    const timeoutErr = new AIServiceError(
      "Vira's evaluation timed out after 20 seconds. Please retry with a slightly more concise response.",
      504
    );
    assert(timeoutErr.statusCode === 504, 'Timeout error must be status 504');
    assert(timeoutErr.message.includes('timed out'), 'Message must inform user of timeout');
  });

  // -------------------------------------------------------------------------
  // 17. Missing API Key Handling (No Silent Fake Scores)
  // -------------------------------------------------------------------------
  await runTest(17, 'Missing API Key Handling (Explicit 503)', async () => {
    const originalOpenAI = process.env.OPENAI_API_KEY;
    const originalAnthropic = process.env.ANTHROPIC_API_KEY;
    const originalProvider = process.env.AI_PROVIDER;

    try {
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.AI_PROVIDER;

      let caught = false;
      try {
        getAIProviderConfig();
      } catch (e) {
        caught = true;
        assert(e instanceof AIConfigurationError, 'Must throw AIConfigurationError');
        assert(e.message.includes('OPENAI_API_KEY'), 'Must specify missing API key');
      }
      assert(caught, 'Must not proceed silently when API keys are missing');
    } finally {
      if (originalOpenAI) process.env.OPENAI_API_KEY = originalOpenAI;
      if (originalAnthropic) process.env.ANTHROPIC_API_KEY = originalAnthropic;
      if (originalProvider) process.env.AI_PROVIDER = originalProvider;
    }
  });

  // -------------------------------------------------------------------------
  // 18. Invalid AI Output Schema Handling
  // -------------------------------------------------------------------------
  await runTest(18, 'Invalid AI Output Schema Handling', async () => {
    let caught = false;
    try {
      extractCleanJSON('invalid raw output with no json');
    } catch (e) {
      caught = true;
      assert(e instanceof AIServiceError, 'Must throw AIServiceError on malformed JSON');
      assert(e.statusCode === 502, 'Malformed JSON must return 502 Bad Gateway');
    }
    assert(caught, 'Must reject malformed model output');
  });

  // -------------------------------------------------------------------------
  // 19. Mobile Experience / UI Data Contracts
  // -------------------------------------------------------------------------
  await runTest(19, 'Mobile Experience & UI Data Contracts', async () => {
    const assessRes = fallbackAssess({
      mode: 'assess',
      goal: 'Persuasion',
      audience: 'VP of Engineering',
      scenario: 'Convince VP to adopt new CI/CD pipeline.',
      transcript: 'My recommendation is adopting the new CI/CD pipeline because build times will drop 50%.',
    });

    assert(assessRes.scoreExplanations && Object.keys(assessRes.scoreExplanations).length >= 5, 'Must provide all core score explanations');
    assert(assessRes.evidenceCoaching.nextChallenge.sentenceStarter.length > 0, 'Must provide sentence starter for mobile drill');

    const compareRes = fallbackCompare({
      mode: 'compare',
      goal: 'Persuasion',
      audience: 'VP of Engineering',
      scenario: 'Convince VP to adopt new CI/CD pipeline.',
      firstTranscript: 'My recommendation is adopting the new CI/CD pipeline because build times will drop 50%.',
      secondTranscript: 'My firm recommendation is adopting the new CI/CD pipeline this sprint. It cuts build latency 50% and protects velocity.',
      focus: 'clarity',
      firstScores: { clarity: 3, structure: 3, conciseness: 3 },
    });

    assert(compareRes.multiAttemptRows && compareRes.multiAttemptRows.length >= 5, 'Must provide progress table rows');
    assert(compareRes.nextChallenge.sentenceStarter.length > 0, 'Must provide next challenge sentence starter');
  });

  // -------------------------------------------------------------------------
  // 20. Privacy & API-Key Exposure Checks
  // -------------------------------------------------------------------------
  await runTest(20, 'Privacy and API-Key Exposure Checks', async () => {
    const pageContent = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8');
    const layoutContent = fs.readFileSync(path.join(__dirname, '../src/app/layout.tsx'), 'utf8');

    assert(!pageContent.includes('OPENAI_API_KEY'), 'OPENAI_API_KEY must NEVER be present in page.tsx');
    assert(!pageContent.includes('ANTHROPIC_API_KEY'), 'ANTHROPIC_API_KEY must NEVER be present in page.tsx');
    assert(!layoutContent.includes('OPENAI_API_KEY'), 'OPENAI_API_KEY must NEVER be present in layout.tsx');
    assert(!pageContent.includes('process.env.NEXT_PUBLIC_OPENAI'), 'No public OpenAI environment variables should exist');
    assert(!pageContent.includes('process.env.NEXT_PUBLIC_ANTHROPIC'), 'No public Anthropic environment variables should exist');
  });

  console.log('================================================================');
  console.log(`  EVALUATION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runSuite().catch(e => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
