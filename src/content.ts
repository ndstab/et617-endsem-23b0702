// All learner-facing content lives here: scenarios, tasks, model answers, hints, feedback.
// Tone: short, direct, peer-level. No praise spam.

export const IDENTITY = 'ET617 · 23B0702 · P5-T10-L6-C4'
export const SESSION_SECONDS = 600

export type MissionId = 'm1' | 'm2'
export type StageId = 'm1' | 'm2' | 'ch' | 'db'

/** Time budget per stage, in seconds. Adds up to 10:00. */
export const BUDGET: Record<StageId, number> = { m1: 240, m2: 210, ch: 120, db: 30 }
export const STAGE_LABEL: Record<StageId, string> = {
  m1: 'Mission 1 · Speed',
  m2: 'Mission 2 · Angle from a cliff',
  ch: 'Challenge',
  db: 'Debrief',
}

export interface Option {
  id: string
  label: string
}

export interface Mission {
  id: MissionId
  title: string
  scenario: string
  predictPrompt: string
  predictUnit: string
  /** Mission 2 asks for a choice before the number. */
  predictChoices?: Option[]
  hypothesisPrompt: string
  hypothesisPlaceholder: string
  /** Where the sliders start. */
  start: { u: number; angle: number; h: number }
  /** Variables the learner cannot move in this mission. */
  locks: Partial<{ u: number; angle: number; h: number }>
  /** The variable this mission is about, and what a controlled trial holds fixed. */
  variable: 'u' | 'angle'
  controlled: Partial<{ u: number; angle: number; h: number }>
  minValues: number
  labBrief: string
  relationQuestion: string
  relationOptions: Option[]
  relationCorrect: string
  relationMisconception: string
  explainPrompt: string
  misconceptionName: string
  modelAnswer: string
  pushFurther: string
  hints: [string, string, string]
  /** Written feedback for the conclusion on the Interpret screen: one line, one question. */
  feedback: Record<'correct' | 'partial' | 'misconception' | 'other', { line: string; question: string }>
}

export const MISSIONS: Record<MissionId, Mission> = {
  m1: {
    id: 'm1',
    title: 'Mission 1 · Speed',
    scenario:
      'Level ground. The launch angle is fixed at 30°. At u = 20 m/s the ball lands 35.3 m away. Now you double the speed to 40 m/s.',
    predictPrompt: 'Predict the range at 40 m/s',
    predictUnit: 'm',
    hypothesisPrompt: 'Your hypothesis, in one line: how does range depend on launch speed, and why?',
    hypothesisPlaceholder: 'e.g. Range goes as … because …',
    start: { u: 20, angle: 30, h: 0 },
    locks: { h: 0 },
    variable: 'u',
    controlled: { angle: 30, h: 0 },
    minValues: 3,
    labBrief:
      'Test your prediction. Change one thing: speed. Hold the angle at 30°. Record at least 3 different speeds, and make one of them 40 m/s.',
    relationQuestion: 'From YOUR table, range is proportional to:',
    relationOptions: [
      { id: 'u', label: 'u' },
      { id: 'u2', label: 'u²' },
      { id: 'sqrt', label: '√u' },
      { id: 'unknown', label: "can't tell from this data" },
    ],
    relationCorrect: 'u2',
    relationMisconception: 'u',
    explainPrompt: 'Explain why, in one or two sentences.',
    misconceptionName: 'M1 · "range is proportional to speed"',
    modelAnswer:
      'Doubling u doubles the horizontal velocity and also doubles the time in the air (T = 2u sinθ / g). Range is the product of the two, so it goes up 4 times: R ∝ u².',
    pushFurther: 'So it was 4×. Will tripling the speed give 6× or 9×? Check it with one shot.',
    hints: [
      'Look at how R changes each time u changes. Compare ratios between rows, not differences.',
      'Divide R by u for each row. Constant? Now try R divided by u². The table can add that column for you.',
      'Range = uₓ × T. Write how each of the two depends on u.',
    ],
    feedback: {
      correct: {
        line: 'Your data and your reasoning agree.',
        question: 'So it was 4×. Will tripling the speed give 6× or 9×? Check it with one shot.',
      },
      partial: {
        line: 'The relationship is right. The mechanism is not there yet.',
        question: 'Range is horizontal speed × time in the air. What does doubling u do to each of them?',
      },
      misconception: {
        line: 'Your own table does not support "proportional to u".',
        question: 'If R followed u, what would R ÷ u be in every row? Compute it for two of your rows.',
      },
      other: {
        line: 'That does not match your rows yet.',
        question:
          'Pick your slowest and fastest trial. By what factor did u change, and by what factor did R change? If you cannot tell, your speeds are too close together.',
      },
    },
  },
  m2: {
    id: 'm2',
    title: 'Mission 2 · Angle from a cliff',
    scenario: 'Now you launch from the edge of a 12 m cliff at u = 10 m/s. The ball lands on the ground below.',
    predictPrompt: 'Estimate the best angle',
    predictUnit: '°',
    predictChoices: [
      { id: 'below', label: 'below 45°' },
      { id: 'exactly', label: 'exactly 45°' },
      { id: 'above', label: 'above 45°' },
    ],
    hypothesisPrompt: 'Your hypothesis, in one line: which angle gives the longest range from a height, and why?',
    hypothesisPlaceholder: 'e.g. The best angle is … because …',
    start: { u: 10, angle: 45, h: 12 },
    locks: { h: 12 },
    variable: 'angle',
    controlled: { u: 10, h: 12 },
    minValues: 4,
    labBrief:
      'Find the angle that throws furthest from the cliff. Change one thing: angle. Hold the speed at 10 m/s. Record at least 4 different angles, and make one of them your estimate.',
    relationQuestion: 'From YOUR table, the longest range is at an angle:',
    relationOptions: [
      { id: 'below', label: 'below 45°' },
      { id: 'exactly', label: 'exactly 45°' },
      { id: 'above', label: 'above 45°' },
      { id: 'unknown', label: "can't tell from this data" },
    ],
    relationCorrect: 'below',
    relationMisconception: 'exactly',
    explainPrompt: 'Explain why, in one or two sentences.',
    misconceptionName: 'M2 · "45° is always the best angle"',
    modelAnswer:
      'From a height the ball keeps moving forward during the extra fall time, so it is worth trading some vertical velocity for more horizontal velocity: a flatter angle wins (about 29° here, 18.7 m against 17.3 m at 45°). 45° is the best angle only when launch and landing heights are equal.',
    pushFurther:
      'Flatter wins from 12 m. If you raise the speed to 20 m/s, does the best angle move toward 45° or away from it? Predict, then check.',
    hints: [
      'Which of your trials went furthest? Is your table dense enough around it to say where the peak is?',
      'Compare your 45° row with a row 10° either side of it. Which side wins, and by how much?',
      'Range = uₓ × T. From a cliff, part of T comes from the fall itself. Ask what lowering the angle costs you in T and what it gains you in uₓ.',
    ],
    feedback: {
      correct: {
        line: 'Your table and your reasoning agree.',
        question:
          'Flatter wins from 12 m. If you raise the speed to 20 m/s, does the best angle move toward 45° or away from it? Predict, then check.',
      },
      partial: {
        line: 'The direction is right. The mechanism is not there yet.',
        question:
          'The ball passes launch height on its way down and keeps going. What is it still doing during that extra fall, and which launch choice makes the most of it?',
      },
      misconception: {
        line: 'Your table puts the peak at 45° only because of where you looked.',
        question:
          'Try a few angles on both sides of 45°. On level ground the ball lands when it comes back to launch height. Where is it at that moment here, and what is it still doing?',
      },
      other: {
        line: 'Your table does not show that yet.',
        question: 'Scan from 15° to 60° in steps of 10° or less. Then say where the longest range sits.',
      },
    },
  },
}

