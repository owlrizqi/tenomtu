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
