import { describe, expect, it } from 'vitest'

import { escapeCell, neutralizeFormula } from './csv'

describe('escapeCell', () => {
  it('leaves a plain value unquoted', () => {
    expect(escapeCell('Ada Lovelace')).toBe('Ada Lovelace')
  })

  it('quotes a value containing a comma, a newline, or a carriage return', () => {
    expect(escapeCell('Doe, Jane')).toBe('"Doe, Jane"')
    expect(escapeCell('two\nlines')).toBe('"two\nlines"')
    expect(escapeCell('two\r\nlines')).toBe('"two\r\nlines"')
  })

  it('doubles embedded quotes', () => {
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""')
  })
})

describe('neutralizeFormula', () => {
  it.each(['=1+1', '+SUM(A1)', '@alice', '\tleading tab', '\rleading return'])('neutralizes %j', (value) => {
    expect(neutralizeFormula(value)).toBe(`'${value}`)
  })

  it('neutralizes a leading hyphen that is not a negative number', () => {
    expect(neutralizeFormula('-Bob')).toBe("'-Bob")
  })

  it('leaves negative numbers alone', () => {
    expect(neutralizeFormula('-5')).toBe('-5')
    expect(neutralizeFormula('-0.25')).toBe('-0.25')
  })

  it('leaves ordinary text and an empty cell alone', () => {
    expect(neutralizeFormula('Ada Lovelace')).toBe('Ada Lovelace')
    expect(neutralizeFormula('')).toBe('')
  })

  it('only inspects the first character, so an interior equals sign is untouched', () => {
    expect(neutralizeFormula('a=b')).toBe('a=b')
  })
})
