export const DIFFICULTIES = [
  { id: 'easy', label: 'Easy', max: 10 },
  { id: 'medium', label: 'Medium', max: 100 },
  { id: 'hard', label: 'Hard', max: 1_000 },
  { id: 'evil', label: 'Evil', max: 10_000 },
  { id: 'monster', label: 'Monster', max: 1_000_000 },
  { id: 'impossible', label: 'Impossible', max: 1_000_000_000 },
] as const

export type Difficulty = (typeof DIFFICULTIES)[number]

export type GuessResult = 'too-low' | 'too-high' | 'correct'
export type VictoryPraiseKind =
  | 'one-try'
  | 'intuition'
  | 'half-method'
  | 'no-half-method'

export function isMidpointGuess(
  guess: number,
  min: number,
  max: number,
): boolean {
  const lowerMidpoint = Math.floor((min + max) / 2)
  const upperMidpoint = Math.ceil((min + max) / 2)
  return guess === lowerMidpoint || guess === upperMidpoint
}

export function maximumMidpointGuesses(max: number): number {
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new RangeError('The maximum must be a positive safe integer.')
  }

  return Math.ceil(Math.log2(max + 1))
}

export function getVictoryPraiseKind(
  attempts: number,
  max: number,
  usedHalfMethod: boolean,
): VictoryPraiseKind {
  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    throw new RangeError('The attempt count must be a positive safe integer.')
  }

  const maximumAttempts = maximumMidpointGuesses(max)
  if (attempts === 1) return 'one-try'
  if (attempts < maximumAttempts) return 'intuition'
  return usedHalfMethod ? 'half-method' : 'no-half-method'
}

export function generateSecretNumber(
  max: number,
  random: () => number = Math.random,
): number {
  if (!Number.isSafeInteger(max) || max < 1) {
    throw new RangeError('The maximum must be a positive safe integer.')
  }

  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('The random source must return a value in [0, 1).')
  }

  return Math.floor(value * max) + 1
}

export function evaluateGuess(guess: number, secret: number): GuessResult {
  if (guess < secret) return 'too-low'
  if (guess > secret) return 'too-high'
  return 'correct'
}
