// Home page figure: a live bench. It launches by itself, and the learner can aim with the
// pointer and click to launch. Two different angles landing on the same spot is the hook.

import { useEffect, useRef, useState } from 'react'
import { position, shoot } from './physics'

const U = 34 // m/s, every launch
const SIM_SPEED = 2.4 // simulated seconds per real second
const FADE_MS = 6500 // how long a landed trail stays
const AUTO = [30, 60, 45, 24, 66] // 30/60 and 24/66 are complementary pairs
const W = 1140
const H = 330
const OX = 56
const GY = H - 34
const SCALE = Math.min((W - OX - 30) / 128, (GY - 14) / 52)
const sx = (x: number) => OX + x * SCALE
const sy = (y: number) => GY - y * SCALE

interface Flight {
  id: number
  angle: number
  start: number // ms
  byUser: boolean
}

export default function Hero() {
  const [now, setNow] = useState(0)
  const [aim, setAim] = useState(45)
  const [touched, setTouched] = useState(false)
  const flights = useRef<Flight[]>([])
  const counter = useRef(0)
  const quietUntil = useRef(0)
  const svg = useRef<SVGSVGElement>(null)
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const fire = (angle: number, at: number, byUser: boolean) => {
    flights.current = [...flights.current.slice(-7), { id: counter.current++, angle, start: at, byUser }]
  }

  useEffect(() => {
    if (still) {
      // No motion wanted: show three finished launches.
      flights.current = [30, 60, 45].map((angle, id) => ({ id, angle, start: -1e7, byUser: false }))
      setNow(0)
      return
    }
    let raf = 0
    let nextAuto = performance.now() + 400
    let step = 0
    const loop = (t: number) => {
      if (t >= nextAuto && t >= quietUntil.current) {
        fire(AUTO[step++ % AUTO.length], t, false)
        nextAuto = t + 1700
      }
      flights.current = flights.current.filter((f) => t - f.start < (shoot(U, f.angle, 0).time / SIM_SPEED) * 1000 + FADE_MS)
      setNow(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [still])

  const aimFromPointer = (e: React.PointerEvent) => {
    const box = svg.current?.getBoundingClientRect()
    if (!box) return aim
    const x = ((e.clientX - box.left) / box.width) * W
    const y = ((e.clientY - box.top) / box.height) * H
    const deg = (Math.atan2(GY - y, x - OX) * 180) / Math.PI
    return Math.round(Math.max(12, Math.min(66, deg)))
  }

  // What each flight looks like right now.
  const drawn = flights.current.map((f) => {
    const s = shoot(U, f.angle, 0)
    const t = still ? s.time : Math.min(s.time, ((now - f.start) / 1000) * SIM_SPEED)
    const landed = t >= s.time
    const sinceLanding = still ? 0 : now - f.start - (s.time / SIM_SPEED) * 1000
    const opacity = landed ? Math.max(0, 1 - sinceLanding / FADE_MS) : 1
    const pts = Array.from({ length: 41 }, (_, k) => position(U, f.angle, 0, (t * k) / 40))
    const dots = Array.from({ length: Math.floor(t / 0.5) }, (_, k) => position(U, f.angle, 0, (k + 1) * 0.5))
    return { f, s, landed, opacity, pts, dots, ball: position(U, f.angle, 0, t) }
  })
  const landedOnes = drawn.filter((d) => d.landed && d.opacity > 0.15)
  const tie = (d: (typeof drawn)[number]) => d.landed && landedOnes.some((o) => o.f.angle !== d.f.angle && Math.abs(o.s.range - d.s.range) < 0.8)
  const rad = (aim * Math.PI) / 180

  return (
    <figure className="hero m-0">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full cursor-crosshair touch-none select-none"
        role="img"
        aria-label="A live bench: balls launched at 34 metres per second at different angles. Click to launch one yourself."
        onPointerMove={(e) => {
          setAim(aimFromPointer(e))
          setTouched(true)
        }}
        onPointerDown={(e) => {
          const angle = aimFromPointer(e)
          setAim(angle)
          setTouched(true)
          quietUntil.current = performance.now() + 3200
          fire(angle, performance.now(), true)
        }}
      >
        {Array.from({ length: Math.floor((W - 24 - OX) / SCALE / 20) + 1 }, (_, i) => i * 20).map((x) => (
          <g key={x}>
            <line x1={sx(x)} x2={sx(x)} y1={14} y2={GY} className="grid-line" />
            <line x1={sx(x)} x2={sx(x)} y1={GY} y2={GY + 6} className="ink-line" />
            <text x={sx(x)} y={GY + 19} textAnchor="middle" className="axis-text">
              {x}
            </text>
          </g>
        ))}
        {[20, 40].map((y) => (
          <line key={y} x1={OX} x2={W - 20} y1={sy(y)} y2={sy(y)} className="grid-line" />
        ))}
        <line x1={12} x2={W - 12} y1={GY} y2={GY} className="ink-line" strokeWidth={1.6} />
        <text x={W - 14} y={GY + 31} textAnchor="end" className="axis-text">
          distance (m)
        </text>

        {drawn.map((d) => (
          <g key={d.f.id} opacity={d.opacity}>
            <path d={'M' + d.pts.map((p) => `${sx(p.x).toFixed(1)},${sy(Math.max(0, p.y)).toFixed(1)}`).join(' L')} className={d.f.byUser ? 'live' : 'hero-trail'} />
            {d.dots.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(Math.max(0, p.y))} r={2.4} className={d.f.byUser ? 'strobe' : 'hero-dot'} />
            ))}
            {!d.landed && <circle cx={sx(d.ball.x)} cy={sy(Math.max(0, d.ball.y))} r={5.5} className={d.f.byUser ? 'ball' : 'hero-ball'} />}
            {d.landed && (
              <g>
                <line x1={sx(d.s.range)} x2={sx(d.s.range)} y1={GY} y2={GY - 12} className={tie(d) ? 'live-mark' : 'ink-line'} />
                <text x={sx(d.s.range)} y={GY - 17 - (d.f.id % 3) * 13} textAnchor="middle" className={tie(d) ? 'live-text' : 'axis-text'}>
                  {d.f.angle}° → {d.s.range.toFixed(1)} m
                </text>
              </g>
            )}
          </g>
        ))}

        {/* launcher that follows the pointer */}
        <line x1={OX} y1={GY} x2={OX + 58 * Math.cos(rad)} y2={GY - 58 * Math.sin(rad)} className="aim" markerEnd="url(#hero-arrow)" />
        <path d={`M${OX + 26},${GY} A26,26 0 0 0 ${OX + 26 * Math.cos(rad)},${GY - 26 * Math.sin(rad)}`} className="aim-arc" />
        <text x={OX + 40 * Math.cos(rad / 2) + 6} y={GY - 40 * Math.sin(rad / 2) + 4} className="axis-text" style={{ fontWeight: 600, fill: 'var(--color-ink)' }}>
          {aim}°
        </text>
        <circle cx={OX} cy={GY} r={4.5} className="dot" />
        <defs>
          <marker id="hero-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className="aim-head" />
          </marker>
        </defs>
      </svg>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t border-ink px-4 py-2">
        <span className="text-[15px]">
          <strong>{touched ? 'Click to launch.' : 'Move your pointer to aim, click to launch.'}</strong> Every ball leaves at {U} m/s. Watch where 30° and 60° land.
        </span>
        <span className="text-[13px] italic text-muted">Dots mark the ball every 0.5 s.</span>
      </figcaption>
    </figure>
  )
}
