// Every screen except the lab bench itself. Each one reads the single Session object
// and sends actions to the reducer in store.ts.

import { useState, type Dispatch, type ReactNode } from 'react'
import Hero from './Hero'
import Lab from './Lab'
import { askCoach } from './coach'
import { BUDGET, CHALLENGE, EXTENSION, IDENTITY, MISSIONS, OUTCOMES, PERSONA, STAGE_LABEL, type MissionId, type StageId } from './content'
import { position, shoot } from './physics'
import {
  classifyPrediction,
  classifyRelation,
  classifyT5,
  experimentFlags,
  explanationNamesMechanism,
  finalVerdict,
  gapCard,
  isControlled,
  isResolved,
  labChecklist,
  modelFromOwnRows,
  t6Done,
  t6Hits,
} from './rules'
import { fmtTime, STEP_LABEL, type Action, type CoachMsg, type Confidence, type Session, type Step, type Verdict } from './store'

interface P {
  s: Session
  dispatch: Dispatch<Action>
}

const VERDICT_TAG: Record<Verdict, { text: string; cls: string }> = {
  correct: { text: 'Holds', cls: 'bg-okbg text-ok' },
  partial: { text: 'Half way', cls: 'bg-warnbg text-warn' },
  misconception: { text: 'Refuted by your data', cls: 'bg-[#fbe3da] text-bad' },
  other: { text: 'Not supported yet', cls: 'bg-warnbg text-warn' },
}

