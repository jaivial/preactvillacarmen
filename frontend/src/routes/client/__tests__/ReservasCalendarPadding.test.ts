/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Regression: .resvCalendar must pad its day grid 1rem on all sides so the
// grid sits inside the .resvCard background instead of touching the card's
// left/right borders (title block .resvCardHead uses 1rem padding).
describe('.resvCalendar padding', () => {
  it('sets padding to 1rem so the day grid is inset from the card border', () => {
    const cssPath = resolve(__dirname, '../../../index.css')
    const css = readFileSync(cssPath, 'utf8')
    const rule = /\.resvCalendar\s*\{[^}]*\bpadding:\s*1rem\b[^}]*\}/
    expect(rule.test(css), 'expected `.resvCalendar { ... padding: 1rem ... }` in index.css').toBe(true)
  })
})
