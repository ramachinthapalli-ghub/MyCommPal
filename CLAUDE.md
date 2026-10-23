# CLAUDE.md — MyCommPal

## What this is
MyCommPal is an AI communication mentor for product managers. The mentor persona is **Vira**. Core loop: baseline answer → one focus skill → guided retry → before/after comparison. See `SPEC.md` for the full spec and API contract.

## Stack
- Next.js (App Router) deployed on Vercel
- Claude API called only from server route `/api/mentor`
- No database; session state in localStorage (`mycommpal-session`)

## Source of truth
- `SPEC.md` defines scope, API contract and mentor rules. Follow it; if it needs to change, update it in the same commit.
- `prototype/MyCommPal_Vira_Clickable_Prototype.html` is the visual reference. Keep the look and feel (colors, fonts, layout, copy tone). Do not redesign.

## Working rules
1. Small commits. Commit only when the app runs and the slice works. Message format: `feat: …`, `fix: …`, `docs: …`.
2. Build in the order listed in SPEC section 14. Do one slice per session; stop and summarize after each.
3. Never put `ANTHROPIC_API_KEY` or any secret in client code, the repo, or logs. Use `.env.local` (gitignored) and Vercel env vars. Provide `.env.example`.
4. Never invent data. Mentor feedback must come only from the user's transcript. No fake metrics, testimonials or user counts in the UI.
5. Be honest in the UI: scores are practice signals, not a validated assessment. Keep that disclaimer visible.
6. Privacy: no audio is uploaded or stored. Only text transcripts go to the API. Keep the "local-only session" claim true or reword it.
7. Validate everything at the API boundary: transcript length (35–4,000 chars), request shape, and model JSON output. Return friendly errors; never crash the UI.
8. Keep the typed-input path fully working. Voice input is optional and must degrade gracefully where unsupported.
9. Add a simple per-IP rate limit to `/api/mentor`.
10. No new dependencies unless needed; mention any you add.

## Mentor prompt rules (summary)
Vira is warm, direct and calibrated. One focus skill only. Quote the user verbatim (under 25 words). Technique examples are illustrative, never a rewrite of the user's answer. JSON only, matching the schema in SPEC section 10.

## Commands
- `npm run dev` — local dev server
- `npm run build` — production build (must pass before pushing to main)
- `npm run lint` — lint

## Definition of done for each slice
- App builds and runs locally.
- The slice's behavior verified manually in the browser (happy path plus one error path).
- Committed and pushed; Vercel preview deploys successfully.

## Out of scope (do not build)
Accounts, payments, database, audio storage, team dashboards, multi-language.
