// Rule-based judgement. No AI in this file: these rules decide every verdict,
// react to how the learner experiments, and are the fallback when the AI coach is unavailable.

import { CHALLENGE, MISSIONS, type MissionId } from './content'
import type { MissionState, Trial, Verdict } from './store'

const within = (value: number, target: number, tolerance: number) =>
  Math.abs(value - target) <= Math.abs(target) * tolerance

// ---------- Prediction (tasks 1 and 4) ----------

/** DECISION RULE for a prediction: correct, the mission's misconception, or other. */
export function classifyPrediction(mission: MissionId, value: number, choice: string | null): Verdict {
  if (mission === 'm1') {
    if (within(value, 141.2, 0.05)) return 'correct' // R ∝ u²
    if (within(value, 70.6, 0.05)) return 'misconception' // M1: doubled the range
    return 'other'
  }
  if (choice === 'exactly') return 'misconception' // M2: 45° is always best
  if (choice === 'below' && value >= 26 && value <= 32) return 'correct'
  return 'other'
}

// ---------- Experiment design (tasks 2 and 4) ----------

/** A controlled trial holds everything fixed except the mission's variable. */
export function isControlled(mission: MissionId, t: Trial) {
  const c = MISSIONS[mission].controlled
  return (c.u === undefined || t.u === c.u) && (c.angle === undefined || t.angle === c.angle) && (c.h === undefined || t.h === c.h)
}

export function controlledTrials(mission: MissionId, trials: Trial[]) {
  return trials.filter((t) => isControlled(mission, t))
}

function distinctValues(mission: MissionId, trials: Trial[]) {
  const v = MISSIONS[mission].variable
  return [...new Set(controlledTrials(mission, trials).map((t) => t[v]))].sort((a, b) => a - b)
}

/** The value of the mission variable where the prediction gets tested. */
export function predictionCase(mission: MissionId, ms: MissionState) {
  return mission === 'm1' ? 40 : Math.round(ms.prediction ?? 45)
}

/** The learner's own measurement of the case he predicted. */
export function measuredForPrediction(mission: MissionId, ms: MissionState) {
  const v = MISSIONS[mission].variable
  const target = predictionCase(mission, ms)
  return controlledTrials(mission, ms.trials).find((t) => t[v] === target)
}

/** What must be true before he can leave the bench. */
export function labChecklist(mission: MissionId, ms: MissionState) {
  const m = MISSIONS[mission]
  const values = distinctValues(mission, ms.trials)
  const target = predictionCase(mission, ms)
  const unit = mission === 'm1' ? ' m/s' : '°'
  const what = mission === 'm1' ? 'speeds at 30°' : 'angles at 10 m/s'
  return [
    { label: `${m.minValues} different ${what} recorded (${Math.min(values.length, m.minValues)}/${m.minValues})`, done: values.length >= m.minValues },
    { label: `Your predicted case tested (${target}${unit})`, done: values.includes(target) },
  ]
}

export interface Flag {
  id: string
  text: string
}

const NAMES = { u: 'speed', angle: 'angle', h: 'height' } as const

