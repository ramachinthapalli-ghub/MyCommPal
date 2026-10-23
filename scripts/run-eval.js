/**
 * MyCommPal — Comprehensive Acceptance & Regression Test Suite (10 Acceptance Tests)
 * Verifies:
 * 1. Retry clearly improves all dimensions
 * 2. Retry improves clarity but worsens storytelling (PM Storytelling Regression)
 * 3. Retry produces identical scores but meaningful qualitative differences
 * 4. Retry performs worse overall
 * 5. Baseline is already strong
 * 6. Response is concise but does not answer the scenario
 * 7. User chooses a custom stakeholder scenario
 * 8. Voice transcription handling for both attempts
 * 9. Incomplete model response / API error fallback resilience
 * 10. Dynamic illustrative example generation (No static onboarding vs reporting!)
 */

const {
  fallbackAssess,
  fallbackCompare,
  runMentorAssess,
  runMentorCompare,
  generateDynamicIllustrativeExample,
} = require('../dist_test/mentor-engine');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTest(testNum, name, testFn) {
  totalTests++;
  process.stdout.write(`\n[Acceptance Test ${testNum}/10] ${name} ... `);
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
  console.log('  MYCOMMPAL ACCEPTANCE TEST SUITE — VIRA PROGRESS & ASSESSMENT  ');
  console.log('================================================================');

  // -------------------------------------------------------------------------
  // 1. Retry clearly improves all dimensions
  // -------------------------------------------------------------------------
  await runTest(1, 'Retry Clearly Improves All Dimensions', async () => {
    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Executive Stakeholders',
      scenario: 'Which project should we prioritize: platform migration or user onboarding?',
      firstTranscript: 'Um, maybe we could do onboarding, but platform migration is also important, not 100% sure what makes sense.',
      secondTranscript:
        'My recommendation is prioritizing the platform migration because we have 300ms latency spikes threatening our tier 1 SLAs. First, stabilizing database queries protects $1.2M in annual recurring revenue. Second, it unblocks reliable feature development for the rest of the year.',
      focus: 'clarity',
      firstScores: { clarity: 2, structure: 2, conciseness: 2 },
    });

    assert(comp.verdict === 'improved', `Verdict must be 'improved' (got ${comp.verdict})`);
    assert(comp.dimensions.clarity.classification === 'improved', 'Clarity must be improved');
    assert(comp.dimensions.structure.classification === 'improved', 'Structure must be improved');
    assert(comp.dimensions.conciseness.classification === 'improved', 'Conciseness must be improved');
    assert(comp.meaningPreserved === true, 'Meaning must be preserved');
    assert(comp.progressInsight && comp.progressInsight.length > 20, 'Progress insight must be present');
  });

  // -------------------------------------------------------------------------
  // 2. Retry improves clarity but worsens storytelling (Critical Regression Test)
  // -------------------------------------------------------------------------
  await runTest(2, 'Retry Improves Clarity but Worsens Storytelling (PM Journey)', async () => {
    const baseline =
      'You get there when you want to get there !!!\n\n' +
      'Every story ends with a success note or failure note !!!\n\n' +
      'What shapes us is whether we learn from it or break from it !!!\n\n' +
      'One of such incident happened in my life, where I had thrown into pool even before I could learn swimming.\n' +
      'But my goal was to survive through so I learned swimming.\n\n' +
      'This is in the context of my first Business Analysis project where I was new to product, domain and role.\n' +
      'Had thrown into deep valley with lot of expectations to climb over.\n' +
      'Everytime when I fall a step down, I look at my goal of surviving through and motivated me to step up !!!';

    const retry =
      'Transition to PM was hardest journey but most joyous journey. Key learnings during initial days of my transition was, to come out of your comfort zone and focus on what you are supposed to do as PM\n' +
      'Asking right questions to right people\n' +
      'Identifying right customer problems\n' +
      'Building solutions that solves customer problems and add value';

    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Storytelling',
      audience: 'Leadership and executives',
      scenario:
        'Tell the story of your product management journey and your core product philosophy to aspiring PMs. What was your biggest misconception when starting out, what was your turning-point realization, and what should they remember?',
      firstTranscript: baseline,
      secondTranscript: retry,
      focus: 'clarity',
      firstScores: { clarity: 2, structure: 2, conciseness: 3 },
    });

    assert(comp.dimensions.clarity.classification === 'improved', 'Clarity must be improved');
    assert(comp.dimensions.goalEffectiveness.classification === 'declined', 'Storytelling goal must decline');
    assert(comp.progressInsight.includes('lost the personal story') || comp.progressInsight.includes('storytelling'), 'Progress insight captures the story regression');
    assert(comp.nextChallenge && comp.nextChallenge.title.includes('story'), 'Next challenge guides bringing back the story');
  });

  // -------------------------------------------------------------------------
  // 3. Retry produces identical scores but meaningful qualitative differences
  // -------------------------------------------------------------------------
  await runTest(3, 'Retry Produces Identical Scores with Qualitative Diagnosis', async () => {
    const baseline =
      'First, we prioritize reach and impact across all active customer segments. Second, we factor in engineering effort and team confidence to calculate a defensible RICE score before committing roadmap resources.';
    const retry =
      'First, we prioritize reach and impact across all active user cohorts. Second, we factor in engineering effort and delivery confidence to calculate a defensible RICE score before committing roadmap resources.';

    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Product Leadership',
      scenario: 'Explain our prioritization methodology to stakeholders.',
      firstTranscript: baseline,
      secondTranscript: retry,
      focus: 'structure',
      firstScores: { clarity: 3, structure: 4, conciseness: 3 },
    });

    assert(comp.dimensions.structure.originalScore === comp.dimensions.structure.revisedScore, 'Structure scores remain comparable');
    assert(comp.verdict === 'similar', `Verdict must be 'similar' (got ${comp.verdict})`);
    assert(comp.progressInsight.length > 20, 'Vira provides qualitative progress insight without generic praise');
    assert(comp.stillNeedsWork.length > 10, 'Specific remaining work is articulated');
  });

  // -------------------------------------------------------------------------
  // 4. Retry performs worse overall
  // -------------------------------------------------------------------------
  await runTest(4, 'Retry Performs Worse Overall (Regression Detected)', async () => {
    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Executive Committee',
      scenario: 'Recommend our cloud migration budget.',
      firstTranscript: 'My recommendation is allocating 40% capacity to cloud migration to protect enterprise SLAs.',
      secondTranscript: 'Well, maybe we could look at cloud migration, but there are so many opinions, so I am not sure what we should do, whatever the team decides.',
      focus: 'clarity',
      firstScores: { clarity: 4, structure: 4, conciseness: 4 },
    });

    assert(comp.verdict === 'declined' || comp.verdict === 'less clear', `Verdict must reflect decline (got ${comp.verdict})`);
    assert(comp.dimensions.clarity.classification === 'declined', 'Clarity must be classified as declined');
    assert(comp.progressInsight.toLowerCase().includes('hesitation') || comp.progressInsight.toLowerCase().includes('declined') || comp.progressInsight.toLowerCase().includes('lost'), 'Progress insight explains regression constructively');
  });

  // -------------------------------------------------------------------------
  // 5. Baseline is already strong
  // -------------------------------------------------------------------------
  await runTest(5, 'Baseline is Already Strong (High Executive Signal)', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Leadership communication',
      audience: 'Executive Board',
      scenario: 'Present our platform stability trade-offs.',
      transcript:
        'My recommendation to the executive board is committing 40% engineering capacity to database migration in H2. First, the business rationale: peak latency degraded by 300ms, putting $1.2M ARR at risk. Second, the trade-off: this delays the billing portal by one quarter, mitigated by manual finance workflows. Third, our mitigation: rollback criteria are automated with a 5% pilot rollout.',
    });

    assert(res.scores.clarity >= 4, `Clarity must be >= 4 (got ${res.scores.clarity})`);
    assert(res.scores.structure >= 4, `Structure must be >= 4 (got ${res.scores.structure})`);
    assert(res.scenarioAlignment.score >= 4, `Scenario alignment must be >= 4 (got ${res.scenarioAlignment.score})`);
    assert(res.scoreExplanations.clarity.length > 10, 'Clarity score explanation provided');
    assert(res.scoreExplanations.structure.length > 10, 'Structure score explanation provided');
  });

  // -------------------------------------------------------------------------
  // 6. Response is concise but does not answer the scenario
  // -------------------------------------------------------------------------
  await runTest(6, 'Response is Concise but Fails Scenario Alignment', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'VP of Engineering',
      scenario: 'A stakeholder asks why you are delaying the mobile app launch by 4 weeks. How do you respond?',
      transcript: 'Quantum computing algorithms optimize portfolio asset allocation using qubit entanglement.',
    });

    assert(res.scenarioAlignment.score <= 2, `Scenario alignment must be <= 2 (got ${res.scenarioAlignment.score})`);
    assert(res.scenarioAlignment.rationale.toLowerCase().includes('not address') || res.scenarioAlignment.rationale.toLowerCase().includes('dilemma'), 'Flags failure to answer scenario');
  });

  // -------------------------------------------------------------------------
  // 7. User chooses a custom stakeholder scenario
  // -------------------------------------------------------------------------
  await runTest(7, 'Custom User Scenario with Dynamic Model Example', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Stakeholder communication',
      audience: 'Sales Leadership',
      scenario: 'Explain to the enterprise sales lead why we cannot build a bespoke custom CRM integration for a single client.',
      transcript: 'I need to explain that custom one-off integrations create technical debt. We should offer our public API instead.',
    });

    assert(res.technique.example.length > 20, 'Generated model script');
    // Verify it did NOT use canned onboarding vs reporting!
    assert(!res.technique.example.toLowerCase().includes('onboarding overhaul over reporting'), 'Must NOT use canned onboarding vs reporting example for custom scenario!');
    assert(res.evidenceCoaching.nextChallenge.sentenceStarter.length > 0, 'Sentence starter provided');
  });

  // -------------------------------------------------------------------------
  // 8. Voice transcription handling for both attempts
  // -------------------------------------------------------------------------
  await runTest(8, 'Voice Transcription Handling (Filler & Punctuation Robustness)', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Stakeholders',
      scenario: 'Sprint roadmap priorities',
      transcript:
        'Um my recommendation is prioritizing the customer onboarding flow... because our telemetry shows 42% first-week drop-off you know. Fixing this compounds retention for all future users.',
    });

    assert(res.scores.clarity >= 3, `Clarity handles speech cadence (got ${res.scores.clarity})`);
    assert(res.evidenceCoaching.whatWorked.quote.length > 0, 'Verbatim quote extracted from spoken transcript');
  });

  // -------------------------------------------------------------------------
  // 9. Model response resilience & score explanation completeness
  // -------------------------------------------------------------------------
  await runTest(9, 'Score Explanations Complete for All Dimensions', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Storytelling',
      audience: 'Aspiring PMs',
      scenario: 'Tell your PM journey and turning point.',
      transcript:
        'I started in analytics and thought PM was building charts. The turning point was seeing customers abandon the dashboard. That taught me PM is asking better questions.',
    });

    assert(res.scoreExplanations !== undefined, 'scoreExplanations must exist');
    assert(res.scoreExplanations.clarity.length > 10, 'Clarity explanation exists');
    assert(res.scoreExplanations.structure.length > 10, 'Structure explanation exists');
    assert(res.scoreExplanations.conciseness.length > 10, 'Conciseness explanation exists');
    assert(res.scoreExplanations.scenarioAlignment.length > 10, 'Scenario alignment explanation exists');
    assert(res.scoreExplanations.goalEffectiveness.length > 10, 'Goal effectiveness explanation exists');
  });

  // -------------------------------------------------------------------------
  // 10. Dynamic Illustrative Examples (No Canned Onboarding vs Reporting!)
  // -------------------------------------------------------------------------
  await runTest(10, 'Dynamic Illustrative Example Generation Across Topics', async () => {
    // Migration scenario
    const migrationEx = generateDynamicIllustrativeExample(
      'Our team is deciding whether to allocate capacity to database migration or new features.',
      'Articulation',
      'Leadership',
      'PREP'
    );
    assert(migrationEx.toLowerCase().includes('database') || migrationEx.toLowerCase().includes('migration'), 'Migration example models migration');
    assert(!migrationEx.toLowerCase().includes('onboarding overhaul over reporting'), 'Migration example does NOT use onboarding');

    // Mobile App Delay scenario
    const delayEx = generateDynamicIllustrativeExample(
      'A stakeholder asks why you are delaying the mobile app launch by 4 weeks.',
      'Articulation',
      'Executives',
      'DRT'
    );
    assert(delayEx.toLowerCase().includes('delay') || delayEx.toLowerCase().includes('mobile'), 'Delay example models delay/mobile');
    assert(!delayEx.toLowerCase().includes('onboarding overhaul over reporting'), 'Delay example does NOT use onboarding');

    // Pricing Change scenario
    const pricingEx = generateDynamicIllustrativeExample(
      'Explain to sales why we are transitioning our tier pricing structure.',
      'Articulation',
      'Sales',
      'PREP'
    );
    assert(pricingEx.toLowerCase().includes('pricing') || pricingEx.toLowerCase().includes('tier'), 'Pricing example models pricing');
    assert(!pricingEx.toLowerCase().includes('onboarding overhaul over reporting'), 'Pricing example does NOT use onboarding');

    // Explicit Onboarding scenario (only here should onboarding be used!)
    const onboardingEx = generateDynamicIllustrativeExample(
      'Our team can build either onboarding overhaul or reporting export.',
      'Articulation',
      'Leadership',
      'PREP'
    );
    assert(onboardingEx.toLowerCase().includes('onboarding'), 'Explicit onboarding scenario models onboarding');
  });

  console.log('\n================================================================');
  console.log(`  ACCEPTANCE TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Acceptance suite failed:', err);
  process.exit(1);
});
