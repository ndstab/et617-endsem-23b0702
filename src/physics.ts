// All the numbers in the app come from this file. The AI never calculates anything.

export const G = 9.81 // m/s²

const rad = (deg: number) => (deg * Math.PI) / 180

/** Horizontal and vertical launch velocity. */
export function components(u: number, angle: number) {
  return { ux: u * Math.cos(rad(angle)), uy: u * Math.sin(rad(angle)) }
}

/** Time in the air when launched from height h and landing at height 0. */
export function flightTime(u: number, angle: number, h: number) {
  const { uy } = components(u, angle)
  return (uy + Math.sqrt(uy * uy + 2 * G * h)) / G
}

/** Horizontal distance covered: R = ux * T. */
export function range(u: number, angle: number, h: number) {
  return components(u, angle).ux * flightTime(u, angle, h)
}

/** Highest point above the ground. */
export function maxHeight(u: number, angle: number, h: number) {
  const { uy } = components(u, angle)
  return h + (uy * uy) / (2 * G)
}

/** Position at time t after launch. */
export function position(u: number, angle: number, h: number, t: number) {
  const { ux, uy } = components(u, angle)
  return { x: ux * t, y: h + uy * t - 0.5 * G * t * t }
}

export interface Shot {
  u: number
  angle: number
  h: number
  range: number
  time: number
  maxH: number
}

/** One launch with everything the lab bench reads out. */
export function shoot(u: number, angle: number, h: number): Shot {
  return {
    u,
    angle,
    h,
    range: range(u, angle, h),
    time: flightTime(u, angle, h),
    maxH: maxHeight(u, angle, h),
  }
}
