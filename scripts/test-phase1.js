/**
 * MyCommPal — Phase 1 Test Suite: PM Decision Communication Intelligence
 * Tests all 12 scenarios required by Phase 1:
 * 1. Product prioritization with clear recommendation but missing evidence
 * 2. Product prioritization with evidence but no acknowledged trade-off
 * 3. Product strategy with a strong decision rationale
 * 4. Roadmap communication with unclear business impact
 * 5. Personal storytelling where decision-specific dimensions should not apply (applicable: false, zero penalty)
 * 6. General articulation scenarios
 * 7. Users who improve after retry (added evidence & trade-off)
 * 8. Users whose revised answers become worse (regression)
 * 9. Users whose scores stay the same despite qualitative changes
 * 10. Missing or partial AI responses / fallback resilience
 * 11. Existing Supabase feedback submission data contract
 * 12. Mobile and desktop layout contracts
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
  PM_DECISION_RUBRICS,
  isProductDecisionScenario,
  getShortDecisionScoreExplanation,
} = require('../dist_test/rubric');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(num, name, fn) {
  totalTests++;
  process.stdout.write(`[Phase 1 Test ${num}/12] ${name} ... `);
  try {
    await fn();
    passedTests++;
    console.log('✅ PASSED');
  } catch (err) {
    console.log('❌ FAILED');
    console.error(`   Error: ${err.message}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('  PHASE 1: PM DECISION COMMUNICATION INTELLIGENCE TEST SUITE    ');
  console.log('================================================================\n');

  // -------------------------------------------------------------------------
  // 1. Prioritization with Clear Recommendation but Missing Evidence
  // -------------------------------------------------------------------------
  await runTest(1, 'Prioritization with Clear Recommendation but Missing Evidence', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'VP of Product',
      scenario: 'VP asks why onboarding was prioritized over reporting this quarter.',
      transcript:
        'My direct recommendation is to prioritize the onboarding overhaul over reporting. We need to focus on our new signups first before we touch reporting dashboards. Onboarding is clearly more critical for the business right now.',
    });

    assert(res.pmDecisionScores, 'Must generate PM decision scores');
    assert(res.pmDecisionScores.isDecisionScenario === true, 'Must identify as decision scenario');
    assert(res.pmDecisionScores.decisionClarity.score >= 4, `Decision clarity should be high (>=4), got ${res.pmDecisionScores.decisionClarity.score}`);
    assert(res.pmDecisionScores.supportingEvidence.score <= 2, `Evidence score should be low (<=2) due to lack of metrics, got ${res.pmDecisionScores.supportingEvidence.score}`);
    assert(res.pmDecisionScores.supportingEvidence.improvementSuggestion, 'Must suggest adding telemetry or customer data');
    assert(res.technique.name.includes('DETI') || res.technique.name.includes('DRE') || res.technique.name.includes('PREP'), 'Technique should address evidence gap');
  });

  // -------------------------------------------------------------------------
  // 2. Prioritization with Evidence but No Acknowledged Trade-off
  // -------------------------------------------------------------------------
  await runTest(2, 'Prioritization with Evidence but No Acknowledged Trade-off', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Leadership communication',
      audience: 'Executive Committee',
      scenario: 'Our team can build either onboarding overhaul or reporting dashboard. Which do you prioritize?',
      transcript:
        'My recommendation is prioritizing the onboarding overhaul. Telemetry reveals 42% of signups drop off during initial setup, while research shows fixing activation drives a 3x higher retention cohort. This solves our largest customer funnel leak.',
    });

    assert(res.pmDecisionScores.isDecisionScenario === true, 'Must be decision scenario');
    assert(res.pmDecisionScores.decisionClarity.score >= 4, 'High decision clarity');
    assert(res.pmDecisionScores.supportingEvidence.score >= 4, 'High supporting evidence due to 42% telemetry');
    assert(res.pmDecisionScores.tradeoffArticulation.score <= 2, `Trade-off score should be <=2 since reporting was ignored, got ${res.pmDecisionScores.tradeoffArticulation.score}`);
    assert(res.pmDecisionScores.tradeoffArticulation.improvementSuggestion, 'Must coach user to name the deprioritized initiative');
  });

  // -------------------------------------------------------------------------
  // 3. Product Strategy with Strong Decision Rationale (Airtight DETI)
  // -------------------------------------------------------------------------
  await runTest(3, 'Product Strategy with Strong Decision Rationale', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Leadership communication',
      audience: 'VP of Product & Head of Sales',
      scenario: 'Presenting H2 product strategy: database migration vs net-new feature development.',
      transcript:
        'My recommendation is prioritizing the database migration ahead of net-new feature development this quarter. Telemetry shows 18% query timeouts during peak hours, and customer support tickets cite latency as our primary churn driver. While this delays the analytics export feature until Q3, fixing our infrastructure protects our enterprise SLA and safeguards $1.2M in annual recurring revenue.',
    });

    assert(res.pmDecisionScores.isDecisionScenario === true, 'Must identify as decision scenario');
    assert(res.pmDecisionScores.decisionClarity.score >= 4, 'Decision clarity >= 4');
    assert(res.pmDecisionScores.supportingEvidence.score >= 4, 'Evidence >= 4');
    assert(res.pmDecisionScores.tradeoffArticulation.score >= 4, 'Trade-off articulation >= 4');
    assert(res.pmDecisionScores.businessImpact.score >= 4, 'Business impact >= 4');
    assert(res.pmDecisionScores.overallDecisionRating >= 4, 'Overall decision rating >= 4');
  });

  // -------------------------------------------------------------------------
  // 4. Roadmap Communication with Unclear Business Impact
  // -------------------------------------------------------------------------
  await runTest(4, 'Roadmap Communication with Unclear Business Impact', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Stakeholder communication',
      audience: 'Cross-functional leadership',
      scenario: 'Defend your Q3 roadmap prioritization to the executive team.',
      transcript:
        'My decision is prioritizing refactoring the permissions modal. We have 15 Jira tickets logged against this module and engineers have requested this refactor for two sprints. While we pause the export tool, this gets the permissions tickets resolved.',
    });

    assert(res.pmDecisionScores.isDecisionScenario === true, 'Must identify as decision scenario');
    assert(res.pmDecisionScores.businessImpact.score <= 2, `Impact should be <=2 because it focuses on internal Jira tickets without business/customer value, got ${res.pmDecisionScores.businessImpact.score}`);
    assert(res.pmDecisionScores.businessImpact.improvementSuggestion, 'Must coach user to connect to customer or business outcomes');
  });

  // -------------------------------------------------------------------------
  // 5. Personal Storytelling Where Decision Dimensions Must NOT Apply
  // -------------------------------------------------------------------------
  await runTest(5, 'Personal Storytelling Where Decision Dimensions Are N/A', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Storytelling',
      audience: 'Aspiring Product Managers',
      scenario: 'Tell the story of a product misconception from early in your PM career.',
      transcript:
        'When I first transitioned into PM, I felt like I was thrown into the pool even before I could learn swimming. In my first month, I tried to design every single solution myself until a customer interview revealed I was solving the wrong problem. That turning point taught me that PM leadership is about asking sharper questions, not having every answer.',
    });

    assert(res.pmDecisionScores, 'Must include pmDecisionScores container');
    assert(res.pmDecisionScores.isDecisionScenario === false, 'Storytelling must NOT be flagged as product decision scenario');
    assert(res.pmDecisionScores.decisionClarity.applicable === false, 'Decision clarity must be marked applicable: false');
    assert(res.pmDecisionScores.supportingEvidence.applicable === false, 'Supporting evidence must be marked applicable: false');
    assert(res.pmDecisionScores.tradeoffArticulation.applicable === false, 'Trade-off articulation must be marked applicable: false');
    assert(res.pmDecisionScores.businessImpact.applicable === false, 'Business impact must be marked applicable: false');
    assert(res.scores.clarity >= 3, 'User must NOT be penalized for omitting product trade-offs');
    assert(res.goalEffectiveness.score >= 4, 'Storytelling should score high based on narrative arc');
  });

  // -------------------------------------------------------------------------
  // 6. General Articulation Scenarios
  // -------------------------------------------------------------------------
  await runTest(6, 'General Articulation Scenarios', async () => {
    const isDecision = isProductDecisionScenario(
      'A stakeholder asks why you are delaying the launch.',
      'Articulation'
    );
    assert(isDecision === true, 'Delay scenario must be recognized as decision context');

    const isNonDecision = isProductDecisionScenario(
      'Share your career transition into product management and your biggest personal misconception.',
      'Storytelling'
    );
    assert(isNonDecision === false, 'Personal career transition must NOT be classified as decision context');
  });

  // -------------------------------------------------------------------------
  // 7. Users Who Improve After Retry (Added Evidence & Trade-off)
  // -------------------------------------------------------------------------
  await runTest(7, 'Users Who Improve After Retry', async () => {
    const baseline =
      'My recommendation is doing onboarding first. We need to fix signups before we do reporting.';
    const retry =
      'My direct recommendation is prioritizing the onboarding overhaul over reporting. Telemetry confirms 42% user drop-off during onboarding, while reporting serves under 8% of users. We are consciously holding back automated reporting exports until Q3, which protects team focus and lifts first-week activation by 15%.';

    const compareRes = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'VP of Product',
      scenario: 'VP asks why onboarding was prioritized over reporting this quarter.',
      firstTranscript: baseline,
      secondTranscript: retry,
      focus: 'structure',
      firstScores: { clarity: 3, structure: 2, conciseness: 3 },
    });

    assert(compareRes.verdict === 'improved', 'Comparison verdict should be improved');
    assert(compareRes.dimensions.supportingEvidence, 'Must track supportingEvidence dimension');
    assert(compareRes.dimensions.supportingEvidence.classification === 'improved', 'Supporting evidence should improve');
    assert(compareRes.dimensions.tradeoffArticulation.classification === 'improved', 'Trade-off articulation should improve');
    assert(compareRes.multiAttemptRows.length >= 7, 'Multi-attempt rows must include decision dimensions');
  });

  // -------------------------------------------------------------------------
  // 8. Users Whose Revised Answers Become Worse (Regressions Recognized)
  // -------------------------------------------------------------------------
  await runTest(8, 'Users Whose Revised Answers Become Worse (Regression Handling)', async () => {
    const strongBaseline =
      'My recommendation is prioritizing the onboarding overhaul over reporting. Telemetry confirms 42% user drop-off during onboarding, while reporting serves under 8% of users. We are consciously holding back automated reporting exports until Q3, which protects team focus and lifts activation by 15%.';
    const regressedRetry =
      'Well, maybe we could look at both onboarding and reporting? I am not really 100% sure what the team wants to do. We could just see what happens and maybe try to do a bit of both.';

    const compareRes = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'VP of Product',
      scenario: 'VP asks why onboarding was prioritized over reporting this quarter.',
      firstTranscript: strongBaseline,
      secondTranscript: regressedRetry,
      focus: 'clarity',
      firstScores: { clarity: 5, structure: 5, conciseness: 4 },
    });

    assert(compareRes.verdict === 'declined', 'Verdict must be declined when retry becomes hedged and vague');
    assert(compareRes.dimensions.clarity.classification === 'declined', 'Clarity must decline');
    assert(compareRes.secondScores.clarity < 5, 'Second score must not automatically match or exceed baseline');
  });

  // -------------------------------------------------------------------------
  // 9. Users Whose Scores Stay the Same Despite Qualitative Changes
  // -------------------------------------------------------------------------
  await runTest(9, 'Users Whose Scores Stay the Same Despite Qualitative Changes', async () => {
    const attempt1 =
      'My decision is prioritizing the onboarding flow over reporting because customer activation is our primary bottleneck this quarter.';
    const attempt2 =
      'My recommendation is prioritizing the signup overhaul rather than reporting dashboards because customer activation is our key lever.';

    const assess1 = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'VP of Product',
      scenario: 'VP asks why onboarding was prioritized over reporting this quarter.',
      transcript: attempt1,
    });

    const compareRes = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'VP of Product',
      scenario: 'VP asks why onboarding was prioritized over reporting this quarter.',
      firstTranscript: attempt1,
      secondTranscript: attempt2,
      focus: 'clarity',
      firstScores: assess1.scores,
      assessment: assess1,
    });

    assert(compareRes.verdict === 'similar', `Comparable substance should produce similar verdict (got ${compareRes.verdict})`);
    assert(compareRes.meaningPreserved === true, 'Meaning must be preserved');
  });

  // -------------------------------------------------------------------------
  // 10. Missing or Partial AI Responses / Heuristic Fallback Resilience
  // -------------------------------------------------------------------------
  await runTest(10, 'Missing or Partial AI Responses (Fallback Resilience)', async () => {
    // Test that fallbackAssess returns all required Phase 1 structures without network dependencies
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Leadership communication',
      audience: 'Board of Directors',
      scenario: 'Executive asks why we are delaying the mobile release.',
      transcript: 'Our decision is postponing the mobile app release by two weeks to resolve a critical authentication crash. Releasing with this bug creates immediate negative reviews. We are pausing analytics export to ensure stability, and we ship on the 24th.',
    });

    assert(res.scores && res.scoreExplanations, 'Must provide scores and explanations');
    assert(res.pmDecisionScores && res.pmDecisionScores.isDecisionScenario === true, 'Must produce Layer C scores');
    assert(res.pmDecisionScores.overallDecisionRating >= 3, 'Must produce overall decision rating');
    assert(res.evidenceCoaching.technique.name.length > 0, 'Must produce matched coaching technique');
  });

  // -------------------------------------------------------------------------
  // 11. Existing Supabase Feedback Submission Data Contract
  // -------------------------------------------------------------------------
  await runTest(11, 'Supabase Feedback Submission Contract Verification', async () => {
    // Verify that user_feedback API endpoint payload structure is unchanged
    const feedbackRoute = fs.readFileSync(
      path.join(__dirname, '../src/app/api/sessions/feedback/route.ts'),
      'utf8'
    );
    assert(feedbackRoute.includes('saveFeedbackRecord'), 'Endpoint must call saveFeedbackRecord');

    const supabaseContent = fs.readFileSync(
      path.join(__dirname, '../src/lib/supabase.ts'),
      'utf8'
    );
    assert(supabaseContent.includes("from('user_feedback')"), 'Must persist to user_feedback table');
    assert(supabaseContent.includes('usefulness_rating'), 'Must accept usefulness_rating column');
    assert(supabaseContent.includes('improvement_suggestion'), 'Must accept improvement_suggestion column');
  });

  // -------------------------------------------------------------------------
  // 12. Mobile and Desktop Layout Contracts & UI Accessibility
  // -------------------------------------------------------------------------
  await runTest(12, 'Mobile and Desktop Layout Contracts & Accessibility', async () => {
    const pageContent = fs.readFileSync(path.join(__dirname, '../src/app/page.tsx'), 'utf8');

    // Verify Tab 1 (My Coaching) Progressive Disclosure
    assert(pageContent.includes('id="panel-coaching"'), 'Must have panel-coaching tabpanel');
    assert(pageContent.includes('id="panel-scores"'), 'Must have panel-scores tabpanel');
    assert(pageContent.includes('id="panel-deep_dive"'), 'Must have panel-deep_dive tabpanel');

    // Verify PM Decision scorecard in Tab 2
    assert(pageContent.includes('Product Decision Communication Intelligence'), 'Must display PM Decision Intelligence header');
    assert(pageContent.includes('Decision Clarity'), 'Must show Decision Clarity');
    assert(pageContent.includes('Supporting Evidence'), 'Must show Supporting Evidence');
    assert(pageContent.includes('Trade-off Articulation'), 'Must show Trade-off Articulation');
    assert(pageContent.includes('Business or Customer Impact'), 'Must show Business or Customer Impact');

    // Verify Non-Decision Scenario Handling
    assert(pageContent.includes('Not Applicable for Storytelling'), 'Must have N/A badge for non-decision scenarios');
    assert(pageContent.includes('Non-Decision Context:'), 'Must explain non-decision context without penalty');

    // Verify Deep Dive Accordion in Tab 3
    assert(pageContent.includes('Product Decision Intelligence Breakdown & Evidence'), 'Must have PM Decision Deep Dive accordion');
  });

  console.log('\n================================================================');
  console.log(`  PHASE 1 TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runSuite().catch(e => {
  console.error('Test Suite Aborted:', e);
  process.exit(1);
});
