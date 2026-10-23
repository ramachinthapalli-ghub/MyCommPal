# MyCommPal — SPEC (Buildathon MVP)

**Positioning:** MyCommPal is a personal AI communication **mentor** for product managers (the mentor persona is **Vira**), not a coach. Use "mentor" in all UI copy, docs and code naming.

Source: Assignment 4 (Buildathon) product doc. UX reference: https://ramachinthapalli-ghub.github.io/MyCommPal-UX-html/

## 1. Problem
Product managers rarely have direct authority over the people they need to influence, so their ideas travel only as far as they can explain them. Many PMs understand the problem, know their customers and have the data, yet struggle to structure and articulate their thoughts under pressure: unexpected stakeholder questions, challenging stakeholders, time-constrained presentations.

**P0 problem statement:** Product Managers struggle to structure and articulate their ideas and decisions clearly, especially during presentations and unexpected stakeholder conversations.

## 2. Hypotheses
**Problem hypothesis:** Some PMs struggle to articulate ideas not because they lack product knowledge, but because they find it hard to organize and express thoughts under pressure. Limited realistic practice and a lack of timely, honest, constructive feedback contribute to the gap.

**Solution hypothesis:** If PMs get a safe, AI-powered place to practice realistic stakeholder conversations, see where their communication breaks down, and receive targeted guidance, they will express ideas more clearly, with better structure and conciseness.

**Differentiation hypothesis (to be tested, not assumed):** AI communication practice is a crowded space (general-purpose AI, AI speaking tools, stakeholder roleplay tools, PM-specific tools). MyCommPal is not claiming a unique capability. We are testing whether an experience that does these five things delivers extra value:
1. Identifies the user's most significant articulation weakness from their actual response.
2. Gives specific feedback on clarity, structure or conciseness.
3. Teaches one relevant technique.
4. Allows immediate practice and retry.
5. Shows improvement using a consistent assessment.

## 3. Evidence so far
- 12 research respondents (PMs, a PO, an APM, an aspiring PM, a BA, a UX designer) answered three questions: a recent communication struggle, how they prepared and currently improve, and the last feedback they received.
- 8 of 12 described difficulty articulating ideas they already understood (themes with 1 respondent each: forgetting content, fear of judgement, anticipating communication modes).
- Recurring root causes: more focus on what to present than how, little realistic practice, no honest feedback channel.
- Do not store respondent names or verbatim quotes in this repo.

## 4. Target user and Job to Be Done
- **Primary persona (P0):** Working Product Manager (PM, Senior PM, Lead PM).
- **Situation:** presenting an idea, explaining a decision, or responding to an unexpected stakeholder question.
- **Struggle:** knows the subject but has trouble organizing and expressing thoughts clearly.
- **Current alternatives:** notes, rehearsing with colleagues, AI prompts, communication videos.
- **Desired outcome:** communicate ideas and decisions clearly, concisely and with confidence.
- **JTBD:** "When I need to explain a product idea or respond to an unexpected stakeholder question, help me organize and communicate my thoughts clearly so that my audience understands my message."
- Later segments (do not build for now): aspiring/early-career PMs (P1), cross-functional roles (P2), people managers (P3), students and general professionals (future).

## 5. Core loop (the only thing that must work)
Set goal → Respond to situation → Identify gap → Learn technique → Practice again → Review progress.

Four screens, as in the clickable prototype:

| Screen | Purpose | Key capabilities |
|---|---|---|
| 1. My Goal | Understand what the user wants to work on | Select a PM communication challenge and available practice time |
| 2. Assess Me | Identify articulation weaknesses | Realistic PM scenario (Vira-chosen or the user's own), text or speech response, AI assessment of clarity, structure and conciseness |
| 3. My Personal Plan | Recommend targeted improvement | Specific feedback, one relevant technique, suggested short practice sessions |
| 4. Practice With Vira | Help the user improve | Guided exercise, retry, comparison of first and second response |

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR01 | User selects a PM communication goal | Must |
| FR02 | Present a realistic PM stakeholder scenario, or let the PM choose their own | Must |
| FR03 | Capture the user's response through text input | Must |
| FR04 | Assess clarity, structure and conciseness using defined criteria | Must |
| FR05 | Highlight specific parts of the response that could be improved | Must |
| FR06 | Recommend one relevant communication technique based on the assessment | Must |
| FR07 | Let the user retry the same challenge | Must |
| FR08 | Compare both attempts; explain what improved and what still needs work | Must |
| FR09 | Browser-based speech-to-text input | Should |
| FR10 | Personalized practice schedule from skill gaps and available time | Should |
| FR11 | Save progress across multiple sessions | Later |
| FR12 | Real-time interruptible voice conversations | Later |

## 7. Out of scope for the MVP
General public-speaking and storytelling courses; video or body-language analysis; real-time voice interruption and emotional analysis; presentation-anxiety coaching; enterprise integrations; long-term analytics and gamification; accounts, payments, database, audio storage.

Note: the prototype includes Storytelling and Presentations goal options. Keep them as selectable goals only if scenarios and rubric work for them; the P0 focus is Articulation.

## 8. Assessment rubric
Vira rates each dimension 1-5.

| Dimension | Criteria |
|---|---|
| Clarity | Is the main message understandable? Can the listener identify the intended recommendation or idea? |
| Structure | Are ideas in a logical order, with supporting reasoning? |
| Conciseness | Does the response give the important information without unnecessary detail or repetition? |

Scoring anchors: **1 Poor** (unclear, disorganized, hard to follow), **3 Adequate** (main idea understandable but could land better), **5 Strong** (clear, logically structured, concise, important information retained). 2 and 4 are intermediate.

- The **focus skill** is the lowest-scoring dimension. Ties resolve in this order: structure, clarity, conciseness.
- The primary improvement measure uses the user's **focus dimension**, not only the average.
- Vira's scores are coaching-style signals, not a validated measure and not independent proof of improvement. Say so in the UI.

## 9. Architecture
- Next.js (App Router) on Vercel.
- Client: ported prototype UI (state machine: goal → assess → plan → practice).
- Server: `POST /api/mentor` calls the Claude API. Key only in Vercel env var `ANTHROPIC_API_KEY`.
- No database. Hold the in-progress session in React state and mirror it to localStorage (`mycommpal-session`) so a refresh does not lose it. Cross-session progress history is FR11 (Later).
- Only text transcripts go to the API. No audio is uploaded or stored.

## 10. API contract

### `POST /api/mentor` — mode `assess`
Request:
```json
{
  "mode": "assess",
  "goal": "Articulation",
  "audience": "Leadership and executives",
  "scenario": "string",
  "transcript": "string"
}
```
Response:
```json
{
  "scores": { "clarity": 1, "structure": 1, "conciseness": 1 },
  "strongest": "clarity | structure | conciseness",
  "focus": "clarity | structure | conciseness",
  "focusExplanation": "string",
  "highlights": [
    { "quote": "verbatim phrase (<=25 words) from the transcript", "issue": "string", "suggestion": "string" }
  ],
  "technique": { "name": "string", "steps": ["string"], "example": "string (illustrative, not a rewrite of the user's answer)" },
  "exercise": "string"
}
```
`highlights` has 1-3 items and satisfies FR05.

### `POST /api/mentor` — mode `compare`
Request adds `firstTranscript`, `secondTranscript`, `focus`, `firstScores`.
Response:
```json
{
  "secondScores": { "clarity": 1, "structure": 1, "conciseness": 1 },
  "focusBefore": 1,
  "focusAfter": 1,
  "verdict": "improved | similar | less clear",
  "meaningPreserved": true,
  "meaningNote": "string (flag any dropped or distorted facts)",
  "whatImproved": "string citing both attempts",
  "stillNeedsWork": "string",
  "nextStep": "string"
}
```

### Validation and limits
- Transcript min 35 chars, max 4,000 chars.
- Validate model JSON against the schema; on failure return a friendly error so the user can retry.
- Basic per-IP rate limit on `/api/mentor`.

## 11. Mentor prompt rules (system prompt for `/api/mentor`)
- You are Vira, a warm, direct communication mentor for product managers.
- Evaluate only what is in the transcript. Never invent facts, metrics or events the user did not say.
- Score clarity, structure and conciseness 1-5 using the anchors in section 8. Be calibrated and do not inflate; scores of 5 should be rare.
- Pick exactly ONE focus skill and ONE technique.
- Quote the user's own words verbatim (under 25 words) in highlights.
- Technique examples are clearly illustrative and never a rewrite of the user's full answer.
- In compare mode, check that the second response keeps the original message and important facts; report any distortion.
- Return JSON only, matching the schema.

## 12. MVP success metrics and validation plan
**Objective:** validate whether personalized assessment, specific feedback and guided practice help PMs articulate ideas and decisions more clearly.

**Method:** moderated usability and effectiveness test with 5 PMs (mix of research participants and new people). Scenario example: "Your VP unexpectedly asks why you prioritized Feature A over Feature B. Explain your decision, reasoning and expected business impact in 90 seconds."

| Metric | Measurement | Initial target |
|---|---|---|
| Articulation improvement (primary) | First vs second response on the focus dimension, same rubric | At least 3 of 5 users improve by 1 point or more (1-5 scale) without losing important meaning |
| Feedback usefulness | User names their key weakness and the action they would take | At least 4 of 5 can name a specific, relevant improvement |
| Practice completion | Users who finish assess → feedback → retry | At least 4 of 5 |
| Perceived value | Usefulness rating 1-5 | At least 4 of 5 rate 4 or higher |
| Willingness to reuse | Would use it before a real upcoming conversation, with a concrete use case | At least 3 of 5 |

**Test steps:** (1) baseline response, (2) assessment, (3) one technique, (4) retry, (5) user feedback, (6) optional transfer test with a different but comparable question and no further guidance.

**Post-test questions:** What did Vira identify that you had not noticed? Was the feedback specific enough to act on? Did the technique help structure your second response? Would you use this before a real stakeholder conversation, and why or why not? How does it compare with how you prepare today?

**Competitive comparison (optional):** have users attempt a comparable exercise in ChatGPT with a standard prompt and compare ease of starting, specificity of feedback, ease of applying it, and preference.

**Measurement without a database:**
- Add a short feedback panel after the comparison screen (usefulness 1-5, "what would you improve", "would you use this again, for what").
- Provide a "copy session summary" action containing both transcripts, scores and feedback answers, so the moderator can collect results manually.
- Where possible, have an independent reviewer score the two responses blind. Do not present Vira's scores as independent proof.

## 13. Risks and mitigations
| Risk | Mitigation |
|---|---|
| AI scores inconsistent or too positive | Defined rubric, calibrated prompt, independent human review |
| Improvement is just repetition of the same question | Optional transfer test with a different scenario |
| Guidance improves wording but distorts the message | `meaningPreserved` check in compare mode |
| 5 participants are not representative | Treat results as directional |
| Users give polite positive feedback | Prioritize observed behavior and specific examples |
| Speech transcription errors | Always show the transcript and let the user edit it; typed input is the primary path |
| API latency or failure during demos | Keep the original prototype deployed as a fallback |
| Cost abuse on a public link | Transcript cap and rate limit |

## 14. Build order (commit after each working slice)
1. Deploy the unmodified prototype to Vercel (fallback demo).
2. Scaffold Next.js; port the UI unchanged except the rubric label change below.
3. Update the prototype's scoring labels from "Supporting reasoning" to **Conciseness** to match section 8.
4. Add `/api/mentor` `assess` and wire the baseline step (scores, focus, highlights).
5. Replace canned technique and exercise with API output.
6. Add `compare` mode and the results screen, including `meaningPreserved`.
7. Practice plan (FR10) from focus skill, minutes and frequency.
8. Feedback panel, copy-session-summary, error and loading states, rate limit.
9. Run the validation test with survey-derived scenarios; tune the prompt.

## 15. Open questions (from the product doc)
- Does targeted AI guidance improve articulation beyond what users get from ChatGPT or existing tools?
- Do PMs perceive value in a dedicated articulation tool, and will they return to practice?
- Would individual PMs or their employers pay? (Research after value is validated.)

## 16. Prototype gaps to close
- Prototype scoring is keyword-based and the demo says so; replace with LLM assessment.
- Prototype rubric uses "Supporting reasoning"; the product doc uses **Conciseness**.
- Prototype scenario says 60 seconds; the product doc's example uses 90 seconds. Pick one and keep UI copy and prompt consistent.
- Prototype footer claims "No recordings are uploaded or stored" and "Local-only session". Once transcripts go to the API, reword to "No audio is stored; your text is sent securely for feedback."
