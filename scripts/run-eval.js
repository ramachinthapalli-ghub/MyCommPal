/**
 * MyCommPal — Comprehensive Regression Evaluation Suite (12 Test Cases)
 * Validates Vira's Multi-Layer Evaluation & Evidence-Based Coaching Intelligence
 */

const {
  fallbackAssess,
  fallbackCompare,
  runMentorAssess,
  runMentorCompare,
  analyzeScenarioRequirements,
  verifyAndSanitizeQuote,
} = require('../dist_test/mentor-engine');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runTestCase(testNum, name, testFn) {
  totalTests++;
  process.stdout.write(`\n[Test Case ${testNum}/12] ${name} ... `);
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
  console.log('  MYCOMMPAL EVALUATION SUITE — VIRA AI COACHING INTELLIGENCE   ');
  console.log('================================================================');

  // -------------------------------------------------------------------------
  // 1. Strong Articulation
  // -------------------------------------------------------------------------
  await runTestCase(1, 'Strong Articulation', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Cross-functional stakeholders',
      scenario: 'Our team can build either onboarding overhaul or analytics reporting. Which would you prioritize?',
      transcript:
        'My recommendation is prioritizing the onboarding overhaul over reporting. Our data shows 42% first-week drop-off, which caps overall growth. Fixing activation compounds retention for all future users. While reporting is requested by three enterprise leads, stabilizing access protects our core business metrics.',
    });

    assert(res.scores.clarity >= 4, `Clarity must be >= 4 (got ${res.scores.clarity})`);
    assert(res.scores.structure >= 4, `Structure must be >= 4 (got ${res.scores.structure})`);
    assert(res.goalEffectiveness.score >= 4, `Goal score must be >= 4 (got ${res.goalEffectiveness.score})`);
    assert(res.scenarioAlignment.score >= 4, `Scenario alignment must be >= 4 (got ${res.scenarioAlignment.score})`);
    assert(res.evidenceCoaching.whatWorked.quote.length > 0, 'Quote must not be empty');
  });

  // -------------------------------------------------------------------------
  // 2. Weak Articulation
  // -------------------------------------------------------------------------
  await runTestCase(2, 'Weak Articulation', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Engineering and design leads',
      scenario: 'Which feature should we build next quarter: customer onboarding or analytics export?',
      transcript:
        'Uh, so maybe we could look at onboarding, but then again reporting is also requested by some people, so I am not 100% sure. We might want to see what happens, or do a bit of both if we have time, though people have different opinions.',
    });

    assert(res.scores.clarity <= 2, `Clarity must be <= 2 (got ${res.scores.clarity})`);
    assert(res.goalEffectiveness.score <= 2, `Goal score must be <= 2 (got ${res.goalEffectiveness.score})`);
    assert(res.focus === 'clarity' || res.focus === 'structure', `Focus must be clarity or structure (got ${res.focus})`);
    assert(res.evidenceCoaching.whatNeedsWork.summary.length > 0, 'Must have whatNeedsWork summary');
  });

  // -------------------------------------------------------------------------
  // 3. Strong Storytelling
  // -------------------------------------------------------------------------
  await runTestCase(3, 'Strong Storytelling', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Storytelling',
      audience: 'Aspiring Product Managers',
      scenario: 'Tell the story of a product problem that failed and what turning point shaped your philosophy.',
      transcript:
        'When I launched my first feature, I assumed users would read our detailed tooltips. Instead, 80% bounced immediately. The turning point came when I watched an actual customer try to use the screen in silence—she was overwhelmed by our jargon. That day, I realized product management is not about explaining your solution, but eliminating the friction so users never need an explanation.',
    });

    assert(res.scores.clarity >= 4, `Clarity must be >= 4 (got ${res.scores.clarity})`);
    assert(res.goalEffectiveness.score >= 4, `Storytelling goal must be >= 4 (got ${res.goalEffectiveness.score})`);
    assert(res.goalEffectiveness.goal.includes('Story'), `Goal must reflect storytelling`);
    assert(res.evidenceCoaching.technique.name.includes('HJR') || res.evidenceCoaching.technique.name.includes('Story'), 'Recommends story technique');
  });

  // -------------------------------------------------------------------------
  // 4. Storytelling without a Turning Point
  // -------------------------------------------------------------------------
  await runTestCase(4, 'Storytelling Without a Turning Point', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Storytelling',
      audience: 'Aspiring Product Managers',
      scenario: 'Tell the story of your product journey and what turning point shaped your philosophy.',
      transcript:
        'I started in customer support in 2018. Then in 2020 I moved to business analysis. Then in 2022 I got promoted to associate PM. I worked on checkout systems and roadmap tickets every sprint. Now I am a senior PM leading our growth squad.',
    });

    assert(res.goalEffectiveness.score <= 3, `Goal score must be <= 3 (got ${res.goalEffectiveness.score})`);
    const turningPointResult = res.goalEffectiveness.criteriaResults?.find(c => c.criterion.toLowerCase().includes('turning'));
    assert(turningPointResult?.status === 'missed' || turningPointResult?.status === 'partially_met', 'Turning point must be flagged as missed/partially met');
    assert(res.evidenceCoaching.whatNeedsWork.summary.toLowerCase().includes('turning') || res.evidenceCoaching.whatNeedsWork.summary.toLowerCase().includes('struggle') || res.evidenceCoaching.whatNeedsWork.audienceImpact.length > 0, 'Flagged missing turning point in feedback');
  });

  // -------------------------------------------------------------------------
  // 5. Polished but Off-Topic Response
  // -------------------------------------------------------------------------
  await runTestCase(5, 'Polished but Off-Topic Response', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'Executives',
      scenario: 'A stakeholder asks why you are delaying the mobile app launch by 4 weeks. How do you respond?',
      transcript:
        'Machine learning architectures are revolutionizing modern product design. By leveraging vector embeddings and transformer attention heads, our search engine achieves semantic recall across 10 million documents in sub-50 milliseconds.',
    });

    assert(res.scenarioAlignment.score <= 2, `Scenario alignment must be <= 2 (got ${res.scenarioAlignment.score})`);
    assert(res.scenarioAlignment.rationale.toLowerCase().includes('not address') || res.scenarioAlignment.rationale.toLowerCase().includes('off-topic') || res.scenarioAlignment.rationale.toLowerCase().includes('dilemma'), 'Rationale must flag off-topic nature');
  });

  // -------------------------------------------------------------------------
  // 6. Brief but Incomplete Response
  // -------------------------------------------------------------------------
  await runTestCase(6, 'Brief but Incomplete Response', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Leadership communication',
      audience: 'Executive Team',
      scenario: 'Should we expand into the European market this year or double down on our domestic retention?',
      transcript: 'We should focus on retention because it makes more sense right now.',
    });

    assert(res.scores.conciseness <= 3, `Conciseness must NOT be 5 for sparse response (got ${res.scores.conciseness})`);
    assert(res.scenarioAlignment.score <= 3, `Scenario alignment must be <= 3 (got ${res.scenarioAlignment.score})`);
    assert(res.evidenceCoaching.whatNeedsWork.missingElements !== undefined, 'Missing elements should be declared');
  });

  // -------------------------------------------------------------------------
  // 7. Long but Well-Structured Response
  // -------------------------------------------------------------------------
  await runTestCase(7, 'Long but Well-Structured Response', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Leadership communication',
      audience: 'Executive Team',
      scenario: 'Present our H2 platform migration strategy and trade-offs.',
      transcript:
        'My recommendation to the executive committee is that we commit 40% of our engineering capacity to the database migration in H2. First, the business rationale: our latency has degraded by 300ms during peak hours, threatening our SLA with Tier 1 customers. Second, the trade-off: this means delaying the automated billing portal to Q1 next year, which finance has agreed to mitigate with manual invoicing. Third, our mitigation: we have established automated rollback criteria and will pilot the migration with 5% of non-critical traffic in August before full cutover.',
    });

    assert(res.scores.clarity >= 4, `Clarity must be >= 4 (got ${res.scores.clarity})`);
    assert(res.scores.structure >= 4, `Structure must be >= 4 (got ${res.scores.structure})`);
    assert(res.scores.conciseness >= 3, `Conciseness must NOT be penalized below 3 just for length (got ${res.scores.conciseness})`);
  });

  // -------------------------------------------------------------------------
  // 8. Improved Retry
  // -------------------------------------------------------------------------
  await runTestCase(8, 'Improved Retry', async () => {
    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Stakeholders',
      scenario: 'Onboarding vs reporting priority',
      firstTranscript: 'Maybe we can fix onboarding or something else, not really sure yet.',
      secondTranscript:
        'My recommendation is prioritizing onboarding over reporting because our first-week drop-off is 42%. By fixing onboarding, we unlock higher retention for all future users.',
      focus: 'clarity',
      firstScores: { clarity: 2, structure: 2, conciseness: 2 },
    });

    assert(comp.verdict === 'improved', `Verdict must be 'improved' (got ${comp.verdict})`);
    assert(comp.focusAfter > comp.focusBefore, `Focus after (${comp.focusAfter}) must be > focus before (${comp.focusBefore})`);
    assert(comp.meaningPreserved === true, 'Meaning must be preserved');
  });

  // -------------------------------------------------------------------------
  // 9. Declined Retry
  // -------------------------------------------------------------------------
  await runTestCase(9, 'Declined Retry', async () => {
    const comp = fallbackCompare({
      mode: 'compare',
      goal: 'Articulation',
      audience: 'Stakeholders',
      scenario: 'Onboarding vs reporting priority',
      firstTranscript: 'My recommendation is prioritizing onboarding over reporting because first-week drop-off is 42%.',
      secondTranscript:
        'Well, like I was saying, there are so many things going on and someone told me about another project so maybe we should not do onboarding anymore or maybe whatever the team feels like doing.',
      focus: 'clarity',
      firstScores: { clarity: 4, structure: 4, conciseness: 4 },
    });

    assert(comp.verdict === 'declined' || comp.verdict === 'less clear', `Verdict must be declined or less clear (got ${comp.verdict})`);
    assert(comp.secondScores.clarity <= 3, `Second clarity must decline or stay low (got ${comp.secondScores.clarity})`);
  });

  // -------------------------------------------------------------------------
  // 10. Critical Section 7 Regression Test (Mixed Improvements & Regressions)
  // -------------------------------------------------------------------------
  await runTestCase(10, 'Section 7 Critical Regression Test (Swimming Pool vs PM Principles)', async () => {
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

    // 1. Clarity improved
    assert(comp.dimensions.clarity.classification === 'improved', 'Clarity must be classified as improved');
    // 2. Conciseness improved
    assert(comp.dimensions.conciseness.classification === 'improved', 'Conciseness must be classified as improved');
    // 3. Storytelling (Goal) declined
    assert(comp.dimensions.goalEffectiveness.classification === 'declined', 'Storytelling goal must be classified as declined');
    // 4. Trade-off explicitly recognized
    assert(comp.tradeOffAnalysis && comp.tradeOffAnalysis.includes('Trade-off'), 'Trade-off analysis must be present');
    assert(comp.tradeOffAnalysis.toLowerCase().includes('storytelling'), 'Trade-off must mention storytelling');
    // 5. Next step guides merging baseline story with retry principles
    assert(comp.stillNeedsWork.toLowerCase().includes('swimming') || comp.nextStep.toLowerCase().includes('swimming') || comp.nextStep.toLowerCase().includes('rehearsal'), 'Feedback mentions swimming pool story');
  });

  // -------------------------------------------------------------------------
  // 11. Response with Factual or Domain-Knowledge Gaps
  // -------------------------------------------------------------------------
  await runTestCase(11, 'Response with Factual or Domain-Knowledge Gaps', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Articulation',
      audience: 'VP of Product',
      scenario: 'How do we validate whether our new self-serve tier is acquiring the right users?',
      transcript:
        'We can know if the self-serve tier works by looking at our Net Promoter Score and checking how many code commits the engineering team pushed to staging last week.',
    });

    assert(res.scenarioAlignment.score <= 3, `Scenario alignment must be <= 3 for invalid validation metrics (got ${res.scenarioAlignment.score})`);
    assert(res.evidenceCoaching.whatNeedsWork.audienceImpact.length > 0, 'Audience impact must be explained');
  });

  // -------------------------------------------------------------------------
  // 12. User-Defined Scenario with Incomplete Context
  // -------------------------------------------------------------------------
  await runTestCase(12, 'User-Defined Scenario with Incomplete Context', async () => {
    const res = fallbackAssess({
      mode: 'assess',
      goal: 'Stakeholder communication',
      audience: 'Cross-functional stakeholders',
      scenario: 'Talk to my manager.',
      transcript:
        'I need to discuss our timeline for the upcoming feature release and make sure we have enough QA resources allocated before our Monday launch.',
    });

    assert(res.scores.clarity >= 1 && res.scores.clarity <= 5, 'Clarity score must be in range 1-5');
    assert(res.goalEffectiveness.score >= 1 && res.goalEffectiveness.score <= 5, 'Goal score must be in range 1-5');
    assert(res.evidenceCoaching.nextChallenge.sentenceStarter.length > 0, 'Sentence starter provided');
  });

  console.log('\n================================================================');
  console.log(`  EVALUATION SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
