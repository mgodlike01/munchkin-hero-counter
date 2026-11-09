import { describe, expect, it } from 'vitest'
import { battleResult, clampStat, combatPower, createDefaultState } from './game'
import { gameReducer } from '../store/gameReducer'

describe('hero rules', () => {
  it('keeps level between 1 and the selected limit', () => {
    expect(clampStat('level', -5, false)).toBe(1)
    expect(clampStat('level', 40, false)).toBe(10)
    expect(clampStat('level', 40, true)).toBe(20)
    expect(clampStat('level', Number.NaN, true)).toBe(1)
    expect(clampStat('level', 3.9, false)).toBe(3)
  })
  it('supports positive equipment and signed temporary modifiers', () => {
    expect(clampStat('equipmentBonus', -4, false)).toBe(0)
    expect(clampStat('monsterPower', -4, false)).toBe(0)
    expect(clampStat('temporaryModifier', -4, false)).toBe(-4)
    expect(clampStat('temporaryModifier', -1000, false)).toBe(-999)
    expect(clampStat('equipmentBonus', 1000, false)).toBe(999)
  })
  it('calculates combat power, including negative results', () => {
    expect(combatPower({ ...createDefaultState(), level: 5, equipmentBonus: 8, temporaryModifier: -3 })).toBe(10)
    expect(combatPower({ ...createDefaultState(), temporaryModifier: -5 })).toBe(-4)
  })
  it('awards ties to the monster by default and respects the optional rule', () => {
    const tie = { ...createDefaultState(), monsterPower: 1 }
    expect(battleResult(tie)).toEqual({ difference: 0, heroWins: false })
    expect(battleResult({ ...tie, heroWinsTies: true })).toEqual({ difference: 0, heroWins: true })
    expect(battleResult({ ...tie, monsterPower: 0 }).heroWins).toBe(true)
    expect(battleResult({ ...tie, monsterPower: 4 })).toEqual({ difference: -3, heroWins: false })
  })
  it('clears temporary modifiers independently', () => {
    const state = { ...createDefaultState(), level: 5, equipmentBonus: 8, temporaryModifier: -3, monsterPower: 20 }
    expect(gameReducer(state, { type: 'resetTemporary' })).toEqual({ ...state, temporaryModifier: 0 })
  })
  it('finishes a battle without changing level or equipment', () => {
    const state = { ...createDefaultState(), level: 5, equipmentBonus: 8, temporaryModifier: 3, monsterPower: 12 }
    expect(gameReducer(state, { type: 'finishBattle' })).toEqual({ ...state, temporaryModifier: 0, monsterPower: 0 })
  })
  it('starts a new game and preserves preferences', () => {
    const state = { ...createDefaultState(), level: 14, equipmentBonus: 8, temporaryModifier: 3, monsterPower: 12, epicMode: true, heroWinsTies: true, theme: 'light' as const, haptics: false }
    expect(gameReducer(state, { type: 'newGame' })).toEqual({ ...state, level: 1, equipmentBonus: 0, temporaryModifier: 0, monsterPower: 0 })
    expect(gameReducer({ ...createDefaultState(), level: 8 }, { type: 'newGame' })).toEqual(createDefaultState())
  })
  it('clamps level when epic mode is disabled', () => {
    expect(gameReducer({ ...createDefaultState(), level: 20, epicMode: true }, { type: 'setSetting', key: 'epicMode', value: false }).level).toBe(10)
  })
  it('applies stat changes through the same bounds', () => {
    expect(gameReducer(createDefaultState(), { type: 'setStat', key: 'level', value: 0 }).level).toBe(1)
    expect(gameReducer(createDefaultState(), { type: 'setStat', key: 'level', value: 99 }).level).toBe(10)
  })
})
