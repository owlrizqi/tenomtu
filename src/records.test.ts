import { describe, expect, it } from 'vitest'
import { loadBestRecords, saveBestRecord } from './records'

function createStorage(initialValue: string | null = null) {
  let value = initialValue

  return {
    getItem: () => value,
    setItem: (_key: string, nextValue: string) => {
      value = nextValue
    },
  }
}

describe('best records', () => {
  it('starts empty and stores a separate best for each difficulty', () => {
    const storage = createStorage()

    expect(loadBestRecords(storage, 'records')).toEqual({})
    expect(saveBestRecord(storage, 'records', 'easy', 3)).toEqual({
      records: { easy: 3 },
      isNewBest: true,
    })
    expect(saveBestRecord(storage, 'records', 'hard', 5)).toEqual({
      records: { easy: 3, hard: 5 },
      isNewBest: true,
    })
    expect(loadBestRecords(storage, 'records')).toEqual({
      easy: 3,
      hard: 5,
    })
  })

  it('only replaces a record with a lower guess count', () => {
    const storage = createStorage('{"easy":3}')

    expect(saveBestRecord(storage, 'records', 'easy', 4)).toEqual({
      records: { easy: 3 },
      isNewBest: false,
    })
    expect(saveBestRecord(storage, 'records', 'easy', 2)).toEqual({
      records: { easy: 2 },
      isNewBest: true,
    })
  })

  it('rejects invalid saved data and guess counts', () => {
    expect(() => loadBestRecords(createStorage('{bad'), 'records')).toThrow()
    expect(() => saveBestRecord(createStorage(), 'records', 'easy', 0)).toThrow(
      RangeError,
    )
  })
})
