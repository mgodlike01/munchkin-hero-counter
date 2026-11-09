import type { GameState, StatKey } from '../types/game'
import { equipmentTotal } from './equipment'

export const MAX_STAT = 999

export function createDefaultState(): GameState {
  return {
    schemaVersion: 2,
    level: 1,
    equipmentBonus: 0,
    equipmentMode: 'manual',
    gameEdition: 'base',
    equipmentItems: [],
    temporaryModifier: 0,
    monsterPower: 0,
    epicMode: false,
    heroWinsTies: false,
    theme: 'light',
    haptics: true,
  }
}

export function statRange(key: StatKey, epicMode: boolean): [number, number] {
  if (key === 'level') return [1, epicMode ? 20 : 10]
  return [key === 'temporaryModifier' ? -MAX_STAT : 0, MAX_STAT]
}

export function clampStat(key: StatKey, value: number, epicMode: boolean): number {
  const [min, max] = statRange(key, epicMode)
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.trunc(value))) : min
}

export function combatPower(state: GameState): number {
  return state.level + equipmentTotal(state) + state.temporaryModifier
}

export function battleResult(state: GameState) {
  const difference = combatPower(state) - state.monsterPower
  return { difference, heroWins: difference > 0 || (difference === 0 && state.heroWinsTies) }
}

export function signed(value: number): string {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : '0'
}
