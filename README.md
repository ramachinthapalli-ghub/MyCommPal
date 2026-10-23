# MyCommPal · AI Communication Mentor for PMs

MyCommPal is a personal AI communication mentor (**Vira**) built for Product Managers. It provides a realistic environment to practice high-stakes stakeholder conversations, pinpoint articulation bottlenecks, learn actionable techniques, and measure improvement through structured before/after comparison.

## ✨ Features

- **Auth Options**:
  - **Email OTP**: Passwordless sign-in with 6-digit one-time code.
  - **Mobile OTP**: SMS-style login for quick mobile entry.
  - **Guest Mode**: 1-click instant access with profile & session persistence.
- **The Core Loop (4-Screen Flow)**:
  1. **01 / Your Goal**: Select communication focus (Articulation, Storytelling, Presentations) and target audience (Execs, Cross-functional, Peers).
  2. **02 / Assess Me**: Realistic PM scenarios (or bring your own real situation) with live voice recording or typed response.
  3. **03 / Personal Plan**: Calibrated rubric scoring (Clarity, Structure, Conciseness 1–5), verbatim transcript quotes, focus gap diagnosis, recommended technique (e.g., PREP, BLUF), and customizable practice schedule.
  4. **04 / Practice With Vira**: Guided retry exercise, before/after score comparison, verdict, meaning-preservation check, and copyable summary.
- **Data Persistence**:
  - **Supabase (PostgreSQL)** database schema storing user profiles, practice attempts, baseline/retry scores, and mentor feedback.
  - History view allowing users to review past practice sessions anytime.
  - Smart local fallback store so the app runs immediately even before cloud credentials are provided.
- **AI Engine**:
  - Calibrated Anthropic Claude 3.5 Sonnet integration (`/api/mentor`).
  - Built-in heuristic fallback evaluator matching the calibrated rubric when `ANTHROPIC_API_KEY` is not yet configured.

---

## 🚀 Getting Started

### 1. Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:
```env
# Supabase (PostgreSQL Database & Auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic Claude API (For Vira Mentor Live Evaluation)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Development OTP convenience (auto-fills test code 123456 or generated code)
ENABLE_DEV_OTP_AUTOFILL=true
```

### 2. Database Setup (Supabase)

1. Create a free project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/schema.sql` from this repository, paste its contents into the SQL Editor, and click **Run**.
4. Retrieve your `Project URL`, `anon key`, and `service_role key` from **Project Settings → API** and add them to your `.env.local` or Vercel environment variables.

### 3. Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ☁️ Deploying to Vercel

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In [Vercel](https://vercel.com), click **Add New Project** and import your repository.
3. In the project configuration, add your Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
4. Click **Deploy**. Vercel will automatically build and host the application.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude 3.5 Sonnet (`/api/mentor`)
- **Styling**: Native CSS tokens & DM Sans / Manrope typography
- **Hosting**: Vercel
