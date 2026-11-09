import { describe, expect, it } from 'vitest'
import { loadGame, MAX_SAVE_BYTES, parseSave, RECOVERY_KEY, saveGame, STORAGE_KEY, validateSave } from './save'
import { createDefaultState } from '../utils/game'

function memoryStorage() {
  const entries = new Map<string, string>()
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value) } }
}

describe('versioned saves', () => {
  it('round-trips a complete game', () => {
    const storage = memoryStorage()
    const state = { ...createDefaultState(), level: 13, epicMode: true, equipmentBonus: 23, temporaryModifier: -6, monsterPower: 40, theme: 'light' as const }
    expect(saveGame(storage, state)).toBe(true)
    expect(loadGame(storage)).toEqual({ state, warning: null })
  })
  it('uses safe defaults for an empty store', () => {
    expect(loadGame(memoryStorage())).toEqual({ state: createDefaultState(), warning: null })
  })
  it('accepts the original v1 structure and adds optional settings', () => {
    const legacy = { schemaVersion: 1, level: 1, equipmentBonus: 0, temporaryModifier: 0, monsterPower: 0, epicMode: false, heroWinsTies: false }
    expect(validateSave(legacy)).toEqual({ ok: true, state: { ...createDefaultState(), theme: 'dark' } })
  })
  it.each([
    null, [], 'text', {}, { ...createDefaultState(), schemaVersion: 3 },
    { ...createDefaultState(), level: 0 }, { ...createDefaultState(), level: 11 },
    { ...createDefaultState(), level: 21, epicMode: true },
    { ...createDefaultState(), equipmentBonus: -1 }, { ...createDefaultState(), temporaryModifier: -1000 },
    { ...createDefaultState(), monsterPower: 1.5 }, { ...createDefaultState(), monsterPower: Infinity },
    { ...createDefaultState(), level: '5' }, { ...createDefaultState(), epicMode: 1 },
    { ...createDefaultState(), heroWinsTies: 'false' },
    { ...createDefaultState(), theme: 'blue' }, { ...createDefaultState(), haptics: null },
  ])('rejects an invalid structure: %j', (value) => {
    expect(validateSave(value).ok).toBe(false)
  })
  it('ignores unknown fields without copying them into state', () => {
    expect(validateSave({ ...createDefaultState(), unexpected: 'discard' })).toEqual({ ok: true, state: createDefaultState() })
  })
  it('rejects malformed and oversized JSON', () => {
    expect(parseSave('{invalid').ok).toBe(false)
    expect(parseSave(' '.repeat(MAX_SAVE_BYTES + 1)).ok).toBe(false)
  })
  it('backs up corrupt or unsupported saves', () => {
    const storage = memoryStorage()
    storage.setItem(STORAGE_KEY, '{broken')
    const result = loadGame(storage)
    expect(result.state).toEqual(createDefaultState())
    expect(result.warning).toBeTruthy()
    expect(storage.getItem(RECOVERY_KEY)).toBe('{broken')
  })
  it('handles denied storage and quota exhaustion', () => {
    const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('quota') } }
    expect(loadGame(broken).warning).toBeTruthy()
    expect(saveGame(broken, createDefaultState())).toBe(false)
  })
  it('does not copy prototype keys when restoring a local save', () => {
    const storage = memoryStorage()
    const current = { ...createDefaultState(), level: 7, equipmentBonus: 12 }
    storage.setItem(STORAGE_KEY, JSON.stringify(current).replace(/}$/, ',"__proto__":{"polluted":true}}'))
    expect(loadGame(storage).state).toEqual(current)
    expect(Object.hasOwn(loadGame(storage).state, '__proto__')).toBe(false)
    expect(Object.hasOwn(Object.prototype, 'polluted')).toBe(false)
  })
})
