import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  evaluateGuess,
  getVictoryPraiseKind,
  generateSecretNumber,
  isMidpointGuess,
  maximumMidpointGuesses,
} from './game'

describe('difficulty ranges', () => {
  it('defines the six requested inclusive maximums', () => {
    expect(DIFFICULTIES.map(({ id, max }) => [id, max])).toEqual([
      ['easy', 10],
      ['medium', 100],
      ['hard', 1_000],
      ['evil', 10_000],
      ['monster', 1_000_000],
      ['impossible', 1_000_000_000],
    ])
  })
})

describe('generateSecretNumber', () => {
  it('includes both ends of the selected range', () => {
    expect(generateSecretNumber(10, () => 0)).toBe(1)
    expect(generateSecretNumber(10, () => 1 - Number.EPSILON)).toBe(10)
  })

  it('rejects invalid ranges and random values', () => {
    expect(() => generateSecretNumber(0)).toThrow(RangeError)
    expect(() => generateSecretNumber(10, () => 1)).toThrow(RangeError)
    expect(() => generateSecretNumber(10, () => Number.NaN)).toThrow(RangeError)
  })
})

describe('evaluateGuess', () => {
  it('reports whether a guess is low, high, or correct', () => {
    expect(evaluateGuess(4, 5)).toBe('too-low')
    expect(evaluateGuess(6, 5)).toBe('too-high')
    expect(evaluateGuess(5, 5)).toBe('correct')
  })
})

describe('midpoint strategy', () => {
  it('accepts either center value when the range has an even number of values', () => {
    expect(isMidpointGuess(5, 1, 10)).toBe(true)
    expect(isMidpointGuess(6, 1, 10)).toBe(true)
    expect(isMidpointGuess(4, 1, 10)).toBe(false)
  })

  it('calculates the worst-case number of midpoint guesses', () => {
    expect(maximumMidpointGuesses(10)).toBe(4)
    expect(maximumMidpointGuesses(1_000_000_000)).toBe(30)
  })
})

describe('getVictoryPraiseKind', () => {
  it('prioritizes one-guess and unusually fast wins', () => {
    expect(getVictoryPraiseKind(1, 1_000_000_000, true)).toBe('one-try')
    expect(getVictoryPraiseKind(3, 10, true)).toBe('intuition')
  })

  it('distinguishes midpoint and non-midpoint strategies', () => {
    expect(getVictoryPraiseKind(4, 10, true)).toBe('half-method')
    expect(getVictoryPraiseKind(4, 10, false)).toBe('no-half-method')
  })
})
