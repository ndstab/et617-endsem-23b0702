// The whole app state lives in ONE object (Session), changed only by the reducer below.
// Every change is saved to localStorage, which is how "stop and resume" works.

import type { MissionId, StageId } from './content'
import type { Shot } from './physics'
import { experimentFlags } from './rules'

export const STORAGE_KEY = 'et617-23b0702-session-v1'

export type Step =
  | 'home'
  | 'm1_predict'
  | 'm1_lab'
  | 'm1_interpret'
  | 'm2_predict'
  | 'm2_lab'
  | 'm2_interpret'
  | 'challenge'
  | 'debrief'

export const STEP_LABEL: Record<Step, string> = {
  home: 'Home',
  m1_predict: 'Mission 1 · Predict',
  m1_lab: 'Mission 1 · Experiment',
  m1_interpret: 'Mission 1 · Interpret',
  m2_predict: 'Mission 2 · Predict',
  m2_lab: 'Mission 2 · Experiment',
  m2_interpret: 'Mission 2 · Interpret',
  challenge: 'Challenge',
  debrief: 'Debrief',
}

export function stageOf(step: Step): StageId | null {
  if (step.startsWith('m1')) return 'm1'
  if (step.startsWith('m2')) return 'm2'
  if (step === 'challenge') return 'ch'
  if (step === 'debrief') return 'db'
  return null
}

export type Verdict = 'correct' | 'partial' | 'misconception' | 'other'
export type Confidence = 'low' | 'med' | 'high'

export interface Trial extends Shot {
  n: number
}

export interface CoachMsg {
  source: 'ai' | 'offline'
  verdict: Verdict
  line: string
  question: string
  suggest: string
  attempt: number
}

export interface MissionState {
  prediction: number | null
  choice: string | null
  confidence: Confidence | null
  predVerdict: Verdict | null
  hypotheses: string[] // first version, then each revision
  trials: Trial[]
  relation: string | null
  explanation: string
  attempts: number // conclusions submitted on Interpret
  verdict: Verdict | null
  resolved: boolean // model answer has been shown
  coach: CoachMsg[]
  hintLevel: number // 0..3
}

export interface ChallengeState {
  task: 5 | 6
  t5Answer: number | null
  t5Attempts: number
  t5Verdict: Verdict | null
  t5Follow: 'yes' | 'no' | null
  trials: Trial[]
}

export interface LogEvent {
  time: string // wall clock, ISO
  at: number // active seconds into the session
  type: string
  payload: unknown
}

export interface Session {
  version: 1
  step: Step
  view: 'main' | 'about'
  paused: boolean
  elapsed: number // active seconds
  stageTime: Record<StageId, number>
  m1: MissionState
  m2: MissionState
  ch: ChallengeState
  aiEnabled: boolean
  overDismissed: boolean
  log: LogEvent[]
}

const newMission = (): MissionState => ({
  prediction: null,
  choice: null,
  confidence: null,
  predVerdict: null,
  hypotheses: [],
  trials: [],
  relation: null,
  explanation: '',
  attempts: 0,
  verdict: null,
  resolved: false,
  coach: [],
  hintLevel: 0,
})

export const newSession = (): Session => ({
  version: 1,
  step: 'home',
  view: 'main',
  paused: false,
  elapsed: 0,
  stageTime: { m1: 0, m2: 0, ch: 0, db: 0 },
  m1: newMission(),
  m2: newMission(),
  ch: { task: 5, t5Answer: null, t5Attempts: 0, t5Verdict: null, t5Follow: null, trials: [] },
  aiEnabled: true,
  overDismissed: false,
  log: [],
})

export type Action =
  | { type: 'start' }
  | { type: 'reset' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'tick' }
  | { type: 'goto'; step: Step }
  | { type: 'view'; view: 'main' | 'about' }
  | {
      type: 'predict'
      mission: MissionId
      prediction: number
      choice: string | null
      hypothesis: string
      confidence: Confidence
      verdict: Verdict
    }
  | { type: 'trial'; scope: MissionId | 'ch'; shot: Shot }
  | { type: 'hint'; mission: MissionId }
  | {
      type: 'conclude'
      mission: MissionId
      relation: string
      explanation: string
      hypothesis: string
      verdict: Verdict
      resolved: boolean
      coach: CoachMsg
      ai: { called: boolean; fallbackReason: string | null; ms: number | null }
    }
  | { type: 't5'; answer: number; verdict: Verdict }
  | { type: 't5follow'; answer: 'yes' | 'no' }
  | { type: 'chTask'; task: 5 | 6 }
  | { type: 'toggleAi' }
  | { type: 'dismissOver' }

function logged(s: Session, type: string, payload: unknown = {}): LogEvent[] {
  return [...s.log, { time: new Date().toISOString(), at: s.elapsed, type, payload }]
}

