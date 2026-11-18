# DESIGN.md — ET617 End-Sem · 23B0702

**Exam card: P5-T10-L6-C4**

| Field | Choice |
|---|---|
| P5 | Inquiry-based virtual laboratory |
| T10 | Projectile motion: angle and speed vs range (Cl. 11) |
| L6 | High-achieving learner preparing for an Olympiad, bored by routine practice |
| C4 | 10-minute sessions: one complete sequence in 10 minutes, stop and resume where you left off |
| ID | 23B0702 |

Live app: https://et617-23b0702.vercel.app · Footer on every screen: `ET617 · 23B0702 · P5-T10-L6-C4`

## 1. Educational problem

Strong Class 11 students can substitute into R = u² sin 2θ / g without thinking, and that fluency hides two gaps: they scale range linearly with speed, and they carry "45° is the best angle" to launches where it is false. Routine problem sheets never expose these gaps because the formula always gives the right number. This lab makes the learner commit to a prediction first, lets his own experiment confirm or refute it, and only then asks for an explanation. It is used at home on a laptop, in the 10 to 15 minute gaps between coaching problem sets, so one full sequence has to fit in 10 minutes and survive being interrupted.

### Learning outcomes

- **LO1** Predict how range changes when launch speed is scaled at a fixed angle, and explain it using the fact that both horizontal velocity and time in the air scale with u.
- **LO2** Compare ranges across angles for a level launch and an elevated launch, and explain why the best angle drops below 45° when launching from a height.
- **LO3** Design a controlled experiment (change one variable, at least 3 values) and use the data to revise a stated hypothesis.

## 2. Learner persona

**Aarav Kulkarni**, 16, Class 11, Pune. Preparing for NSEP / the physics olympiad.

- **Prior knowledge:** kinematics equations, resolving vectors, trig identities, basic differentiation. Can plug into R = u² sin 2θ / g in his sleep, which is exactly the problem: he has stopped asking where the formula comes from or when it stops being true.
- **Device, time, language:** his own laptop at home, 10 to 15 minute gaps between coaching problem sets, English.
- **Motivation:** problems that surprise him, and being proven wrong. Hates being spoon-fed and hates praise spam.
- **Misconception M1:** "Range is proportional to speed. Double the speed, double the range."
- **Misconception M2:** "45° is always the best angle" (over-generalises the level-ground result to launches from a height).

Because of this learner the sequence is **predict → experiment → explain**, never theory first. Text is short, direct and peer-level. No "great job", no emojis.

## 3. Content plan

Six tasks in four formats (numeric, experiment, choice + free text, hit-the-target).

| # | Stage | Format | Task | Model answer |
|---|---|---|---|---|
| 1 | Mission 1 | Numeric prediction | Level ground, 30°. At 20 m/s the range is 35.3 m. Double the speed to 40 m/s. Predict the range. | 141.2 m (±5%). 70.6 m is M1. |
| 2 | Mission 1 | Experiment | Record at least 3 trials at different speeds, angle held at 30°, including the 40 m/s case. | Controlled table. |
| 3 | Mission 1 | Choice + free text | From your table, range is proportional to u / u² / √u / can't tell. Explain why. | R ∝ u². Doubling u doubles horizontal velocity and doubles time in the air; range is their product, so 4×. |
| 4 | Mission 2 | Choice + numeric, then experiment | 12 m cliff, u = 10 m/s. Best angle is below / exactly / above 45°? Estimate it. Then test at least 4 angles and explain. | Below 45°, about 29° (26 to 32). 18.7 m vs 17.3 m at 45°. "Exactly 45" is M2. |
| 5 | Challenge | Numeric + yes/no | Level ground: 27° and which other angle give the same range? Does the pair still tie from the 12 m cliff? | 63°. No. |
| 6 | Challenge | Hit the target in the sim | Level ground, u = 30 m/s, target at 45.9 m ± 1.5 m. Find two different angles. | 15° and 75°. |

**Concept explanation** appears only after the learner has stated his own conclusion, and again in the debrief.

### Feedback rules

Every task has three written feedbacks: correct, the misconception that applies (M1 or M2), and other wrong.

- **Correct:** confirm in one line, then push further ("So it was 4×. Will tripling give 6× or 9×? Check with one shot.").
- **Misconception:** never show the answer or the formula. Show a **prediction gap card** (predicted vs measured, plus the ratio between his own trials) and one question that points at the flaw. He revises his hypothesis and may run more trials.
- **Hints:** three levels, each more specific, none gives the answer.
- **Model answer** appears only after a revised conclusion. If he is still wrong after two revisions, it is explained using his own table rows.

### Responses to experimental choices (rule-based)

- Two consecutive trials changed more than one variable → confound flag.
- Values bunched together (speeds within 5 m/s, angles within 10°) → spread too small.
- Only two points → "two points fit a line and a curve equally well".
- Mission 2, only 45° and above tried → "you have only looked on one side".

### Design challenge (P5): learning from an unsuccessful experiment without revealing the answer

A refuted prediction or a confounded set of trials is the unsuccessful experiment. The system responds with the learner's own data (gap card, ratios from his table), one pointing question, graded hints and the option to go back to the bench. The correct relationship is withheld until he states a revised conclusion.

## 4. Screens

1. **Home** — 10-minute plan with per-stage budget; resume card if a session exists.
2. **Predict** — scenario, numeric prediction, one-line hypothesis, confidence.
3. **Lab bench** — sliders, launch, SVG trajectory with ghost trails and a metre scale, readouts, trials table with a computed-ratio column, scatter of recorded trials.
4. **Interpret & revise** — prediction vs measurement, relationship, explanation, keep or revise hypothesis, coach question.
5. **Challenge** — transfer tasks 5 and 6.
6. **Debrief** — hypothesis history, misconception shown, hints, time, model explanations, extension.
7. **About** — identity token, card, persona, AI description, credits, log download.
8. **Top bar on every screen** — stepper with stage budgets, timer, "Pause & leave".

## 5. Constraint C4: 10-minute sessions

- Budget: Mission 1 about 4:00, Mission 2 about 3:30, Challenge about 2:00, Debrief about 0:30.
- Timer counts **active** time out of 10:00. It stops on "Pause & leave" and when the tab is hidden.
- Every state change autosaves to `localStorage` (`et617-23b0702-session-v1`). Reopening lands on a resume card and continues at the exact step with trials intact.
- Past 10:00 the learner is not locked out; the app shows it and offers to jump to the debrief.

## 6. AI feature: inquiry coach

- On Interpret, the app posts the learner's hypothesis, prediction, trials table and explanation to `/api/coach` (one Vercel serverless function calling `hyde/glm-5.3-flash` through the Hyde inference gateway, key in an environment variable).
- The model classifies the explanation and asks **one** Socratic question. It never calculates: all numbers come from `physics.ts`.
- Output is checked in code before the learner sees it: valid JSON, allowed verdict, length limit, and a leak filter that rejects anything stating the relationship, a formula or the best angle. The rule-based verdict wins if the AI disagrees.
- If the call fails, times out or fails a check, the written rule-based feedback is shown with the label "offline coach (recorded feedback)". The app works fully with AI turned off.

## 7. Evaluation data

An event log (prediction, trial, confound flag, hint, hypothesis revision, task answer, AI call, AI fallback, pause, resume) is kept in `localStorage` and can be downloaded as JSON from the About screen.

## 8. Stack

Vite + React + TypeScript + Tailwind CSS, single-page app, one serverless function. No login, no database.
