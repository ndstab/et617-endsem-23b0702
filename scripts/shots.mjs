// Drives the app in real Chrome through both learner paths and saves screenshots for the report.
// Usage: node scripts/shots.mjs [baseUrl]
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] || 'https://et617-23b0702.vercel.app'
const OUT = new URL('../report/img/', import.meta.url).pathname
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  defaultViewport: { width: 1280, height: 900, deviceScaleFactor: 2 },
})
const page = await browser.newPage()
const log = (...a) => console.log(...a)
page.on('pageerror', (e) => log('PAGE ERROR', e.message))

const click = async (text, exact = false) => {
  const ok = await page.evaluate(
    (text, exact) => {
      const b = [...document.querySelectorAll('button')].find((x) => (exact ? x.textContent.trim() === text : x.textContent.trim().startsWith(text)))
      if (!b || b.disabled) return false
      b.click()
      return true
    },
    text,
    exact,
  )
  if (!ok) throw new Error('button not clickable: ' + text)
  await sleep(250)
}
const type = async (selector, index, value) => {
  const els = await page.$$(selector)
  await els[index].click({ clickCount: 3 })
  await els[index].type(value, { delay: 2 })
}
const slide = async (label, value) => {
  await page.evaluate(
    (label, value) => {
      const el = document.querySelector(`input[type=range][aria-label="${label}"]`)
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, String(value))
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
    label,
    value,
  )
}
const shot = async ({ u, angle, h }) => {
  if (u != null) await slide('Speed u', u)
  if (angle != null) await slide('Angle θ', angle)
  if (h != null) await slide('Height h', h)
  await sleep(80)
  await click('Launch')
  await sleep(1150)
  await click('Record trial')
}
const snap = async (name, full = true) => {
  await page.screenshot({ path: OUT + name + '.png', fullPage: full })
  log('saved', name)
}
const text = (sel) => page.evaluate((sel) => document.querySelector(sel)?.innerText ?? null, sel)
const startClean = async () => {
  await page.goto(BASE, { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.clear())
  await page.goto(BASE, { waitUntil: 'networkidle0' })
}

// ---------- (a) correct path ----------
await startClean()
await snap('home')
await click('Start the 10 minutes')
await type('input.field', 0, '141')
await type('input.field', 1, 'Range goes as u squared: horizontal velocity and flight time both double')
await click('high', true)
await snap('predict')
await click('Lock it in')
await shot({ u: 20, angle: 30 })
await shot({ u: 30 })
await shot({ u: 40 })
await snap('bench')
await click('I have enough data')
await click('u²', true)
await type('textarea', 0, 'Doubling u doubles the horizontal velocity and also doubles the time in the air, and range is the product of the two.')
await click('Submit conclusion')
await page.waitForFunction(() => document.body.innerText.includes('Model explanation'), { timeout: 12000 })
await sleep(300)
log('CORRECT coach:', await text('section[aria-live]'))
await snap('correct')

// ---------- (b) misconception path M1 ----------
await startClean()
await click('Start the 10 minutes')
await type('input.field', 0, '70.6')
await type('input.field', 1, 'Range is proportional to speed, so doubling the speed doubles the range')
await click('high', true)
await click('Lock it in')
await shot({ u: 20, angle: 30 })
await shot({ u: 30 })
await shot({ u: 45, angle: 50 }) // confounded: two variables changed
await snap('confound')
await shot({ u: 40, angle: 30 })
await click('Give me a hint')
await click('I have enough data')
await click('u', true)
await type('textarea', 0, 'A faster ball just goes further, so range follows the speed.')
await click('Submit conclusion')
await page.waitForFunction(() => document.querySelector('section[aria-live]'), { timeout: 12000 })
await sleep(300)
log('M1 coach:', await text('section[aria-live]'))
log('M1 model answer visible (must be false):', await page.evaluate(() => document.body.innerText.includes('Model explanation')))
await snap('misconception')

// C4: pause, close, reopen -> resume card
await click('Pause & leave')
await page.goto('about:blank')
await page.goto(BASE, { waitUntil: 'networkidle0' })
log('RESUME card:', await text('main .sheet'))
await snap('resume', false)
await click('Resume')

// revise and finish Mission 1
await click('u²', true)
await type('textarea', 0, 'Both the horizontal velocity and the time in the air double, so their product is four times.')
await type('textarea', 1, 'Range goes as u squared because horizontal velocity and flight time both scale with u')
await click('Submit revised conclusion')
await page.waitForFunction(() => document.body.innerText.includes('Model explanation'), { timeout: 12000 })
await snap('revised')
await click('On to Mission 2')

// ---------- Mission 2, misconception M2 ----------
await click('exactly 45°', true)
await type('input.field', 1, 'The best angle is 45 degrees because sin 2θ is largest there')
await click('medium', true)
await snap('predict-m2')
await click('Lock it in')
await shot({ angle: 45 })
await shot({ angle: 55 })
await shot({ angle: 65 })
await shot({ angle: 75 })
log('M2 notes:', await page.evaluate(() => [...document.querySelectorAll('.note')].map((n) => n.innerText)))
await click('I have enough data')
await click('exactly 45°', true)
await type('textarea', 0, 'In my table 45 degrees goes furthest, as the formula says.')
await click('Submit conclusion')
await page.waitForFunction(() => document.querySelector('section[aria-live]'), { timeout: 12000 })
await sleep(300)
log('M2 coach:', await text('section[aria-live]'))
await snap('m2-misconception')
await click('Back to the bench')
await shot({ angle: 35 })
await shot({ angle: 29 })
await shot({ angle: 20 })
await snap('bench-m2')
await click('Back to your conclusion')
await click('below 45°', true)
await type('textarea', 0, 'From a height the ball keeps moving forward during the extra fall time, so more horizontal velocity pays off and a flatter angle wins.')
await type('textarea', 1, 'From a height the best angle is below 45 because the fall adds time in the air')
await click('Submit revised conclusion')
await page.waitForFunction(() => document.body.innerText.includes('Model explanation'), { timeout: 12000 })
await click('On to the Challenge')

// ---------- Challenge ----------
await type('input.field', 0, '63')
await click('Check')
await click('yes', true)
log('T5:', await page.evaluate(() => [...document.querySelectorAll('main .sheet')].slice(0, 2).map((x) => x.innerText)))
await snap('challenge5')
await click('Next: hit the target')
await shot({ angle: 40 })
await shot({ angle: 15 })
await shot({ angle: 75 })
log('T6:', await text('main .sheet'))
await snap('challenge6')
await click('Debrief')
await click('Show derivation result')
await snap('debrief')
await click('About', true)
await snap('about')

const events = await page.evaluate(() => JSON.parse(localStorage.getItem('et617-23b0702-session-v1')).log.map((e) => e.type))
log('EVENT TYPES:', [...new Set(events)].join(', '), '| total', events.length)
await browser.close()