export function reducer(s: Session, a: Action): Session {
  switch (a.type) {
    case 'start': {
      const fresh = { ...newSession(), aiEnabled: s.aiEnabled, step: 'm1_predict' as Step }
      return { ...fresh, log: logged(fresh, 'session_started') }
    }
    case 'reset':
      return { ...newSession(), aiEnabled: s.aiEnabled }
    case 'pause':
      return { ...s, paused: true, view: 'main', log: logged(s, 'pause', { step: s.step }) }
    case 'resume':
      return { ...s, paused: false, log: logged(s, 'resume', { step: s.step }) }
    case 'tick': {
      const stage = stageOf(s.step)
      if (!stage) return s
      return {
        ...s,
        elapsed: s.elapsed + 1,
        stageTime: { ...s.stageTime, [stage]: s.stageTime[stage] + 1 },
      }
    }
    case 'goto':
      return { ...s, step: a.step, view: 'main', log: logged(s, 'screen', { to: a.step }) }
    case 'view':
      return { ...s, view: a.view }
    case 'predict': {
      const m: MissionState = {
        ...s[a.mission],
        prediction: a.prediction,
        choice: a.choice,
        confidence: a.confidence,
        predVerdict: a.verdict,
        hypotheses: [a.hypothesis],
      }
      const step: Step = a.mission === 'm1' ? 'm1_lab' : 'm2_lab'
      return {
        ...s,
        [a.mission]: m,
        step,
        log: logged(s, 'prediction_submitted', {
          mission: a.mission,
          prediction: a.prediction,
          choice: a.choice,
          hypothesis: a.hypothesis,
          confidence: a.confidence,
          verdict: a.verdict,
        }),
      }
    }
    case 'trial': {
      if (a.scope === 'ch') {
        const trial: Trial = { ...a.shot, n: s.ch.trials.length + 1 }
        return {
          ...s,
          ch: { ...s.ch, trials: [...s.ch.trials, trial] },
          log: logged(s, 'trial_recorded', { scope: 'ch', ...trial }),
        }
      }
      const m = s[a.scope]
      const trial: Trial = { ...a.shot, n: m.trials.length + 1 }
      const trials = [...m.trials, trial]
      let log = logged(s, 'trial_recorded', { scope: a.scope, ...trial })
      // The app reacts to HOW he experiments: log any flag raised by this trial.
      const before = experimentFlags(a.scope, m.trials).map((f) => f.id)
      for (const flag of experimentFlags(a.scope, trials)) {
        if (!before.includes(flag.id)) {
          log = [...log, { time: new Date().toISOString(), at: s.elapsed, type: 'experiment_flag', payload: flag }]
        }
      }
      return { ...s, [a.scope]: { ...m, trials }, log }
    }
    case 'hint': {
      const m = s[a.mission]
      if (m.hintLevel >= 3) return s
      const level = m.hintLevel + 1
      return {
        ...s,
        [a.mission]: { ...m, hintLevel: level },
        log: logged(s, 'hint_requested', { mission: a.mission, level }),
      }
    }
    case 'conclude': {
      const m = s[a.mission]
      const revised = a.hypothesis.trim() !== (m.hypotheses[m.hypotheses.length - 1] ?? '').trim()
      const next: MissionState = {
        ...m,
        relation: a.relation,
        explanation: a.explanation,
        attempts: m.attempts + 1,
        verdict: a.verdict,
        resolved: a.resolved,
        hypotheses: revised ? [...m.hypotheses, a.hypothesis.trim()] : m.hypotheses,
        coach: [...m.coach, a.coach],
      }
      let log = logged(s, 'task_answered', {
        mission: a.mission,
        task: 'conclusion',
        relation: a.relation,
        explanation: a.explanation,
        verdict: a.verdict,
        attempt: next.attempts,
      })
      const stamp = { time: new Date().toISOString(), at: s.elapsed }
      if (revised) log = [...log, { ...stamp, type: 'hypothesis_revised', payload: { mission: a.mission, to: a.hypothesis } }]
      if (a.ai.called) log = [...log, { ...stamp, type: 'ai_call', payload: { mission: a.mission, ms: a.ai.ms } }]
      if (a.ai.fallbackReason)
        log = [...log, { ...stamp, type: 'ai_fallback', payload: { mission: a.mission, reason: a.ai.fallbackReason } }]
      return { ...s, [a.mission]: next, log }
    }
    case 't5':
      return {
        ...s,
        ch: { ...s.ch, t5Answer: a.answer, t5Attempts: s.ch.t5Attempts + 1, t5Verdict: a.verdict },
        log: logged(s, 'task_answered', { task: 5, answer: a.answer, verdict: a.verdict }),
      }
    case 't5follow':
      return {
        ...s,
        ch: { ...s.ch, t5Follow: a.answer },
        log: logged(s, 'task_answered', { task: '5-follow-up', answer: a.answer, verdict: a.answer === 'no' ? 'correct' : 'misconception' }),
      }
    case 'chTask':
      return { ...s, ch: { ...s.ch, task: a.task } }
    case 'toggleAi':
      return { ...s, aiEnabled: !s.aiEnabled }
    case 'dismissOver':
      return { ...s, overDismissed: true }
  }
}

/** Load the saved session. A session in progress always comes back paused, on the resume card. */
export function loadSession(): Session {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return newSession()
    const saved = JSON.parse(raw) as Session
    if (saved.version !== 1 || !saved.step) return newSession()
    return { ...newSession(), ...saved, view: 'main', paused: saved.step !== 'home' }
  } catch {
    return newSession()
  }
}

export function saveSession(s: Session) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
  } catch {
    // Storage full or blocked: the session still works, it just will not resume.
  }
}

export const fmtTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