/** Challenge: transfer tasks 5 and 6. */
export const CHALLENGE = {
  t5: {
    prompt: 'Level ground, u = 30 m/s. A 27° launch and which other angle land at the same spot?',
    answer: 63,
    feedback: {
      correct: '63°. The pair adds up to 90°: one shot is fast across the ground and brief, the other slow and long in the air.',
      misconception:
        'There is a second angle. A range does not belong to one angle only. Launch 27°, note R, then hunt for the other one above 45°.',
      other: 'Not a tie. Launch 27° and note R. Then try your angle and compare. What do the two angles of a tie add up to?',
    },
    model: '63°. On level ground R depends on sin 2θ, and sin 54° = sin 126°, so complementary angles tie.',
    followPrompt: 'Does that pair still tie from the 12 m cliff?',
    followAnswer: 'no' as const,
    followFeedback: {
      correct:
        'No. From 12 m the 27° shot goes further (93.0 m against 79.9 m at 30 m/s). The tie is a level-ground result. Test it on the bench.',
      misconception:
        'You carried a level-ground rule up a cliff, the same move as "45° is always best". Set h = 12 m, launch both angles and compare.',
    },
  },
  t6: {
    prompt:
      'Level ground, u locked at 30 m/s. Land the ball in the target zone at 45.9 m (± 1.5 m). Find TWO different angles that do it.',
    target: { x: 45.9, tol: 1.5 },
    feedback: {
      none: 'No hit yet. Launch, see where it lands relative to the zone, and adjust one way.',
      one: 'One down. The zone can be hit a second way. Think back to the 27° question.',
      correct:
        '15° and 75°. Same range, very different flights: compare their time in the air and max height in your table.',
    },
  },
}

export const EXTENSION = {
  prompt:
    'Take-away: derive the best launch angle for a launch height h and speed u. Start from R = uₓ × T and set dR/dθ = 0.',
  result: 'tan θ = u / √(u² + 2gh). At h = 0 this gives 45°. For u = 10 m/s and h = 12 m it gives 28.6°.',
}

export const PERSONA = {
  name: 'Aarav Kulkarni',
  line: '16, Class 11, Pune. Preparing for NSEP and the physics olympiad.',
  prior:
    'Knows the kinematics equations, resolving vectors, trig identities and basic differentiation. Can plug into R = u² sin 2θ / g without thinking, and has stopped asking when it stops being true.',
  context: 'His own laptop at home, in the 10 to 15 minute gaps between coaching problem sets. English.',
  motivation: 'Problems that surprise him, and being proven wrong. Hates being spoon-fed and hates praise spam.',
  misconceptions: [
    'M1: range is proportional to speed, so doubling the speed doubles the range.',
    'M2: 45° is always the best angle, even when launching from a height.',
  ],
}

export const OUTCOMES = [
  'Predict how range changes when launch speed is scaled at a fixed angle, and explain it using horizontal velocity and time in the air.',
  'Compare ranges across angles for a level and an elevated launch, and explain why the best angle drops below 45° from a height.',
  'Design a controlled experiment (one variable, at least 3 values) and use the data to revise a stated hypothesis.',
]