/** The app reacts to HOW he experiments. Each flag is a note, never a block. */
export function experimentFlags(mission: MissionId, trials: Trial[]): Flag[] {
  const flags: Flag[] = []
  const m = MISSIONS[mission]

  // 1. Confound: the last two trials differ in more than one variable.
  if (trials.length >= 2) {
    const a = trials[trials.length - 2]
    const b = trials[trials.length - 1]
    const changed = (['u', 'angle', 'h'] as const).filter((k) => a[k] !== b[k])
    if (changed.length > 1) {
      flags.push({
        id: `confound-${b.n}`,
        text: `Trials #${a.n} and #${b.n}: you changed ${changed.map((k) => NAMES[k]).join(' and ')} together. Which one moved the range? You can't tell from this pair.`,
      })
    }
  }

  // 2. A trial that left the controlled condition does not count.
  const stray = trials.filter((t) => !isControlled(mission, t))
  if (stray.length > 0) {
    const fixed = mission === 'm1' ? 'the angle at 30°' : 'the speed at 10 m/s'
    flags.push({
      id: `uncontrolled-${stray[stray.length - 1].n}`,
      text: `Trial${stray.length > 1 ? 's' : ''} ${stray.map((t) => '#' + t.n).join(', ')} did not hold ${fixed}, so ${stray.length > 1 ? 'they do' : 'it does'} not count for this question.`,
    })
  }

  const values = distinctValues(mission, trials)

  // 3. Only two points.
  if (values.length === 2) {
    flags.push({ id: 'two-points', text: 'Two points fit a line and a curve equally well. Add a third before you read a pattern into it.' })
  }

  // 4. Values bunched together.
  if (values.length >= 2) {
    const spread = values[values.length - 1] - values[0]
    const limit = m.variable === 'u' ? 5 : 10
    if (spread < limit) {
      flags.push({
        id: 'bunched',
        text:
          m.variable === 'u'
            ? 'All your speeds are within 5 m/s of each other. The spread is too small to see a pattern.'
            : 'All your angles are within 10° of each other. The spread is too small to see where the peak is.',
      })
    }
  }

  // 5. Mission 2: only looked on one side of 45°.
  if (mission === 'm2' && values.length >= 2 && values.every((v) => v >= 45)) {
    flags.push({ id: 'one-side', text: 'You have only tried 45° and above. That is one side of the question.' })
  }

  return flags
}

// ---------- Interpretation (tasks 3 and 4) ----------

/** DECISION RULE for the relationship he reads off his table. */
export function classifyRelation(mission: MissionId, optionId: string): Verdict {
  const m = MISSIONS[mission]
  if (optionId === m.relationCorrect) return 'correct'
  if (optionId === m.relationMisconception) return 'misconception'
  return 'other'
}

/** Offline check of the free-text explanation: does it name both parts of the mechanism? */
export function explanationNamesMechanism(mission: MissionId, text: string) {
  const t = text.toLowerCase()
  if (mission === 'm1') return /time|longer in the air|flight/.test(t) && /horizontal|velocity|both|u_?x|component/.test(t)
  return /time|fall|air|longer|height|drop/.test(t) && /horizontal|forward|flat|u_?x|sideways/.test(t)
}

/**
 * Combine the rule verdict with the coach's reading of the explanation.
 * The rule verdict always wins: the AI can only turn a "correct" into a "partial".
 */
export function finalVerdict(rule: Verdict, explanationOk: boolean): Verdict {
  if (rule !== 'correct') return rule
  return explanationOk ? 'correct' : 'partial'
}

/** When does the model answer appear? After a correct conclusion, or after two revisions. */
export function isResolved(verdict: Verdict, attempt: number) {
  if (verdict === 'correct') return true
  if (verdict === 'partial') return attempt >= 2
  return attempt >= 3
}

const f1 = (x: number) => x.toFixed(1)

/** One line built from his own rows. */
export function ownRowsLine(mission: MissionId, trials: Trial[]): string | null {
  const rows = controlledTrials(mission, trials)
  if (rows.length < 2) return null
  if (mission === 'm1') {
    const sorted = [...rows].sort((a, b) => a.u - b.u)
    const lo = sorted[0]
    const hi = sorted[sorted.length - 1]
    if (lo.u === hi.u) return null
    return `Your rows #${lo.n} and #${hi.n}: u × ${f1(hi.u / lo.u)} → R × ${f1(hi.range / lo.range)}`
  }
  const best = rows.reduce((a, b) => (b.range > a.range ? b : a))
  const at45 = rows.find((t) => t.angle === 45)
  return `Your rows: longest so far ${f1(best.range)} m at ${best.angle}°` + (at45 && best !== at45 ? ` · 45° gave ${f1(at45.range)} m` : '')
}

export interface GapCard {
  refuted: boolean
  predicted: string
  measured: string
  rows: string | null
  question: string
  /** Mission 1 only: the two ranges, drawn as bars. */
  bars?: { predicted: number; measured: number }
}

