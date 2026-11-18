# Manual test list · Range Lab

Live app: https://et617-23b0702.vercel.app · Start each path from a clean session (About → Clear saved session, or Start over).

## A. Correct path (viva walkthrough, part 1)

| # | Do this | Expect |
|---|---|---|
| A1 | Home → **Start the 10 minutes** | Mission 1 · Predict. Timer starts counting. |
| A2 | Prediction `141`, hypothesis `Range goes as u squared because both horizontal velocity and flight time double`, confidence **high** → Lock it in | Lab bench opens. No verdict shown. Chip "Your prediction 141 m locked in". |
| A3 | Speed 20 → Launch → Record. Speed 30 → Launch → Record. Speed 40 → Launch → Record | Table rows 35.3, 79.5, 141.2 m. Both checklist chips turn green. No method notes. |
| A4 | Add a column → `R ÷ u²` | New column reads about 0.0883 in every row. |
| A5 | **I have enough data. Interpret** | Title "Your prediction held". Gap card: predicted 141.0 m, measured 141.2 m, "u × 2.0 → R × 4.0", tag **Prediction confirmed**. |
| A6 | Choose **u²**, explain `Doubling u doubles the horizontal velocity and also doubles the time in the air, and range is the product of the two.` → Submit | Tag **Holds**. One follow-up question (AI coach, or "So it was 4×. Will tripling the speed give 6× or 9×?" if offline). **Model explanation and the area figure appear immediately.** |

## B. Misconception path M1 (viva walkthrough, part 2)

| # | Do this | Expect |
|---|---|---|
| B1 | Start. Prediction `70.6`, hypothesis `Range is proportional to speed, so doubling the speed doubles the range`, confidence **high** | Lab bench, no verdict. |
| B2 | Record 20 m/s at 30°, then 30 m/s at 30° | After two rows, a margin note: "Two points fit a line and a curve equally well…" |
| B3 | Set speed 45 **and** angle 50 → Launch → Record | Note: "Trials #2 and #3: you changed speed and angle together. Which one moved the range? You can't tell from this pair." Row 3 is struck through and does not count. |
| B4 | Set speed 40, angle 30 → Launch → Record → Interpret | Title "Your prediction did not survive". Gap card: **70.6 m** vs **141.2 m**, "u × 2.0 → R × 4.0", bars, tag **Prediction refuted**, "You were sure, which makes this worth your time…" |
| B5 | Choose **u**, explain `A faster ball just goes further, so range follows the speed.` → Submit | Tag **Refuted by your data**. One question. **No model explanation, no formula, no "u²" anywhere.** "Attempt 1 of 3 used". |
| B6 | Give me a hint (up to 3 times) | Three hints, each more specific. None states the answer. |
| B7 | Choose **u²**, explain with both horizontal velocity and time, rewrite the hypothesis → Submit revised conclusion | Tag **Holds**, model explanation appears. Debrief later shows hypothesis v1 struck through and v2. |

## C. Misconception path M2

| # | Do this | Expect |
|---|---|---|
| C1 | Mission 2 predict: **exactly 45°** (number locks to 45), any hypothesis, any confidence | Lab bench with a 12 m cliff, height locked. |
| C2 | Record 45°, 55°, 65°, 75° at 10 m/s | 45° gives 17.3 m. Note: "You have only tried 45° and above. That is one side of the question." |
| C3 | Interpret → choose **exactly 45°** → Submit | Tag **Refuted by your data**; question about what the ball is still doing when it passes launch height. No best angle shown. |
| C4 | Back to the bench → record 35°, 29°, 20° | 29° gives 18.7 m (longer than 45°). |
| C5 | Back to your conclusion → **below 45°**, explain with forward motion during the extra fall → Submit | **Holds**; model explanation appears. |
| C6 | Alternative correct prediction: **below 45°** with estimate `29` | Classified correct (26 to 32 accepted). |

## D. Challenge

| # | Do this | Expect |
|---|---|---|
| D1 | Task 5: enter `63` → Check | "63°. The pair adds up to 90°…" |
| D2 | Task 5: enter `54` instead | "Not a tie. Launch 27° and note R…"; after two wrong tries the model answer shows. |
| D3 | Follow-up: **yes** | "You carried a level-ground rule up a cliff…" |
| D4 | Follow-up: **no** | "No. From 12 m the 27° shot goes further (93.0 m against 79.9 m)…" |
| D5 | Task 6: launch 40° | Lands at 90.3 m: "Last shot landed 44.4 m long." |
| D6 | Task 6: record 15°, then 75° | Target flashes "hit" each time; Hits "15° and 75°"; Debrief button enables. |

## E. Constraint C4: 10-minute sessions

| # | Do this | Expect |
|---|---|---|
| E1 | Mid-experiment, press **Pause & leave** | Home shows "You stopped at Mission 1 · Experiment, N trials recorded, m:ss used". Timer frozen. |
| E2 | Close the tab, reopen the URL | Same resume card. **Resume** returns to the exact step with trials, hints and hypothesis intact. |
| E3 | Switch to another tab for 30 s, come back | Timer did not advance while hidden. |
| E4 | Open About while a session runs | Timer shows "paused on About". |
| E5 | Let the timer pass 10:00 (or wait) | Amber banner "10:00 used. You are not locked out." with **Jump to debrief** and **Keep going**. |
| E6 | Watch the stepper | Each stage shows time used / budget (4:00, 3:30, 2:00, 0:30) and a filling bar. |

## F. AI coach and fallback

| # | Do this | Expect |
|---|---|---|
| F1 | Submit a conclusion with AI on | Label "AI coach · checked before you see it"; answer within about 6 s. |
| F2 | About → untick **AI coach on**, submit a conclusion | Label "Offline coach (recorded feedback)"; the whole flow still works. |
| F3 | Turn Wi-Fi off, submit a conclusion | Falls back to recorded feedback after at most 6 s; no error screen. |
| F4 | Any path | The verdict tag never contradicts the rule: choosing "u" can never be marked as holding. |

## G. Identity and evidence

| # | Do this | Expect |
|---|---|---|
| G1 | Visit every screen | Footer shows `ET617 · 23B0702 · P5-T10-L6-C4`. |
| G2 | About | Identity token, card table, persona, outcomes, AI description, credits. |
| G3 | About or Debrief → **Download log (JSON)** | File `range-lab-log-23b0702.json` with events: prediction_submitted, trial_recorded, experiment_flag, hint_requested, hypothesis_revised, task_answered, ai_call, ai_fallback, pause, resume. |

## Automated run

`node scripts/shots.mjs` drives Chrome through A, B, C, D and E2 on the live site and saves screenshots to `report/img/`.
