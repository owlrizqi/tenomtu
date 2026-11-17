import { DIFFICULTIES } from './game'

export type BestRecords = Partial<
  Record<(typeof DIFFICULTIES)[number]['id'], number>
>

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function loadBestRecords(
  storage: KeyValueStorage,
  key: string,
): BestRecords {
  const saved = storage.getItem(key)
  if (saved === null) return {}

  const parsed: unknown = JSON.parse(saved)
  if (!isRecord(parsed)) {
    throw new TypeError('Saved best records must be an object.')
  }

  const records: BestRecords = {}
  for (const difficulty of DIFFICULTIES) {
    const value = parsed[difficulty.id]
    if (value !== undefined) {
      if (!Number.isSafeInteger(value) || Number(value) < 1) {
        throw new TypeError('A saved best record is invalid.')
      }
      records[difficulty.id] = Number(value)
    }
  }

  return records
}

export function saveBestRecord(
  storage: KeyValueStorage,
  key: string,
  difficulty: (typeof DIFFICULTIES)[number]['id'],
  attempts: number,
): { records: BestRecords; isNewBest: boolean } {
  if (!Number.isSafeInteger(attempts) || attempts < 1) {
    throw new RangeError('A best record must be a positive number of attempts.')
  }

  const records = loadBestRecords(storage, key)
  const previousBest = records[difficulty]
  const isNewBest = previousBest === undefined || attempts < previousBest
  const updatedRecords = isNewBest
    ? { ...records, [difficulty]: attempts }
    : records

  if (isNewBest) {
    storage.setItem(key, JSON.stringify(updatedRecords))
  }

  return { records: updatedRecords, isNewBest }
}