/** The prediction gap card: his prediction next to his own measurement, plus one pointing question. */
export function gapCard(mission: MissionId, ms: MissionState): GapCard {
  const hit = measuredForPrediction(mission, ms)
  const rows = ownRowsLine(mission, ms.trials)
  const p = ms.prediction ?? 0
  if (mission === 'm1') {
    const measured = hit ? `${f1(hit.range)} m` : 'not measured'
    const question =
      ms.predVerdict === 'correct'
        ? 'Your model held. Now pin down why it is that factor and not another.'
        : ms.predVerdict === 'misconception'
          ? 'Your model says range follows speed. Range is horizontal speed × time in the air. Which of those did you assume stays the same when u doubles?'
          : `You were off by a factor of ${hit ? f1(Math.max(hit.range, p) / Math.max(Math.min(hit.range, p), 0.1)) : '?'}. What did your model assume about how range depends on u?`
    return { refuted: ms.predVerdict !== 'correct', predicted: `${f1(p)} m`, measured, rows, question, bars: hit ? { predicted: p, measured: hit.range } : undefined }
  }
  const best = controlledTrials(mission, ms.trials).reduce<Trial | null>((a, b) => (!a || b.range > a.range ? b : a), null)
  const measured = hit ? `${f1(hit.range)} m at ${hit.angle}°` : 'not measured'
  const question =
    ms.predVerdict === 'correct'
      ? 'Your estimate sits at the peak of your table. Now explain why a flatter launch wins from a height.'
      : ms.predVerdict === 'misconception'
        ? `You said 45°. Your 45° shot went ${hit ? f1(hit.range) : '?'} m. Try a few angles on both sides of it. On level ground the ball lands when it comes back to launch height. Where is it at that moment here, and what is it still doing?`
        : `Your best so far is ${best ? f1(best.range) : '?'} m at ${best ? best.angle : '?'}°. Is your table dense enough around the peak to say where it is?`
  const choiceLabel = MISSIONS.m2.predictChoices?.find((c) => c.id === ms.choice)?.label ?? ''
  return { refuted: ms.predVerdict !== 'correct', predicted: `${choiceLabel}, about ${Math.round(p)}°`, measured, rows, question }
}

/** Shown if he is still wrong after two revisions: the model answer tied to his own table. */
export function modelFromOwnRows(mission: MissionId, trials: Trial[]): string {
  const rows = controlledTrials(mission, trials)
  if (mission === 'm1') {
    const sorted = [...rows].sort((a, b) => a.u - b.u)
    const lo = sorted[0]
    const hi = sorted[sorted.length - 1]
    if (!lo || !hi || lo.u === hi.u) return MISSIONS.m1.modelAnswer
    const k = hi.u / lo.u
    return `In your own table: at ${lo.u} m/s R = ${f1(lo.range)} m, at ${hi.u} m/s R = ${f1(hi.range)} m. Speed × ${f1(k)}, range × ${f1(hi.range / lo.range)}, which is ${f1(k)}². ${MISSIONS.m1.modelAnswer}`
  }
  const best = rows.reduce<Trial | null>((a, b) => (!a || b.range > a.range ? b : a), null)
  const at45 = rows.find((t) => t.angle === 45)
  const own =
    best && best.angle < 45 && at45
      ? `In your own table: ${best.angle}° went ${f1(best.range)} m, 45° went ${f1(at45.range)} m. `
      : 'Your table never settled the region below 45°. '
  return own + MISSIONS.m2.modelAnswer
}

// ---------- Challenge (tasks 5 and 6) ----------

export function classifyT5(answer: number): Verdict {
  if (Math.abs(answer - CHALLENGE.t5.answer) <= 0.5) return 'correct'
  if (answer === 27 || answer === 45) return 'misconception' // "there is no second angle"
  return 'other'
}

/** Task 6: distinct angles that landed in the target zone on level ground at 30 m/s. */
export function t6Hits(trials: Trial[]) {
  const { x, tol } = CHALLENGE.t6.target
  const hits = trials.filter((t) => t.u === 30 && t.h === 0 && Math.abs(t.range - x) <= tol).map((t) => t.angle)
  return [...new Set(hits)].sort((a, b) => a - b)
}

export function t6Done(trials: Trial[]) {
  const hits = t6Hits(trials)
  return hits.length >= 2 && hits[hits.length - 1] - hits[0] >= 5
}
