# et617-endsem-23b0702

**Range Lab** — a 10-minute inquiry lab on projectile range. ET 617 End-Semester Examination, 18 Nov 2026.

- Roll no: **23B0702** · Exam card: **P5-T10-L6-C4**
- Live app: https://et617-23b0702.vercel.app
- Design: [DESIGN.md](DESIGN.md) · Report source: [report/report.html](report/report.html)

| Card field | Choice |
|---|---|
| P5 | Inquiry-based virtual laboratory |
| T10 | Projectile motion: angle and speed vs range (Cl. 11) |
| L6 | High-achieving learner preparing for an Olympiad, bored by routine practice |
| C4 | 10-minute sessions, stop and resume |

## Where things are

| File | What it holds |
|---|---|
| `src/physics.ts` | All the numbers: range, time of flight, max height, position |
| `src/content.ts` | Scenarios, tasks, model answers, hints, written feedback |
| `src/rules.ts` | Decision rules: prediction and conclusion verdicts, experiment notes, gap card |
| `src/store.ts` | The single session object, reducer, localStorage save/resume, event log |
| `src/Lab.tsx` | Lab bench: sliders, trajectory, trials table, scatter |
| `src/screens.tsx` | Home, Predict, Lab screen, Interpret, Challenge, Debrief, About |
| `src/App.tsx` | Top bar (stepper, timer, Pause & leave), footer, screen switch |
| `src/coach.ts` | Client call to the AI coach with a 6 s limit and fallback |
| `api/coach.ts` | Serverless function: prompt, model call, output checks, leak filter |

## Run locally

```bash
npm install
npm run dev
```

The AI coach needs `HYDE_API_KEY` (a Vercel environment variable; never committed). Without it the app uses the recorded feedback and labels it "offline coach".

Stack: Vite, React, TypeScript, Tailwind CSS. No UI library, no database.
