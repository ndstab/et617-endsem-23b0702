// Client side of the AI inquiry coach. One call, 6 second limit, and a safe answer when it fails:
// the caller falls back to the written rule-based feedback ("offline coach").

import type { MissionId } from './content'
import type { MissionState, Verdict } from './store'

export interface CoachResult {
  ok: boolean
  /** Did the explanation name the mechanism, according to the AI? */
  explanationOk?: boolean
  question?: string
  suggest?: string
  reason?: string // why we fell back
  ms: number
}

const TIMEOUT_MS = 6000

export async function askCoach(
  mission: MissionId,
  ms: MissionState,
  draft: { relation: string; explanation: string; hypothesis: string; ruleVerdict: Verdict },
): Promise<CoachResult> {
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        mission,
        hypothesis: draft.hypothesis,
        prediction: { value: ms.prediction, choice: ms.choice, confidence: ms.confidence },
        trials: ms.trials.map((t) => ({ n: t.n, u: t.u, angle: t.angle, h: t.h, range: +t.range.toFixed(1), time: +t.time.toFixed(2) })),
        chosen_relation: draft.relation,
        explanation: draft.explanation,
        rule_verdict: draft.ruleVerdict,
        hint_level: ms.hintLevel,
      }),
    })
    const elapsed = Date.now() - started
    if (!response.ok) return { ok: false, reason: `http_${response.status}`, ms: elapsed }
    const data = (await response.json()) as { ok?: boolean; verdict?: string; question?: string; suggest_trial?: string; reason?: string }
    // The server has already validated and leak-filtered the reply. Re-check the shape anyway.
    if (!data.ok || typeof data.question !== 'string' || typeof data.verdict !== 'string') {
      return { ok: false, reason: data.reason ?? 'bad_response', ms: elapsed }
    }
    return { ok: true, explanationOk: data.verdict === 'correct', question: data.question, suggest: data.suggest_trial ?? '', ms: elapsed }
  } catch (error) {
    const reason = error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network'
    return { ok: false, reason, ms: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}
