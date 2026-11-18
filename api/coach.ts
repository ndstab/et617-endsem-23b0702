// The ONE serverless function: the AI inquiry coach.
// It receives the learner's hypothesis, prediction, trials and explanation, and returns
// ONE Socratic question. The model never calculates: every number comes from src/physics.ts.
// Its output is checked in code (checkReply) before anything reaches the learner.

import Anthropic from '@anthropic-ai/sdk'

const MODEL = process.env.COACH_MODEL || 'claude-opus-5-5'

// ===================== THE PROMPT (pasted in the report, section D6) =====================
export const COACH_SYSTEM_PROMPT = `You are a Socratic physics olympiad mentor inside a projectile-motion virtual lab.
The learner is a strong Class 11 student who can already use R = u^2 sin(2 theta) / g. He is bored by routine practice, hates being spoon-fed and hates praise.

You receive JSON with: mission, hypothesis, prediction, trials (his own recorded data), chosen_relation, explanation, rule_verdict, hint_level.
- Mission "m1": level ground, angle fixed at 30 degrees, he varies launch speed. Known misconception m1_linear: "range is proportional to speed, so doubling the speed doubles the range".
- Mission "m2": launch from a 12 m cliff at 10 m/s, he varies the angle. Known misconception m2_always45: "45 degrees is always the best angle".

Your job:
1. Classify his EXPLANATION as one of: "correct" (names the real mechanism), "partial" (right relationship, mechanism missing or vague), "m1_linear", "m2_always45", "other".
2. Ask ONE question, at most 40 words, that moves him one step forward using HIS OWN trials. Peer-level tone. No praise, no emojis.
3. Suggest ONE next trial in words (which variable to change and in which direction), or an empty string if none is needed.

Hard rules:
- Never state the relationship between range and speed.
- Never state or write a formula.
- Never state the best angle, and in mission m2 never name any specific angle between 20 and 40 degrees.
- Never do arithmetic or quote a computed number that is not already in his trials.
- If his explanation is correct, ask a question that extends it, do not repeat it back.

Respond with ONLY a JSON object, no markdown, no other text:
{"verdict": "correct" | "partial" | "m1_linear" | "m2_always45" | "other", "question": string, "suggest_trial": string}`
// ==========================================================================================

const VERDICTS = ['correct', 'partial', 'm1_linear', 'm2_always45', 'other']

// Anything that would give the answer away is rejected.
const LEAKS = ['u²', 'u^2', 'u2', 'squared', 'square of', 'four times', '4x', '4 x', '4×', 'quadrupl', 'sin(2', 'sin 2', 'sin2', 'below 45', 'less than 45', 'under 45', 'smaller than 45', 'lower than 45']

export interface CoachReply {
  verdict: string
  question: string
  suggest_trial: string
}

/** Check the model output before the learner sees it. Returns the reply, or the reason it was rejected. */
export function checkReply(raw: string, mission: string): { ok: true; reply: CoachReply } | { ok: false; reason: string } {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return { ok: false, reason: 'not_json' }
  let data: unknown
  try {
    data = JSON.parse(raw.slice(start, end + 1))
  } catch {
    return { ok: false, reason: 'not_json' }
  }
  const d = data as Partial<CoachReply>
  if (typeof d.verdict !== 'string' || !VERDICTS.includes(d.verdict)) return { ok: false, reason: 'bad_verdict' }
  if (typeof d.question !== 'string' || d.question.trim().length < 5) return { ok: false, reason: 'no_question' }
  if (d.question.length > 300) return { ok: false, reason: 'question_too_long' }
  const suggest = typeof d.suggest_trial === 'string' ? d.suggest_trial : ''
  if (suggest.length > 200) return { ok: false, reason: 'suggestion_too_long' }

  const text = `${d.question} ${suggest}`.toLowerCase()
  if (LEAKS.some((leak) => text.includes(leak))) return { ok: false, reason: 'leak_filter' }
  // Mission 2: no number between 26 and 32 may appear (the best angle is about 29°).
  if (mission === 'm2' && /(^|[^\d.])(2[6-9]|3[0-2])(\.\d+)?(?![\d.])/.test(text)) return { ok: false, reason: 'leak_filter_angle' }

  return { ok: true, reply: { verdict: d.verdict, question: d.question.trim(), suggest_trial: suggest.trim() } }
}

interface Req {
  method?: string
  body?: unknown
}
interface Res {
  status: (code: number) => Res
  json: (body: unknown) => void
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, reason: 'method_not_allowed' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(200).json({ ok: false, reason: 'no_api_key' })

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as Record<string, unknown> | undefined
  if (!body || (body.mission !== 'm1' && body.mission !== 'm2')) return res.status(400).json({ ok: false, reason: 'bad_request' })

  // Only the fields the coach needs, with free text capped.
  const input = {
    mission: body.mission,
    hypothesis: String(body.hypothesis ?? '').slice(0, 400),
    prediction: body.prediction,
    trials: Array.isArray(body.trials) ? body.trials.slice(0, 20) : [],
    chosen_relation: String(body.chosen_relation ?? '').slice(0, 60),
    explanation: String(body.explanation ?? '').slice(0, 600),
    rule_verdict: String(body.rule_verdict ?? ''),
    hint_level: body.hint_level,
  }

  const started = Date.now()
  try {
    const client = new Anthropic({ timeout: 5500, maxRetries: 0 })
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: COACH_SYSTEM_PROMPT,
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: JSON.stringify(input) }],
    })
    const ms = Date.now() - started
    if (message.stop_reason === 'refusal') return res.status(200).json({ ok: false, reason: 'refusal', ms })

    const raw = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
    const checked = checkReply(raw, input.mission as string)
    if (!checked.ok) return res.status(200).json({ ok: false, reason: checked.reason, ms })
    return res.status(200).json({ ok: true, ...checked.reply, model: MODEL, ms })
  } catch (error) {
    const ms = Date.now() - started
    const reason = error instanceof Anthropic.APIConnectionTimeoutError ? 'timeout' : error instanceof Anthropic.APIError ? `api_error_${error.status ?? 'network'}` : 'error'
    return res.status(200).json({ ok: false, reason, ms })
  }
}
