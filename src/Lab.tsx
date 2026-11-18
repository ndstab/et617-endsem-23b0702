// The lab bench: sliders, launch, trajectory with ghost trails, readouts, trials table, scatter plot.
// It only draws and collects launches. What the trials MEAN is decided in rules.ts.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { components, G, position, shoot, type Shot } from './physics'
import type { Trial } from './store'

type Vars = { u: number; angle: number; h: number }

interface Props {
  start: Vars
  locks: Partial<Vars>
  trials: Trial[]
  onRecord: (shot: Shot) => void
  /** Trials that count for the mission question (controlled ones). Others are drawn hollow. */
  counts?: (t: Trial) => boolean
  xVar: 'u' | 'angle'
  ratioColumns?: boolean
  target?: { x: number; tol: number }
  /** Margin notes shown beside the bench (the app's remarks on how he experiments). */
  aside?: ReactNode
}

const RANGES = { u: [5, 50], angle: [5, 85], h: [0, 30] } as const
const f1 = (x: number) => x.toFixed(1)

/** 1, 2, 5, 10, 20, 50 ... the tick spacing closest to `rough`. */
function niceStep(rough: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const n = rough / pow
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow
}

/** A longer time in the air really does take longer on screen (0.9 s to 1.7 s). */
const flightMs = (s: Shot) => Math.max(900, Math.min(1700, 500 + s.time * 220))