function Tag({ verdict }: { verdict: Verdict }) {
  const t = VERDICT_TAG[verdict]
  return <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${t.cls}`}>{t.text}</span>
}

function Heading({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-4">
      <p className="label">{kicker}</p>
      <h1 className="mt-1 text-[26px]">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-[16px]">{children}</div>}
    </header>
  )
}

// ---------------------------------------------------------------- figures

/** A small line drawing of one or more trajectories, drawn with the real physics. */
function MiniBench(props: { h: number; shots: { u: number; angle: number; cls: string; label?: string }[]; xMax: number; yMax: number; mark?: { x: number; text: string }; caption: string }) {
  const { h, shots, xMax, yMax, mark, caption } = props
  const W = 420
  const H = 190
  const ox = 50
  const gy = H - 30
  const scale = Math.min((W - ox - 16) / xMax, (gy - 12) / yMax)
  const sx = (x: number) => ox + x * scale
  const sy = (y: number) => gy - y * scale
  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={caption}>
        {h > 0 && <rect x={8} y={sy(h)} width={ox - 8} height={h * scale} className="cliff" />}
        {h > 0 && <path d={`M8,${sy(h)} H${ox} V${gy}`} className="ink-line" />}
        {h > 0 && (
          <text x={ox - 6} y={sy(h / 2) + 4} textAnchor="end" className="fig-text">
            {h} m
          </text>
        )}
        <line x1={8} x2={W - 8} y1={gy} y2={gy} className="ink-line" strokeWidth={1.5} />
        {shots.map((sh, i) => {
          const shot = shoot(sh.u, sh.angle, h)
          const pts = Array.from({ length: 41 }, (_, k) => {
            const p = position(sh.u, sh.angle, h, (shot.time * k) / 40)
            return `${sx(p.x).toFixed(1)},${sy(Math.max(0, p.y)).toFixed(1)}`
          })
          return (
            <g key={i}>
              <path d={'M' + pts.join(' L')} className={sh.cls} pathLength={sh.cls.includes('draw') ? 1 : undefined} />
              {sh.label && (
                <>
                  <line x1={sx(shot.range)} x2={sx(shot.range)} y1={gy} y2={gy + 5} className="ink-line" />
                  <text x={sx(shot.range)} y={gy + 18} textAnchor="middle" className="fig-text">
                    {sh.label}
                  </text>
                </>
              )}
            </g>
          )
        })}
        {mark && (
          <g>
            <line x1={sx(mark.x)} x2={sx(mark.x)} y1={gy} y2={gy - 22} className="fig-dash" />
            <text x={sx(mark.x)} y={gy - 28} textAnchor="middle" className="fig-text" style={{ fontWeight: 600 }}>
              {mark.text}
            </text>
          </g>
        )}
        <circle cx={sx(0)} cy={sy(h)} r={4} className="dot" />
      </svg>
      <figcaption className="mt-1 text-xs text-muted">{caption}</figcaption>
    </figure>
  )
}

function ScenarioFigure({ mission }: { mission: MissionId }) {
  if (mission === 'm1')
    return (
      <MiniBench
        h={0}
        xMax={150}
        yMax={24}
        shots={[{ u: 20, angle: 30, cls: 'fig-accent draw', label: '35.3 m' }]}
        mark={{ x: 105, text: '40 m/s lands … ?' }}
        caption="Fig. 1 · Same 30° launch. The solid curve is 20 m/s. Where does 40 m/s land?"
      />
    )
  return (
    <MiniBench
      h={12}
      xMax={22}
      yMax={16}
      shots={[
        { u: 4.2, angle: 20, cls: 'fig-dash' },
        { u: 4.2, angle: 45, cls: 'fig-dash' },
        { u: 4.2, angle: 70, cls: 'fig-dash' },
      ]}
      mark={{ x: 15, text: 'furthest at … ?' }}
      caption="Fig. 2 · Launch from a 12 m cliff at 10 m/s. Three possible aims. Which goes furthest?"
    />
  )
}

/** Range as an area: uₓ along one side, time in the air along the other. */
function AreaFigure() {
  const k = 3.0
  const w1 = 17.3 * k
  const h1 = 2.04 * 22
  return (
    <figure className="m-0">
      <svg viewBox="0 0 300 150" className="block w-full max-w-[340px]" role="img" aria-label="Range drawn as the area of a rectangle with sides horizontal velocity and time in the air">
        <rect x={50} y={130 - 2 * h1} width={2 * w1} height={2 * h1} fill="#fbe3da" stroke="var(--color-accent)" strokeWidth={1.4} />
        <line x1={50 + w1} x2={50 + w1} y1={130 - 2 * h1} y2={130} className="fig-dash" />
        <line x1={50} x2={50 + 2 * w1} y1={130 - h1} y2={130 - h1} className="fig-dash" />
        <rect x={50} y={130 - h1} width={w1} height={h1} fill="#e6e8eb" stroke="var(--color-ink)" strokeWidth={1.4} />
        <text x={50 + w1 / 2} y={130 - h1 / 2 + 4} textAnchor="middle" className="fig-text">
          35.3
        </text>
        <text x={50 + w1 * 1.5} y={130 - h1 * 1.5 + 4} textAnchor="middle" className="fig-text">
          141.2 in all
        </text>
        <text x={50 + w1} y={145} textAnchor="middle" className="fig-text">
          uₓ: 17.3 → 34.6 m/s
        </text>
        <text x={44} y={130 - h1 + 4} textAnchor="end" className="fig-text">
          2.04 s
        </text>
        <text x={44} y={130 - 2 * h1 + 10} textAnchor="end" className="fig-text">
          4.08 s
        </text>
      </svg>
      <figcaption className="mt-1 text-xs text-muted">Fig. 3 · Range is uₓ × T, an area. Double both sides and the area is four tiles, not two.</figcaption>
    </figure>
  )
}

// ---------------------------------------------------------------- Home

export function Home({ s, dispatch }: P) {
  const [confirm, setConfirm] = useState(false)
  const inProgress = s.step !== 'home'
  const trialCount = s.m1.trials.length + s.m2.trials.length + s.ch.trials.length
  return (
    <div>
      <div className="mb-7">
        <Hero />
      </div>
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="rise">
          <p className="label">Projectile motion · Class 11 · 10 minutes</p>
          <h1 className="mt-1 text-[40px] leading-[1.05]">You know the formula. Do you know when it lies?</h1>
          <p className="mt-3 max-w-xl text-[17px]">
            You can already write R = u² sin 2θ / g. This lab is about what you do when nobody hands you the numbers. You predict first, the bench decides, and you explain what you saw.
          </p>

          {inProgress ? (
            <div className="sheet boxed mt-5">
              <p className="label">Saved session</p>
              <p className="mt-1 text-lg">
                You stopped at <strong>{STEP_LABEL[s.step]}</strong>, {trialCount} trial{trialCount === 1 ? '' : 's'} recorded, <span className="num">{fmtTime(s.elapsed)}</span> used.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'resume' })}>
                  Resume
                </button>
                {confirm ? (
                  <>
                    <span className="text-sm">This clears your trials and hypotheses.</span>
                    <button className="btn" onClick={() => dispatch({ type: 'start' })}>
                      Yes, start over
                    </button>
                    <button className="btn btn-quiet" onClick={() => setConfirm(false)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button className="btn" onClick={() => setConfirm(true)}>
                    Start over
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-big mt-5" onClick={() => dispatch({ type: 'start' })}>
              Start the 10 minutes
              <svg width="18" height="12" viewBox="0 0 18 12" aria-hidden="true">
                <path d="M0 6h15M10 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
          )}

          <p className="mt-4 max-w-xl text-[15px] text-muted">
            The clock counts active time only. It stops when you hit Pause &amp; leave or switch tabs, and everything is saved on this device, so you can do Mission 1 now and the rest after your next problem set.
          </p>
        </div>

        <div className="sheet rise r2">
          <p className="label mb-1">One sequence, 10 minutes</p>
          <ol className="m-0 list-none p-0">
            {(Object.keys(BUDGET) as StageId[]).map((id, i) => (
              <li key={id} className="plan-row flex items-baseline gap-3 border-b border-rule py-2.5 last:border-0" style={{ animationDelay: `${0.25 + i * 0.09}s` }}>
                <span className="num w-5 text-muted">{i + 1}</span>
                <span className="flex-1">
                  <span className="font-semibold">{STAGE_LABEL[id]}</span>
                  <span className="block text-[15px] text-muted">
                    {id === 'm1' && 'Predict what doubling the speed does. Test it. Explain it.'}
                    {id === 'm2' && 'Find the best angle from a 12 m cliff. It may not be the one you expect.'}
                    {id === 'ch' && 'Two transfer tasks, one of them on the bench.'}
                    {id === 'db' && 'Your hypotheses, first version to last, and one problem to take away.'}
                  </span>
                </span>
                <span className="num text-sm">{fmtTime(BUDGET[id])}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Predict

export function Predict({ s, dispatch, mission }: P & { mission: MissionId }) {
  const m = MISSIONS[mission]
  const [value, setValue] = useState('')
  const [choice, setChoice] = useState<string | null>(null)
  const [hypothesis, setHypothesis] = useState('')
  const [confidence, setConfidence] = useState<Confidence | null>(null)
  const number = Number(value)
  const numberOk = value.trim() !== '' && Number.isFinite(number) && number > 0 && (mission === 'm1' || number < 90)
  const ready = numberOk && hypothesis.trim().length >= 8 && confidence !== null && (!m.predictChoices || choice !== null)

  const pick = (id: string) => {
    setChoice(id)
    if (id === 'exactly') setValue('45')
    else if (value === '45') setValue('')
  }

  return (
    <div>
      <Heading kicker={`${m.title} · Predict`} title="Commit before you measure">
        <p>{m.scenario}</p>
      </Heading>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="sheet">
          <ScenarioFigure mission={mission} />
        </div>
        <form
          className="sheet space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!ready || !confidence) return
            dispatch({ type: 'predict', mission, prediction: number, choice, hypothesis: hypothesis.trim(), confidence, verdict: classifyPrediction(mission, number, choice) })
          }}
        >
          {m.predictChoices && (
            <div>
              <p className="label mb-1.5">Which angle gives the longest range?</p>
              <div className="flex flex-wrap gap-2">
                {m.predictChoices.map((c) => (
                  <button type="button" key={c.id} className="choice" aria-pressed={choice === c.id} onClick={() => pick(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="block">
            <span className="label">
              {m.predictPrompt} ({m.predictUnit})
            </span>
            <span className="mt-1.5 flex items-center gap-2">
              <input className="field num max-w-[160px] text-lg" inputMode="decimal" value={value} disabled={choice === 'exactly'} onChange={(e) => setValue(e.target.value)} placeholder="number" />
              <span className="num text-muted">{m.predictUnit}</span>
            </span>
          </label>
          <label className="block">
            <span className="label">{m.hypothesisPrompt}</span>
            <input className="field mt-1.5" value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} placeholder={m.hypothesisPlaceholder} maxLength={200} />
          </label>
          <div>
            <p className="label mb-1.5">How sure are you?</p>
            <div className="flex gap-2">
              {(['low', 'med', 'high'] as Confidence[]).map((c) => (
                <button type="button" key={c} className="choice" aria-pressed={confidence === c} onClick={() => setConfidence(c)}>
                  {c === 'med' ? 'medium' : c}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
            <button className="btn btn-primary" disabled={!ready}>
              Lock it in and go to the bench
            </button>
            <span className="text-xs text-muted">No verdict here. Your own experiment decides.</span>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- shared: hints

function Hints({ s, dispatch, mission }: P & { mission: MissionId }) {
  const level = s[mission].hintLevel
  const hints = MISSIONS[mission].hints
  return (
    <div className="sheet">
      <div className="flex items-center justify-between gap-3">
        <p className="label">Hints · {level} of 3 used</p>
        <button className="btn" disabled={level >= 3} onClick={() => dispatch({ type: 'hint', mission })}>
          {level === 0 ? 'Give me a hint' : level >= 3 ? 'No more hints' : 'A more specific hint'}
        </button>
      </div>
      {level > 0 && (
        <ol className="mt-2 space-y-1.5 pl-5 text-[16px]">
          {hints.slice(0, level).map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
      )}
      {level === 0 && <p className="mt-1 text-sm text-muted">Three levels. Each one is more specific. None of them gives the answer.</p>}
    </div>
  )
}

// ---------------------------------------------------------------- Lab screen

export function LabScreen({ s, dispatch, mission }: P & { mission: MissionId }) {
  const m = MISSIONS[mission]
  const ms = s[mission]
  const checklist = labChecklist(mission, ms)
  const flags = experimentFlags(mission, ms.trials)
  const done = checklist.every((c) => c.done)
  const interpret: Step = mission === 'm1' ? 'm1_interpret' : 'm2_interpret'
  const choiceLabel = m.predictChoices?.find((c) => c.id === ms.choice)?.label
  return (
    <div>
      <Heading kicker={`${m.title} · Experiment`} title="Lab bench">
        <p>{m.labBrief}</p>
      </Heading>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="chip">
          <span className="label">Your prediction</span>
          <strong className="num">{mission === 'm1' ? `${ms.prediction} m` : `${choiceLabel}, about ${ms.prediction}°`}</strong>
          <span className="text-muted">locked in</span>
        </span>
        {checklist.map((c) => (
          <span key={c.label} className={`chip ${c.done ? 'border-ok text-ok' : ''}`}>
            <span aria-hidden="true">{c.done ? '✓' : '○'}</span>
            {c.label}
          </span>
        ))}
      </div>

      <Lab
        start={m.start}
        locks={m.locks}
        trials={ms.trials}
        xVar={m.variable}
        ratioColumns={mission === 'm1'}
        counts={(t) => isControlled(mission, t)}
        onRecord={(shot) => dispatch({ type: 'trial', scope: mission, shot })}
        aside={
          /* The app's response to HOW he experiments, as margin notes. In the margin so the controls never jump. */
          <div className="space-y-2" role="status" aria-live="polite">
            {flags.length > 0 && <p className="label">Notes on your method</p>}
            {flags.map((f) => (
              <p key={f.id} className="note m-0">
                {f.text}
              </p>
            ))}
          </div>
        }
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <Hints s={s} dispatch={dispatch} mission={mission} />
        <div className="flex flex-col items-start gap-1.5 lg:items-end">
          <button className="btn btn-primary" disabled={!done} onClick={() => dispatch({ type: 'goto', step: interpret })}>
            {ms.attempts > 0 ? 'Back to your conclusion' : 'I have enough data. Interpret'}
          </button>
          {!done && <span className="text-xs text-muted">Finish the two checks above first.</span>}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Interpret & revise

export function Interpret({ s, dispatch, mission }: P & { mission: MissionId }) {
  const m = MISSIONS[mission]
  const ms = s[mission]
  const gap = gapCard(mission, ms)
  const lastHypothesis = ms.hypotheses[ms.hypotheses.length - 1] ?? ''
  const [relation, setRelation] = useState<string | null>(ms.relation)
  const [explanation, setExplanation] = useState(ms.explanation)
  const [hypothesis, setHypothesis] = useState(lastHypothesis)
  const [loading, setLoading] = useState(false)
  const coach = ms.coach[ms.coach.length - 1]
  const lab: Step = mission === 'm1' ? 'm1_lab' : 'm2_lab'
  const next: Step = mission === 'm1' ? 'm2_predict' : 'challenge'
  const ready = relation !== null && explanation.trim().length >= 10 && hypothesis.trim().length >= 8 && !loading

  async function submit() {
    if (!relation) return
    const rule = classifyRelation(mission, relation)
    const attempt = ms.attempts + 1
    let explanationOk = explanationNamesMechanism(mission, explanation)
    let question: string | undefined
    let suggest = ''
    let source: CoachMsg['source'] = 'offline'
    const ai = { called: false, fallbackReason: null as string | null, ms: null as number | null }

    if (s.aiEnabled) {
      setLoading(true)
      const label = m.relationOptions.find((o) => o.id === relation)?.label ?? relation
      const r = await askCoach(mission, ms, { relation: label, explanation, hypothesis, ruleVerdict: rule })
      setLoading(false)
      ai.called = true
      ai.ms = r.ms
      if (r.ok && r.question) {
        source = 'ai'
        explanationOk = r.explanationOk === true
        question = r.question
        suggest = r.suggest ?? ''
      } else {
        ai.fallbackReason = r.reason ?? 'unknown'
      }
    } else {
      ai.fallbackReason = 'ai_turned_off'
    }

    // The rule verdict wins. The AI can only say whether the explanation names the mechanism.
    const verdict = finalVerdict(rule, explanationOk)
    const written = m.feedback[verdict]
    dispatch({
      type: 'conclude',
      mission,
      relation,
      explanation: explanation.trim(),
      hypothesis: hypothesis.trim(),
      verdict,
      resolved: isResolved(verdict, attempt),
      coach: { source, verdict, line: written.line, question: question ?? written.question, suggest, attempt },
      ai,
    })
  }

  return (
    <div>
      <Heading kicker={`${m.title} · Interpret & revise`} title={gap.refuted ? 'Your prediction did not survive' : 'Your prediction held'} />

      <section className={`sheet boxed mb-5 ${gap.refuted ? 'border-bad' : 'border-ok'}`} aria-label="Prediction gap">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="label">Prediction gap</p>
          <span className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${gap.refuted ? 'bg-[#fbe3da] text-bad' : 'bg-okbg text-ok'}`}>
            {gap.refuted ? 'Prediction refuted' : 'Prediction confirmed'}
          </span>
        </div>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted">You predicted</p>
            <p className="num text-[28px] font-semibold leading-tight">{gap.predicted}</p>
            <p className="text-sm text-muted">confidence: {ms.confidence === 'med' ? 'medium' : ms.confidence}</p>
          </div>
          <div>
            <p className="text-sm text-muted">You measured</p>
            <p className={`num text-[28px] font-semibold leading-tight ${gap.refuted ? 'text-bad' : 'text-ok'}`}>{gap.measured}</p>
            {gap.rows && <p className="num text-sm">{gap.rows}</p>}
          </div>
        </div>
        {gap.bars && (
          <div className="mt-3 space-y-1.5" aria-hidden="true">
            {[
              { name: 'predicted', value: gap.bars.predicted, cls: 'bg-ink' },
              { name: 'measured', value: gap.bars.measured, cls: gap.refuted ? 'bg-bad' : 'bg-ok' },
            ].map((b) => (
              <div key={b.name} className="flex items-center gap-2">
                <span className="num w-[74px] text-xs text-muted">{b.name}</span>
                <div className="flex-1">
                  <div className={`gap-bar ${b.cls}`} style={{ width: `${Math.max(2, (100 * b.value) / Math.max(gap.bars!.predicted, gap.bars!.measured))}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 border-t border-rule pt-3 text-[16px]">
          {gap.refuted && ms.confidence === 'high' && <strong>You were sure, which makes this worth your time. </strong>}
          {gap.question}
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="sheet space-y-4">
          <div>
            <p className="label mb-1.5">{m.relationQuestion}</p>
            <div className="flex flex-wrap gap-2">
              {m.relationOptions.map((o) => (
                <button key={o.id} className="choice" aria-pressed={relation === o.id} disabled={ms.resolved} onClick={() => setRelation(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="label">{m.explainPrompt}</span>
            <textarea className="field mt-1.5" rows={3} value={explanation} disabled={ms.resolved} onChange={(e) => setExplanation(e.target.value)} maxLength={500} placeholder="In your own words." />
          </label>
          <label className="block">
            <span className="label">Your hypothesis · keep it or rewrite it</span>
            <textarea className="field mt-1.5" rows={2} value={hypothesis} disabled={ms.resolved} onChange={(e) => setHypothesis(e.target.value)} maxLength={200} />
            <span className="text-xs text-muted">
              {hypothesis.trim() === lastHypothesis.trim() ? 'Unchanged from your last version.' : 'Edited: this will be saved as a revision.'}
              {ms.hypotheses.length > 1 && ` ${ms.hypotheses.length - 1} revision${ms.hypotheses.length > 2 ? 's' : ''} so far.`}
            </span>
          </label>
          {!ms.resolved && (
            <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4">
              <button className="btn btn-primary" disabled={!ready} onClick={submit}>
                {loading ? 'Coach is reading…' : ms.attempts === 0 ? 'Submit conclusion' : 'Submit revised conclusion'}
              </button>
              <button className="btn" onClick={() => dispatch({ type: 'goto', step: lab })}>
                Back to the bench
              </button>
              {ms.attempts > 0 && <span className="text-xs text-muted">Attempt {ms.attempts} of 3 used</span>}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {coach ? (
            <section className="sheet" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="label">{coach.source === 'ai' ? 'AI coach · checked before you see it' : 'Offline coach (recorded feedback)'}</p>
                <Tag verdict={coach.verdict} />
              </div>
              <p className="mt-2 font-semibold">{coach.line}</p>
              <p className="mt-1 text-[16px]">{coach.question}</p>
              {coach.suggest && (
                <p className="mt-2 text-sm">
                  <span className="label">Try next </span>
                  {coach.suggest}
                </p>
              )}
              {!ms.resolved && <p className="mt-3 border-t border-rule pt-2 text-sm text-muted">Go back to the bench if you need more trials, then revise your conclusion on the left. The explanation appears once you have committed to one.</p>}
            </section>
          ) : (
            <section className="sheet text-sm text-muted">
              <p className="label mb-1">Coach</p>
              Commit to a conclusion first. You get one question back, not the answer.
            </section>
          )}

          {ms.resolved && (
            <section className="sheet boxed">
              <p className="label">{ms.verdict === 'correct' ? 'Model explanation' : 'Model explanation, using your own table'}</p>
              <p className="mt-1.5 text-[16px]">{ms.verdict === 'correct' || ms.verdict === 'partial' ? m.modelAnswer : modelFromOwnRows(mission, ms.trials)}</p>
              {mission === 'm1' && (
                <div className="mt-3">
                  <AreaFigure />
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-rule pt-3">
                <button className="btn btn-primary" onClick={() => dispatch({ type: 'goto', step: next })}>
                  {mission === 'm1' ? 'On to Mission 2' : 'On to the Challenge'}
                </button>
                <button className="btn" onClick={() => dispatch({ type: 'goto', step: lab })}>
                  Bench: take one more shot
                </button>
              </div>
            </section>
          )}

          {!ms.resolved && <Hints s={s} dispatch={dispatch} mission={mission} />}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- Challenge

export function Challenge({ s, dispatch }: P) {
  const ch = s.ch
  const [answer, setAnswer] = useState('')
  const t5 = CHALLENGE.t5
  const t6 = CHALLENGE.t6
  const t5Open = ch.t5Verdict === 'correct' || ch.t5Attempts >= 2
  const hits = t6Hits(ch.trials)
  const done6 = t6Done(ch.trials)
  const lastShot = ch.trials[ch.trials.length - 1]

  return (
    <div>
      <Heading kicker={`Challenge · Task ${ch.task} of 6`} title={ch.task === 5 ? 'Same range, another angle' : 'Hit the target twice'}>
        <p>{ch.task === 5 ? t5.prompt : t6.prompt}</p>
      </Heading>

      {ch.task === 5 ? (
        <div className="mb-5 grid gap-4 lg:grid-cols-2">
          <form
            className="sheet space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(answer)
              if (answer.trim() === '' || !Number.isFinite(n)) return
              dispatch({ type: 't5', answer: n, verdict: classifyT5(n) })
            }}
          >
            <label className="block">
              <span className="label">The other angle (°)</span>
              <span className="mt-1.5 flex items-center gap-2">
                <input className="field num max-w-[140px] text-lg" inputMode="decimal" value={answer} disabled={ch.t5Verdict === 'correct'} onChange={(e) => setAnswer(e.target.value)} placeholder="angle" />
                <button className="btn" disabled={ch.t5Verdict === 'correct' || answer.trim() === ''}>
                  Check
                </button>
              </span>
            </label>
            {ch.t5Verdict && (
              <div>
                <Tag verdict={ch.t5Verdict} />
                <p className="mt-1.5 text-[16px]">{t5.feedback[ch.t5Verdict === 'partial' ? 'other' : ch.t5Verdict]}</p>
                {ch.t5Verdict !== 'correct' && ch.t5Attempts >= 2 && <p className="mt-1.5 text-[16px]"><span className="label">Model answer </span>{t5.model}</p>}
              </div>
            )}
          </form>

          <div className={`sheet space-y-3 ${t5Open ? '' : 'opacity-50'}`}>
            <p className="label">Follow-up</p>
            <p className="text-[16px]">{t5.followPrompt}</p>
            <div className="flex gap-2">
              {(['yes', 'no'] as const).map((v) => (
                <button key={v} className="choice" disabled={!t5Open || ch.t5Follow !== null} aria-pressed={ch.t5Follow === v} onClick={() => dispatch({ type: 't5follow', answer: v })}>
                  {v}
                </button>
              ))}
            </div>
            {ch.t5Follow && (
              <div>
                <Tag verdict={ch.t5Follow === 'no' ? 'correct' : 'other'} />
                <p className="mt-1.5 text-[16px]">{ch.t5Follow === 'no' ? t5.followFeedback.correct : t5.followFeedback.misconception}</p>
              </div>
            )}
            <div className="border-t border-rule pt-3">
              <button className="btn btn-primary" disabled={ch.t5Follow === null} onClick={() => dispatch({ type: 'chTask', task: 6 })}>
                Next: hit the target
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="sheet mb-5 flex flex-wrap items-center gap-x-6 gap-y-2">
          <p className="m-0">
            <span className="label">Hits </span>
            <strong className="num">{hits.length > 0 ? hits.map((a) => a + '°').join(' and ') : 'none yet'}</strong>
          </p>
          <p className="m-0 flex-1 text-[16px]">
            {done6
              ? t6.feedback.correct
              : hits.length === 1
                ? t6.feedback.one
                : lastShot
                  ? `Last shot landed ${Math.abs(lastShot.range - t6.target.x).toFixed(1)} m ${lastShot.range < t6.target.x ? 'short' : 'long'}. Adjust one way and compare.`
                  : t6.feedback.none}
          </p>
          <button className="btn btn-primary" disabled={!done6} onClick={() => dispatch({ type: 'goto', step: 'debrief' })}>
            Debrief
          </button>
          {!done6 && (
            <button className="btn btn-quiet" onClick={() => dispatch({ type: 'goto', step: 'debrief' })}>
              Out of time: skip to debrief
            </button>
          )}
        </div>
      )}

      <Lab
        key={ch.task}
        start={{ u: 30, angle: ch.task === 5 ? 27 : 40, h: 0 }}
        locks={ch.task === 5 ? { u: 30 } : { u: 30, h: 0 }}
        trials={ch.trials}
        xVar="angle"
        target={ch.task === 6 ? t6.target : undefined}
        onRecord={(shot) => dispatch({ type: 'trial', scope: 'ch', shot })}
      />
      {ch.task === 5 && <p className="mt-2 text-sm text-muted">The bench is free to use here. Speed is locked at 30 m/s. Raise h to 12 m to test the follow-up.</p>}
    </div>
  )
}

// ---------------------------------------------------------------- Debrief

export function downloadLog(s: Session) {
  const data = { identity: IDENTITY, exportedAt: new Date().toISOString(), elapsedSeconds: s.elapsed, stageSeconds: s.stageTime, step: s.step, m1: s.m1, m2: s.m2, challenge: s.ch, events: s.log }
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'range-lab-log-23b0702.json'
  a.click()
  URL.revokeObjectURL(url)
}

export function Debrief({ s, dispatch }: P) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <Heading kicker="Debrief" title="What changed in your head">
        <p>
          Time used <strong className="num">{fmtTime(s.elapsed)}</strong> of 10:00. Below: each hypothesis from first version to last, and what your data did to it.
        </p>
      </Heading>

      <div className="grid gap-5 lg:grid-cols-2">
        {(['m1', 'm2'] as MissionId[]).map((id) => {
          const m = MISSIONS[id]
          const ms = s[id]
          const showed = ms.predVerdict === 'misconception' || ms.coach.some((c) => c.verdict === 'misconception')
          return (
            <section key={id} className="sheet">
              <p className="label">{m.title}</p>
              {ms.hypotheses.length === 0 ? (
                <p className="mt-2 text-sm text-muted">Not attempted in this session.</p>
              ) : (
                <>
                  <ol className="mt-2 space-y-1.5 pl-0">
                    {ms.hypotheses.map((h, i) => (
                      <li key={i} className="flex gap-2 text-[16px]">
                        <span className="num shrink-0 text-muted">{i === 0 ? 'v1' : `v${i + 1}`}</span>
                        <span className={i < ms.hypotheses.length - 1 ? 'text-muted line-through decoration-rule' : 'font-medium'}>{h}</span>
                      </li>
                    ))}
                  </ol>
                  <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-rule pt-3 text-sm">
                    <dt className="text-muted">Prediction</dt>
                    <dd className="m-0">{ms.predVerdict ? <Tag verdict={ms.predVerdict} /> : '—'}</dd>
                    <dt className="text-muted">Misconception seen</dt>
                    <dd className="m-0">{showed ? m.misconceptionName : 'none'}</dd>
                    <dt className="text-muted">Trials · hints · conclusions</dt>
                    <dd className="num m-0">
                      {ms.trials.length} · {ms.hintLevel} · {ms.attempts}
                    </dd>
                  </dl>
                </>
              )}
              <p className="mt-3 border-t border-rule pt-3 text-[16px]">
                <span className="label">Model explanation </span>
                {m.modelAnswer}
              </p>
            </section>
          )
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="sheet">
          <AreaFigure />
          <div className="mt-4">
            <MiniBench
              h={12}
              xMax={22}
              yMax={16}
              shots={[
                { u: 10, angle: 45, cls: 'fig-dash', label: '17.3' },
                { u: 10, angle: 29, cls: 'fig-accent draw', label: '18.7 m' },
              ]}
              caption="Fig. 4 · From 12 m at 10 m/s: 29° (solid) out-throws 45° (dashed). The flatter shot spends the fall moving forward faster."
            />
          </div>
        </section>
        <section className="sheet">
          <p className="label">Time against budget</p>
          <table className="trials mt-1">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Stage</th>
                <th>Used</th>
                <th>Budget</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(BUDGET) as StageId[]).map((id) => (
                <tr key={id}>
                  <td style={{ textAlign: 'left', fontFamily: 'var(--font-sans)' }}>{STAGE_LABEL[id]}</td>
                  <td className={s.stageTime[id] > BUDGET[id] ? 'strong' : ''}>{fmtTime(s.stageTime[id])}</td>
                  <td>{fmtTime(BUDGET[id])}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="label mt-5">Take away</p>
          <p className="mt-1 text-[16px]">{EXTENSION.prompt}</p>
          <button className="btn mt-2" onClick={() => setShow(!show)} aria-expanded={show}>
            {show ? 'Hide derivation result' : 'Show derivation result'}
          </button>
          {show && <p className="num mt-2 border border-ink bg-white px-3 py-2 text-sm">{EXTENSION.result}</p>}

          <div className="mt-5 flex flex-wrap gap-3 border-t border-rule pt-4">
            <button className="btn" onClick={() => downloadLog(s)}>
              Download log (JSON)
            </button>
            <button className="btn" onClick={() => dispatch({ type: 'reset' })}>
              Finish and clear session
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- About

export function About({ s, dispatch }: P) {
  return (
    <div>
      <Heading kicker="About" title="About this lab" />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="sheet">
          <p className="label">Identity</p>
          <p className="num mt-1 text-lg font-semibold">{IDENTITY}</p>
          <table className="mt-3 w-full border-collapse text-sm">
            <tbody>
              {[
                ['Roll no.', '23B0702'],
                ['P5', 'Inquiry-based virtual laboratory'],
                ['T10', 'Projectile motion: angle and speed vs range (Cl. 11)'],
                ['L6', 'High-achieving learner preparing for an Olympiad, bored by routine practice'],
                ['C4', '10-minute sessions: one sequence in 10 minutes, stop and resume'],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-rule last:border-0">
                  <th className="num w-20 py-1.5 pr-3 text-left align-top font-semibold">{k}</th>
                  <td className="py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="label mt-5">Learning outcomes</p>
          <ol className="mt-1 space-y-1 pl-5 text-sm">
            {OUTCOMES.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ol>
        </section>

        <section className="sheet">
          <p className="label">Who it is for</p>
          <p className="mt-1">
            <strong>{PERSONA.name}</strong>. {PERSONA.line}
          </p>
          <p className="mt-2 text-sm">{PERSONA.prior}</p>
          <p className="mt-2 text-sm">{PERSONA.context}</p>
          <p className="mt-2 text-sm">{PERSONA.motivation}</p>
          <ul className="mt-2 space-y-1 pl-5 text-sm">
            {PERSONA.misconceptions.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>

        <section className="sheet">
          <p className="label">What the AI does</p>
          <p className="mt-1 text-sm">
            One feature: an inquiry coach on the Interpret screen. It reads your hypothesis, prediction, trials and explanation, and asks one question. It never calculates: every number on screen comes from the app's own physics code.
          </p>
          <p className="mt-2 text-sm">
            Its output is checked in code before you see it: valid format, an allowed verdict, a length limit, and a filter that rejects anything stating the relationship, a formula or the best angle. The app's own rules decide whether a conclusion is right. If the AI is slow, down or fails a check, you get the written feedback instead, labelled "offline coach (recorded feedback)".
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" className="h-4 w-4 accent-[var(--color-accent)]" checked={s.aiEnabled} onChange={() => dispatch({ type: 'toggleAi' })} />
            AI coach on {s.aiEnabled ? '' : '(off: recorded feedback only)'}
          </label>
        </section>

        <section className="sheet">
          <p className="label">Your data</p>
          <p className="mt-1 text-sm">
            Nothing leaves this device except the coach request. Predictions, trials, hints, revisions and timings are logged locally ({s.log.length} events) for evaluation.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button className="btn" onClick={() => downloadLog(s)}>
              Download log (JSON)
            </button>
            <button className="btn" onClick={() => dispatch({ type: 'reset' })}>
              Clear saved session
            </button>
          </div>
          <p className="label mt-5">Credits</p>
          <p className="mt-1 text-sm">
            Simulation idea inspired by the Virtual Physics Lab repository; no code from it is used. Built with Vite, React, TypeScript and Tailwind CSS, one Vercel serverless function, and the hyde/glm-5.3-flash model through the Hyde inference gateway. Fonts: Fraunces and IBM Plex.
          </p>
        </section>
      </div>
      <div className="mt-5">
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'view', view: 'main' })}>
          Back to the lab
        </button>
      </div>
    </div>
  )
}
