// The lab bench: sliders, launch, trajectory with ghost trails, readouts, trials table, scatter plot.
// It only draws and collects launches. What the trials MEAN is decided in rules.ts.

import { useEffect, useRef, useState } from 'react'
import { position, shoot, type Shot } from './physics'
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
}

const RANGES = { u: [5, 50], angle: [5, 85], h: [0, 30] } as const
const f1 = (x: number) => x.toFixed(1)

/** 1, 2, 5, 10, 20, 50 ... the tick spacing closest to `rough`. */
function niceStep(rough: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const n = rough / pow
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * pow
}

export default function Lab({ start, locks, trials, onRecord, counts = () => true, xVar, ratioColumns, target }: Props) {
  const last = trials[trials.length - 1]
  const [vars, setVars] = useState<Vars>({ ...(last ? { u: last.u, angle: last.angle, h: last.h } : start), ...locks })
  const [shot, setShot] = useState<Shot | null>(null)
  const [progress, setProgress] = useState(0) // 0..1 along the flight
  const [column, setColumn] = useState<'none' | 'u' | 'u2' | 'sqrt'>('none')
  const frame = useRef(0)

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const set = (key: keyof Vars, value: number) => {
    cancelAnimationFrame(frame.current)
    setShot(null)
    setProgress(0)
    setVars((v) => ({ ...v, [key]: value }))
  }

  const launch = () => {
    cancelAnimationFrame(frame.current)
    setShot(shoot(vars.u, vars.angle, vars.h))
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setProgress(1)
    const t0 = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 900)
      setProgress(p)
      if (p < 1) frame.current = requestAnimationFrame(step)
    }
    setProgress(0)
    frame.current = requestAnimationFrame(step)
  }

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
  const ball = shot ? position(shot.u, shot.angle, shot.h, shot.time * progress) : { x: 0, y: vars.h }
  const aim = (vars.angle * Math.PI) / 180

  const extra = (t: Trial) => (column === 'u' ? t.range / t.u : column === 'u2' ? t.range / (t.u * t.u) : t.range / Math.sqrt(t.u))
  const extraLabel = { none: '', u: 'R ÷ u', u2: 'R ÷ u²', sqrt: 'R ÷ √u' }[column]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <figure className="sheet overflow-hidden p-0">
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
                <text x={ox - 8} y={sy(vars.h / 2) + 4} textAnchor="end" className="axis-text">
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
              <g>
                <rect x={sx(target.x - target.tol)} y={gy - 5} width={2 * target.tol * scale} height={10} className="target" />
                <line x1={sx(target.x)} x2={sx(target.x)} y1={gy - 5} y2={gy - 30} className="target-pole" />
                <text x={sx(target.x)} y={gy - 34} textAnchor="middle" className="axis-text target-text">
                  target {target.x} m
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
              <text x={sx(0) + 30 * Math.cos(aim / 2) + 2} y={sy(vars.h) - 30 * Math.sin(aim / 2) + 4} className="axis-text">
                {vars.angle}°
              </text>
            </g>
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="aim-head" />
              </marker>
            </defs>
            {/* the live shot */}
            {shot && <path d={path(shot, progress)} className="live" />}
            <circle cx={sx(ball.x)} cy={sy(Math.max(0, ball.y))} r={5.5} className="ball" />
            {landed && shot && (
              <g>
                <line x1={sx(shot.range)} x2={sx(shot.range)} y1={gy} y2={gy - 16} className="live-mark" />
                <text x={Math.min(sx(shot.range), W - 40)} y={gy - 21} textAnchor="middle" className="live-text">
                  {f1(shot.range)} m
                </text>
              </g>
            )}
          </svg>
          <figcaption className="flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-rule px-4 py-2.5">
            <Readout label="Range" value={landed && shot ? f1(shot.range) + ' m' : '—'} strong />
            <Readout label="Time in air" value={landed && shot ? shot.time.toFixed(2) + ' s' : '—'} />
            <Readout label="Max height" value={landed && shot ? f1(shot.maxH) + ' m' : '—'} />
            <span className="ml-auto text-xs text-muted">Faint curves are your recorded trials.</span>
          </figcaption>
        </figure>

        <div className="sheet mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <Slider label="Speed u" unit="m/s" value={vars.u} range={RANGES.u} locked={locks.u !== undefined} onChange={(v) => set('u', v)} />
          <Slider label="Angle θ" unit="°" value={vars.angle} range={RANGES.angle} locked={locks.angle !== undefined} onChange={(v) => set('angle', v)} />
          <Slider label="Height h" unit="m" value={vars.h} range={RANGES.h} locked={locks.h !== undefined} onChange={(v) => set('h', v)} />
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button className="btn btn-primary" onClick={launch}>
              Launch
            </button>
            <button
              className="btn"
              disabled={!landed || already}
              onClick={() => {
                if (shot) onRecord(shot)
              }}
            >
              Record trial
            </button>
            <span className="text-xs text-muted">
              {already ? 'This setting is already in your table.' : landed ? 'Landed. Record it to keep it.' : 'Set the sliders, launch, then record.'}
            </span>
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-4">
        <div className="sheet">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h3 className="label">Your trials</h3>
            {ratioColumns && (
              <label className="text-xs text-muted">
                Add a column{' '}
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
            <p className="text-sm text-muted">Nothing recorded yet.</p>
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
                  <tr key={t.n} className={counts(t) ? '' : 'stray'}>
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
      </div>
    </div>
  )
}

function Readout({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="flex items-baseline gap-2">
      <span className="label">{label}</span>
      <span className={`num ${strong ? 'text-lg font-semibold text-ink' : 'text-ink'}`}>{value}</span>
    </span>
  )
}

function Slider(props: { label: string; unit: string; value: number; range: readonly [number, number]; locked: boolean; onChange: (v: number) => void }) {
  const { label, unit, value, range, locked, onChange } = props
  return (
    <label className={`block ${locked ? 'opacity-60' : ''}`}>
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
      <span className="text-[11px] text-muted">{locked ? 'locked for this task' : `${range[0]} to ${range[1]} ${unit}`}</span>
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
          <circle key={t.n} cx={px(t[xVar])} cy={py(t.range)} r={4.2} className={counts(t) ? 'dot' : 'dot stray'} />
        ))}
      </svg>
      {trials.length === 0 && <p className="text-xs text-muted">Points appear as you record trials.</p>}
    </figure>
  )
}