export default function Lab({ start, locks, trials, onRecord, counts = () => true, xVar, ratioColumns, target, aside }: Props) {
  const last = trials[trials.length - 1]
  const [vars, setVars] = useState<Vars>({ ...(last ? { u: last.u, angle: last.angle, h: last.h } : start), ...locks })
  const [shot, setShot] = useState<Shot | null>(null)
  const [progress, setProgress] = useState(0) // 0..1 along the flight
  const [column, setColumn] = useState<'none' | 'u' | 'u2' | 'sqrt'>('none')
  const [vectors, setVectors] = useState(true)
  const frame = useRef(0)
  const landTimer = useRef(0)

  const stopAnimation = () => {
    cancelAnimationFrame(frame.current)
    clearTimeout(landTimer.current)
  }
  useEffect(() => stopAnimation, [])

  const set = (key: keyof Vars, value: number) => {
    stopAnimation()
    setShot(null)
    setProgress(0)
    setVars((v) => ({ ...v, [key]: value }))
  }

  const launch = () => {
    stopAnimation()
    const next = shoot(vars.u, vars.angle, vars.h)
    setShot(next)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setProgress(1)
    const ms = flightMs(next)
    // The ball always lands, even if the browser pauses animation frames.
    landTimer.current = window.setTimeout(() => {
      cancelAnimationFrame(frame.current)
      setProgress(1)
    }, ms + 50)
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      setProgress(p)
      if (p < 1) frame.current = requestAnimationFrame(step)
    }
    setProgress(0)
    frame.current = requestAnimationFrame(step)
  }

  const flying = shot !== null && progress > 0 && progress < 1
  const landed = shot !== null && progress >= 1
  const already = trials.some((t) => t.u === vars.u && t.angle === vars.angle && t.h === vars.h)

  // ----- bench geometry: the same scale on both axes, so 30° looks like 30° -----
  const W = 760
  const H = 330
  const ox = 64 // launch point x
  const gy = H - 36 // ground y
  const xWorld = Math.max(24, ...trials.map((t) => t.range), shot?.range ?? 0, target ? target.x + target.tol : 0) * 1.1
  const yWorld = Math.max(8, vars.h, ...trials.map((t) => t.maxH), shot?.maxH ?? 0) * 1.14
  const scale = Math.min((W - ox - 22) / xWorld, (gy - 14) / yWorld)
  const sx = (x: number) => ox + x * scale
  const sy = (y: number) => gy - y * scale
  const xSpan = (W - ox - 22) / scale
  const ySpan = (gy - 14) / scale
  const tick = niceStep(xSpan / 8)
  const xTicks = Array.from({ length: Math.floor(xSpan / tick) + 1 }, (_, i) => i * tick)
  const yTicks = Array.from({ length: Math.floor(ySpan / tick) + 1 }, (_, i) => i * tick)

  const path = (s: Shot, upTo = 1) => {
    const points: string[] = []
    for (let i = 0; i <= 48; i++) {
      const p = position(s.u, s.angle, s.h, (s.time * upTo * i) / 48)
      points.push(`${sx(p.x).toFixed(1)},${sy(Math.max(0, p.y)).toFixed(1)}`)
    }
    return 'M' + points.join(' L')
  }
  const tNow = shot ? shot.time * progress : 0
  const ball = shot ? position(shot.u, shot.angle, shot.h, tNow) : { x: 0, y: vars.h }
  const aim = (vars.angle * Math.PI) / 180

  // Strobe: the ball's position at equal time steps, like a multi-flash photograph.
  const strobeStep = shot ? niceStep(shot.time / 12) : 1
  const strobe = shot ? Array.from({ length: Math.floor(tNow / strobeStep) }, (_, i) => position(shot.u, shot.angle, shot.h, (i + 1) * strobeStep)) : []

  // Velocity components on the ball while it flies.
  const v = shot ? { x: components(shot.u, shot.angle).ux, y: components(shot.u, shot.angle).uy - G * tNow } : { x: 0, y: 0 }
  const vScale = 1.5 // px per m/s
  const hit = landed && shot && target ? Math.abs(shot.range - target.x) <= target.tol : false

  const extra = (t: Trial) => (column === 'u' ? t.range / t.u : column === 'u2' ? t.range / (t.u * t.u) : t.range / Math.sqrt(t.u))
  const extraLabel = { none: '', u: 'R ÷ u', u2: 'R ÷ u²', sqrt: 'R ÷ √u' }[column]

  return (
    <div className="grid gap-x-7 gap-y-4 lg:grid-cols-[minmax(0,1fr)_292px]">
      <div className="min-w-0">
        <figure className="sheet boxed overflow-hidden !p-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Projectile trajectory on the lab bench">
            {/* graph paper */}
            {xTicks.map((x) => (
              <line key={'gx' + x} x1={sx(x)} x2={sx(x)} y1={14} y2={gy} className="grid-line" />
            ))}
            {yTicks.map((y) => (
              <line key={'gy' + y} x1={ox} x2={W - 22} y1={sy(y)} y2={sy(y)} className="grid-line" />
            ))}
            {/* cliff / launch platform */}
            {vars.h > 0 && (
              <g>
                <rect x={10} y={sy(vars.h)} width={ox - 10} height={vars.h * scale} className="cliff" />
                <line x1={10} x2={ox} y1={sy(vars.h)} y2={sy(vars.h)} className="ink-line" />
                <line x1={ox} x2={ox} y1={sy(vars.h)} y2={gy} className="ink-line" />
                <text x={ox - 8} y={sy(vars.h) - 6} textAnchor="end" className="axis-text">
                  h = {vars.h} m
                </text>
              </g>
            )}
            {/* ground with a metre scale */}
            <line x1={10} x2={W - 10} y1={gy} y2={gy} className="ink-line" strokeWidth={1.6} />
            {xTicks.map((x) => (
              <g key={'t' + x}>
                <line x1={sx(x)} x2={sx(x)} y1={gy} y2={gy + 6} className="ink-line" />
                <text x={sx(x)} y={gy + 19} textAnchor="middle" className="axis-text">
                  {x}
                </text>
              </g>
            ))}
            <text x={W - 12} y={gy + 31} textAnchor="end" className="axis-text">
              distance (m)
            </text>
            {yTicks
              .filter((y) => y > 0)
              .map((y) => (
                <text key={'yt' + y} x={W - 18} y={sy(y) + 3} textAnchor="end" className="axis-text faint">
                  {y} m
                </text>
              ))}
            {/* target zone (challenge) */}
            {target && (
              <g className={hit ? 'target-hit' : ''}>
                <rect x={sx(target.x - target.tol)} y={gy - 5} width={2 * target.tol * scale} height={10} className="target" />
                <line x1={sx(target.x)} x2={sx(target.x)} y1={gy - 5} y2={gy - 30} className="target-pole" />
                <text x={sx(target.x)} y={gy - 34} textAnchor="middle" className="axis-text target-text">
                  {hit ? 'hit' : `target ${target.x} m`}
                </text>
              </g>
            )}
            {/* ghost trails of recorded trials */}
            {trials.map((t) => (
              <g key={t.n}>
                <path d={path(t)} className={counts(t) ? 'ghost' : 'ghost stray'} />
                <text x={sx(t.range)} y={gy - 6} textAnchor="middle" className="axis-text faint">
                  #{t.n}
                </text>
              </g>
            ))}
            {/* aim arrow and angle arc */}
            <g>
              <line x1={sx(0)} y1={sy(vars.h)} x2={sx(0) + 46} y2={sy(vars.h)} className="aim-base" />
              <line x1={sx(0)} y1={sy(vars.h)} x2={sx(0) + 44 * Math.cos(aim)} y2={sy(vars.h) - 44 * Math.sin(aim)} className="aim" markerEnd="url(#arrow)" />
              <path d={`M${sx(0) + 22},${sy(vars.h)} A22,22 0 0 0 ${sx(0) + 22 * Math.cos(aim)},${sy(vars.h) - 22 * Math.sin(aim)}`} className="aim-arc" />
              <text x={sx(0) + 34 * Math.cos(aim / 2) + 4} y={sy(vars.h) - 34 * Math.sin(aim / 2) + 4} className="axis-text">
                {vars.angle}°
              </text>
            </g>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="aim-head" />
              </marker>
              <marker id="vhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="vec-head" />
              </marker>
            </defs>
            {/* the live shot: path, strobe marks, velocity components, ball */}
            {shot && <path d={path(shot, progress)} className="live" />}
            {strobe.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(Math.max(0, p.y))} r={2.6} className="strobe" />
            ))}
            {flying && vectors && (
              <g>
                <line x1={sx(ball.x)} y1={sy(ball.y)} x2={sx(ball.x) + v.x * vScale} y2={sy(ball.y)} className="vec" markerEnd="url(#vhead)" />
                {Math.abs(v.y) > 1 && <line x1={sx(ball.x)} y1={sy(ball.y)} x2={sx(ball.x)} y2={sy(ball.y) - v.y * vScale} className="vec" markerEnd="url(#vhead)" />}
                <text x={sx(ball.x) + v.x * vScale + 5} y={sy(ball.y) + 4} className="vec-text">
                  uₓ
                </text>
              </g>
            )}
            <circle cx={sx(ball.x)} cy={sy(Math.max(0, ball.y))} r={5.5} className="ball" />
            {landed && shot && (
              <g>
                <circle key={`${shot.u}-${shot.angle}-${shot.h}`} cx={sx(shot.range)} cy={gy} r={6} className="ripple" />
                <line x1={sx(shot.range)} x2={sx(shot.range)} y1={gy} y2={gy - 16} className="live-mark" />
                <text x={Math.min(sx(shot.range), W - 40)} y={gy - 21} textAnchor="middle" className="live-text">
                  {f1(shot.range)} m
                </text>
              </g>
            )}
          </svg>
          <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-ink px-4 py-2.5">
            <Readout label={landed ? 'Range' : 'Distance'} value={shot ? f1(landed ? shot.range : ball.x) + ' m' : '—'} strong={landed} live={flying} />
            <Readout label="Time in air" value={shot ? tNow.toFixed(2) + ' s' : '—'} live={flying} />
            <Readout label="Max height" value={landed && shot ? f1(shot.maxH) + ' m' : '—'} />
            <span className="ml-auto text-[13px] italic text-muted">
              {shot ? `Dots mark the ball every ${strobeStep} s.` : 'Dashed curves are your recorded trials.'}
            </span>
          </figcaption>
        </figure>

        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Slider label="Speed u" unit="m/s" value={vars.u} range={RANGES.u} locked={locks.u !== undefined} onChange={(x) => set('u', x)} />
          <Slider label="Angle θ" unit="°" value={vars.angle} range={RANGES.angle} locked={locks.angle !== undefined} onChange={(x) => set('angle', x)} />
          <Slider label="Height h" unit="m" value={vars.h} range={RANGES.h} locked={locks.h !== undefined} onChange={(x) => set('h', x)} />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button className="btn btn-primary" onClick={launch}>
              Launch
            </button>
            <button
              className={`btn ${landed && !already ? 'btn-ready' : ''}`}
              disabled={!landed || already}
              onClick={() => {
                if (shot) onRecord(shot)
              }}
            >
              Record trial
            </button>
            <span className="text-[13px] italic text-muted">
              {already ? 'This setting is already in your table.' : landed ? 'Landed. Record it to keep it.' : flying ? 'In flight…' : 'Set the sliders, launch, then record.'}
            </span>
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[13px] text-muted">
              <input type="checkbox" className="h-3.5 w-3.5 accent-[var(--color-accent)]" checked={vectors} onChange={() => setVectors(!vectors)} />
              velocity arrows in flight
            </label>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        <div className="sheet">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="label">Your trials</h3>
            {ratioColumns && (
              <label className="text-[13px] text-muted">
                add a column{' '}
                <select className="select" value={column} onChange={(e) => setColumn(e.target.value as typeof column)}>
                  <option value="none">none</option>
                  <option value="u">R ÷ u</option>
                  <option value="u2">R ÷ u²</option>
                  <option value="sqrt">R ÷ √u</option>
                </select>
              </label>
            )}
          </div>
          {trials.length === 0 ? (
            <p className="text-sm italic text-muted">Nothing recorded yet.</p>
          ) : (
            <table className="trials">
              <thead>
                <tr>
                  <th>#</th>
                  <th>u</th>
                  <th>θ</th>
                  <th>h</th>
                  <th>R (m)</th>
                  <th>T (s)</th>
                  {column !== 'none' && <th>{extraLabel}</th>}
                </tr>
              </thead>
              <tbody>
                {trials.map((t) => (
                  <tr key={t.n} className={`${counts(t) ? '' : 'stray'} ${t.n === trials.length ? 'row-new' : ''}`}>
                    <td>{t.n}</td>
                    <td>{t.u}</td>
                    <td>{t.angle}°</td>
                    <td>{t.h}</td>
                    <td className="strong">{f1(t.range)}</td>
                    <td>{t.time.toFixed(2)}</td>
                    {column !== 'none' && <td>{extra(t).toFixed(column === 'u2' ? 4 : 2)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Scatter trials={trials} xVar={xVar} counts={counts} />
        {aside}
      </div>
    </div>
  )
}

function Readout({ label, value, strong, live }: { label: string; value: string; strong?: boolean; live?: boolean }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="label">{label}</span>
      <span className={`num ${strong ? 'text-lg font-semibold text-accent-dark' : live ? 'text-muted' : 'text-ink'}`}>{value}</span>
    </span>
  )
}

function Slider(props: { label: string; unit: string; value: number; range: readonly [number, number]; locked: boolean; onChange: (v: number) => void }) {
  const { label, unit, value, range, locked, onChange } = props
  return (
    <label className={`block ${locked ? 'opacity-55' : ''}`}>
      <span className="flex items-baseline justify-between">
        <span className="label flex items-center gap-1.5">
          {label}
          {locked && (
            <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true">
              <rect x="1" y="5" width="9" height="6.5" rx="1" fill="currentColor" />
              <path d="M3 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          )}
        </span>
        <span className="num text-base font-semibold text-ink">
          {value} {unit}
        </span>
      </span>
      <input type="range" className="slider" min={range[0]} max={range[1]} step={1} value={value} disabled={locked} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      <span className="text-xs italic text-muted">{locked ? 'locked for this task' : `${range[0]} to ${range[1]} ${unit}`}</span>
    </label>
  )
}

/** Recorded trials only. Points, no theory curve: the pattern is his to read. */
function Scatter({ trials, xVar, counts }: { trials: Trial[]; xVar: 'u' | 'angle'; counts: (t: Trial) => boolean }) {
  const W = 300
  const H = 190
  const l = 40
  const b = 30
  const xMax = xVar === 'u' ? 50 : 90
  const yMax = Math.max(20, ...trials.map((t) => t.range)) * 1.12
  const px = (x: number) => l + (x / xMax) * (W - l - 12)
  const py = (y: number) => H - b - (y / yMax) * (H - b - 12)
  const yStep = niceStep(yMax / 4)
  const xStep = xVar === 'u' ? 10 : 15
  return (
    <figure className="sheet">
      <h3 className="label mb-1">{xVar === 'u' ? 'R against u' : 'R against θ'} · your trials</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Scatter plot of your recorded trials">
        {Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep).map((y) => (
          <g key={y}>
            <line x1={l} x2={W - 12} y1={py(y)} y2={py(y)} className="grid-line" />
            <text x={l - 6} y={py(y) + 3} textAnchor="end" className="axis-text">
              {y}
            </text>
          </g>
        ))}
        {Array.from({ length: Math.floor(xMax / xStep) + 1 }, (_, i) => i * xStep).map((x) => (
          <g key={x}>
            <line x1={px(x)} x2={px(x)} y1={H - b} y2={H - b + 4} className="ink-line" />
            <text x={px(x)} y={H - b + 15} textAnchor="middle" className="axis-text">
              {x}
            </text>
          </g>
        ))}
        <line x1={l} x2={W - 12} y1={H - b} y2={H - b} className="ink-line" />
        <line x1={l} x2={l} y1={12} y2={H - b} className="ink-line" />
        <text x={W - 12} y={H - 3} textAnchor="end" className="axis-text">
          {xVar === 'u' ? 'u (m/s)' : 'θ (°)'}
        </text>
        <text x={l + 4} y={11} className="axis-text">
          R (m)
        </text>
        {trials.map((t) => (
          <circle key={t.n} cx={px(t[xVar])} cy={py(t.range)} r={4.2} className={counts(t) ? 'dot pop' : 'dot stray pop'} />
        ))}
      </svg>
      {trials.length === 0 && <p className="text-[13px] italic text-muted">Points appear as you record trials. No curve is drawn for you.</p>}
    </figure>
  )
}
