// App shell: top bar (stepper, timer, Pause & leave), the current screen, and the identity footer.

import { useEffect, useReducer } from 'react'
import { BUDGET, IDENTITY, SESSION_SECONDS, type StageId } from './content'
import { About, Challenge, Debrief, Home, Interpret, LabScreen, Predict } from './screens'
import { fmtTime, loadSession, reducer, saveSession, stageOf, STEP_LABEL, type Session } from './store'

const STAGES: { id: StageId; name: string }[] = [
  { id: 'm1', name: 'Mission 1' },
  { id: 'm2', name: 'Mission 2' },
  { id: 'ch', name: 'Challenge' },
  { id: 'db', name: 'Debrief' },
]

export default function App() {
  const [s, dispatch] = useReducer(reducer, undefined, loadSession)

  // C4: every state change is saved, so closing the tab loses nothing.
  useEffect(() => saveSession(s), [s])

  // C4: the clock counts ACTIVE time only. It stops when paused, on About, and when the tab is hidden.
  const running = !s.paused && s.view === 'main' && s.step !== 'home'
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (!document.hidden) dispatch({ type: 'tick' })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  const showHome = s.step === 'home' || s.paused
  const over = s.elapsed >= SESSION_SECONDS

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hatching for the cliff in every figure (textbook style). */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fff" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#8b9198" strokeWidth="1" />
          </pattern>
        </defs>
      </svg>
      <TopBar s={s} onPause={() => dispatch({ type: 'pause' })} onAbout={() => dispatch({ type: 'view', view: s.view === 'about' ? 'main' : 'about' })} />

      {over && !s.overDismissed && s.step !== 'debrief' && !showHome && s.view === 'main' && (
        <div className="border-b border-rule bg-warnbg">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-3 px-5 py-2 text-sm">
            <strong>10:00 used.</strong>
            <span>You are not locked out. Finish this step, or jump to the debrief now.</span>
            <button className="btn ml-auto" onClick={() => dispatch({ type: 'goto', step: 'debrief' })}>
              Jump to debrief
            </button>
            <button className="btn btn-quiet" onClick={() => dispatch({ type: 'dismissOver' })}>
              Keep going
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-6">
        {s.view === 'about' ? (
          <About s={s} dispatch={dispatch} />
        ) : showHome ? (
          <Home s={s} dispatch={dispatch} />
        ) : s.step === 'm1_predict' ? (
          <Predict key="m1" s={s} dispatch={dispatch} mission="m1" />
        ) : s.step === 'm1_lab' ? (
          <LabScreen key="m1" s={s} dispatch={dispatch} mission="m1" />
        ) : s.step === 'm1_interpret' ? (
          <Interpret key="m1" s={s} dispatch={dispatch} mission="m1" />
        ) : s.step === 'm2_predict' ? (
          <Predict key="m2" s={s} dispatch={dispatch} mission="m2" />
        ) : s.step === 'm2_lab' ? (
          <LabScreen key="m2" s={s} dispatch={dispatch} mission="m2" />
        ) : s.step === 'm2_interpret' ? (
          <Interpret key="m2" s={s} dispatch={dispatch} mission="m2" />
        ) : s.step === 'challenge' ? (
          <Challenge s={s} dispatch={dispatch} />
        ) : (
          <Debrief s={s} dispatch={dispatch} />
        )}
      </main>

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs text-muted">
          <span className="num font-semibold text-ink">{IDENTITY}</span>
          <span>Range Lab · saved on this device · {s.aiEnabled ? 'AI coach on' : 'AI coach off'}</span>
        </div>
      </footer>
    </div>
  )
}

function TopBar({ s, onPause, onAbout }: { s: Session; onPause: () => void; onAbout: () => void }) {
  const current = stageOf(s.step)
  const currentIndex = STAGES.findIndex((x) => x.id === current)
  const over = s.elapsed >= SESSION_SECONDS
  const active = s.step !== 'home' && !s.paused
  return (
    <header className="sticky top-0 z-10 border-b-[1.5px] border-ink bg-white">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5">
        <div className="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="6" fill="var(--color-ink)" />
            <path d="M5 25 Q16 -4 27 25" fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="font-serif text-lg font-semibold">Range Lab</span>
        </div>

        <ol className="order-last m-0 grid w-full list-none grid-cols-4 gap-1 p-0 lg:order-none lg:w-auto lg:flex-1" aria-label="Progress">
          {STAGES.map((stage, i) => {
            const state = current === stage.id ? 'now' : currentIndex > i ? 'done' : 'todo'
            return (
              <li
                key={stage.id}
                aria-current={state === 'now' ? 'step' : undefined}
                className={`min-w-0 border-t-[3px] px-2 pt-1 ${state === 'now' ? 'border-accent' : state === 'done' ? 'border-ink' : 'border-rule'}`}
              >
                <span className={`block text-[13px] leading-tight ${state === 'now' ? 'font-semibold' : state === 'todo' ? 'text-muted' : ''}`}>
                  {state === 'done' ? '✓ ' : ''}
                  {stage.name}
                </span>
                <span className={`num block text-[11px] ${s.stageTime[stage.id] > BUDGET[stage.id] ? 'text-accent-dark' : 'text-muted'}`}>
                  {fmtTime(s.stageTime[stage.id])} / {fmtTime(BUDGET[stage.id])}
                </span>
              </li>
            )
          })}
        </ol>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right" aria-label="Active time used">
            <span className={`num block text-lg font-semibold leading-none ${over ? 'text-accent-dark' : ''}`}>
              {fmtTime(s.elapsed)}
              <span className="text-sm font-normal text-muted"> / 10:00</span>
            </span>
            <span className="block text-[11px] text-muted">{s.step === 'home' ? 'not started' : s.paused ? 'paused' : s.view === 'about' ? 'paused on About' : STEP_LABEL[s.step]}</span>
          </div>
          {active && (
            <button className="btn" onClick={onPause}>
              Pause &amp; leave
            </button>
          )}
          <button className="btn btn-quiet" onClick={onAbout}>
            {s.view === 'about' ? 'Close About' : 'About'}
          </button>
        </div>
      </div>
    </header>
  )
}
