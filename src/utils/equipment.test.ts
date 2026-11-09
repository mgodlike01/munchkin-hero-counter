import { describe, expect, it } from 'vitest'
import { equipmentTotal, itemBonusTotal, MAX_EQUIPMENT_ITEMS, starterEquipment, visibleEquipment } from './equipment'
import { combatPower, createDefaultState } from './game'
import { gameReducer } from '../store/gameReducer'
import { parseSave, validateSave } from '../services/save'
import type { EquipmentItem } from '../types/game'

const item: EquipmentItem = { id: 'boots', slot: 'boots', name: 'Сапоги', bonus: 3, equipped: true }

describe('equipment counting', () => {
  it('uses exactly one bonus source and ignores unequipped items', () => {
    const state = { ...createDefaultState(), level: 4, equipmentBonus: 7, equipmentItems: [item, { ...item, id: 'head', bonus: 5, equipped: false }], temporaryModifier: -2 }
    expect(equipmentTotal(state)).toBe(7)
    expect(equipmentTotal({ ...state, equipmentMode: 'items' })).toBe(3)
    expect(combatPower({ ...state, equipmentMode: 'items' })).toBe(5)
    expect(itemBonusTotal([])).toBe(0)
  })
  it('carries an existing manual bonus only on the first switch to items', () => {
    const manual = { ...createDefaultState(), equipmentBonus: 8 }
    const advanced = gameReducer(manual, { type: 'setEquipmentMode', value: 'items' })
    expect(advanced.equipmentItems).toHaveLength(6)
    expect(equipmentTotal(advanced)).toBe(8)
    const edited = gameReducer(advanced, { type: 'setItemBonus', id: 'slot-other', value: 0 })
    const switchedBack = gameReducer(edited, { type: 'setEquipmentMode', value: 'manual' })
    expect(equipmentTotal(switchedBack)).toBe(8)
    expect(equipmentTotal(gameReducer(switchedBack, { type: 'setEquipmentMode', value: 'items' }))).toBe(0)
  })
  it('updates, renames and toggles an individual item', () => {
    const state = { ...createDefaultState(), equipmentMode: 'items' as const, equipmentItems: [item] }
    const updated = gameReducer(state, { type: 'setItemBonus', id: item.id, value: 10000 })
    expect(equipmentTotal(updated)).toBe(999)
    expect(gameReducer(updated, { type: 'setItemBonus', id: item.id, value: -1 }).equipmentItems[0].bonus).toBe(0)
    expect(gameReducer(updated, { type: 'setItemBonus', id: item.id, value: NaN })).toBe(updated)
    expect(equipmentTotal(gameReducer(updated, { type: 'toggleItem', id: item.id }))).toBe(0)
    expect(gameReducer(updated, { type: 'renameItem', id: item.id, value: 'a'.repeat(80) }).equipmentItems[0].name).toHaveLength(64)
    expect(updated.equipmentBonus).toBe(0)
  })
  it('adds and removes custom items while keeping the base slots', () => {
    const state = { ...createDefaultState(), equipmentItems: starterEquipment() }
    const added = gameReducer(state, { type: 'addItem', id: 'extra-1' })
    expect(added.equipmentItems).toHaveLength(7)
    expect(gameReducer(added, { type: 'addItem', id: 'extra-1' })).toBe(added)
    expect(gameReducer(added, { type: 'removeItem', id: 'extra-1' })).toEqual(state)
    expect(gameReducer(state, { type: 'removeItem', id: 'slot-boots' })).toEqual(state)
    const full = { ...state, equipmentItems: Array.from({ length: MAX_EQUIPMENT_ITEMS }, (_, i) => ({ ...item, id: `item-${i}` })) }
    expect(gameReducer(full, { type: 'addItem', id: 'overflow' })).toBe(full)
  })
  it('preserves equipment after battles and clears it for a new game', () => {
    const state = { ...createDefaultState(), equipmentMode: 'items' as const, equipmentItems: [item], temporaryModifier: 4, monsterPower: 15 }
    expect(gameReducer(state, { type: 'finishBattle' }).equipmentItems).toEqual([item])
    expect(gameReducer(state, { type: 'resetTemporary' }).equipmentItems).toEqual([item])
    const reset = gameReducer(state, { type: 'newGame' })
    expect(reset.equipmentMode).toBe('items')
    expect(reset.equipmentItems).toEqual(starterEquipment())
    expect(combatPower(reset)).toBe(1)
  })
  it('migrates a real v1 save without losing its game or preferences', () => {
    const legacy = { schemaVersion: 1, level: 7, equipmentBonus: 12, temporaryModifier: -2, monsterPower: 25, epicMode: false, heroWinsTies: true, theme: 'light', haptics: false }
    const result = validateSave(legacy)
    expect(result).toEqual({ ok: true, state: { ...legacy, schemaVersion: 2, gameEdition: 'base', equipmentMode: 'manual', equipmentItems: [] } })
    if (result.ok) expect(combatPower(result.state)).toBe(17)
  })
  it('round-trips all items and inactive bonuses in v2', () => {
    const state = { ...createDefaultState(), equipmentMode: 'items' as const, equipmentItems: [item, { ...item, id: 'inactive', equipped: false }] }
    expect(parseSave(JSON.stringify(state))).toEqual({ ok: true, state })
  })
  it('starts item counting atomically from the main screen without losing the carried manual bonus', () => {
    const state = { ...createDefaultState(), equipmentBonus: 7 }
    const next = gameReducer(state, { type: 'setQuickItemBonus', id: 'slot-head', value: 3 })
    expect(next.equipmentMode).toBe('items')
    expect(equipmentTotal(next)).toBe(10)
    expect(next.equipmentItems.find((entry) => entry.id === 'slot-other')?.bonus).toBe(7)
    expect(next.equipmentBonus).toBe(7)
    expect(validateSave(next).ok).toBe(true)
    expect(gameReducer(state, { type: 'setQuickItemBonus', id: 'missing', value: 3 })).toBe(state)
    expect(gameReducer(state, { type: 'setQuickItemBonus', id: 'slot-head', value: NaN })).toBe(state)
  })
  it('can move a main-screen item to reserve without discarding its bonus or name', () => {
    const state = { ...createDefaultState(), equipmentMode: 'items' as const, equipmentItems: [item] }
    const next = gameReducer(state, { type: 'toggleQuickItem', id: item.id })
    expect(equipmentTotal(next)).toBe(0)
    expect(next.equipmentItems[0]).toEqual({ ...item, equipped: false })
    expect(equipmentTotal(gameReducer(next, { type: 'toggleQuickItem', id: item.id }))).toBe(3)
  })
  it('adds companions once, preserves a manual total and excludes hidden bonuses in the base edition', () => {
    const manual = { ...createDefaultState(), equipmentBonus: 7 }
    const expanded = gameReducer(manual, { type: 'setGameEdition', value: 'companions' })
    expect(expanded.equipmentItems).toHaveLength(8)
    expect(equipmentTotal(expanded)).toBe(7)
    const hireling = gameReducer(expanded, { type: 'setQuickItemBonus', id: 'slot-hireling', value: 3 })
    const steed = gameReducer(hireling, { type: 'setQuickItemBonus', id: 'slot-steed', value: 5 })
    const renamed = gameReducer(steed, { type: 'renameItem', id: 'slot-hireling', value: 'Помощник' })
    expect(equipmentTotal(renamed)).toBe(15)
    const base = gameReducer(renamed, { type: 'setGameEdition', value: 'base' })
    expect(equipmentTotal(base)).toBe(7)
    expect(visibleEquipment(base.equipmentItems, base.gameEdition)).toHaveLength(6)
    expect(base.equipmentItems).toEqual(renamed.equipmentItems)
    const restored = gameReducer(base, { type: 'setGameEdition', value: 'companions' })
    expect(restored).toEqual(renamed)
    expect(new Set(restored.equipmentItems.map(({ id }) => id)).size).toBe(8)
    const reserved = gameReducer(restored, { type: 'toggleItem', id: 'slot-steed' })
    expect(equipmentTotal(reserved)).toBe(10)
    expect(parseSave(JSON.stringify(reserved))).toEqual({ ok: true, state: reserved })
  })
  it('keeps a full existing inventory when adding the two reserved companion slots', () => {
    const full = { ...createDefaultState(), equipmentMode: 'items' as const,
      equipmentItems: Array.from({ length: MAX_EQUIPMENT_ITEMS }, (_, i) => ({ ...item, id: `item-${i}` })) }
    const next = gameReducer(full, { type: 'setGameEdition', value: 'companions' })
    expect(next.equipmentItems).toHaveLength(34)
    expect(next.equipmentItems.slice(0, 32)).toEqual(full.equipmentItems)
    expect(gameReducer(next, { type: 'addItem', id: 'overflow' })).toBe(next)
    expect(parseSave(JSON.stringify(next))).toEqual({ ok: true, state: next })
    const base = gameReducer(next, { type: 'setGameEdition', value: 'base' })
    expect(parseSave(JSON.stringify(base))).toEqual({ ok: true, state: base })
  })
  it('clears companions in a new game while keeping the selected edition and preferences', () => {
    const expanded = gameReducer({ ...createDefaultState(), theme: 'light', epicMode: true }, { type: 'setGameEdition', value: 'companions' })
    const state = gameReducer(expanded, { type: 'setQuickItemBonus', id: 'slot-steed', value: 6 })
    const reset = gameReducer(state, { type: 'newGame' })
    expect(reset.gameEdition).toBe('companions')
    expect(reset.theme).toBe('light')
    expect(reset.epicMode).toBe(true)
    expect(reset.equipmentItems).toEqual(starterEquipment(0, 'companions'))
    expect(combatPower(reset)).toBe(1)
    const hidden = gameReducer(state, { type: 'setGameEdition', value: 'base' })
    const restarted = gameReducer(gameReducer(hidden, { type: 'newGame' }), { type: 'setGameEdition', value: 'companions' })
    expect(restarted.equipmentItems.every(({ bonus, name }) => bonus === 0 && name === '')).toBe(true)
  })
  it('restores old v2 saves as base games and fills missing companion slots without changing existing items', () => {
    const state = { ...createDefaultState(), level: 7, equipmentMode: 'items' as const, equipmentItems: [item] }
    expect(parseSave(JSON.stringify({ ...state, gameEdition: undefined }))).toEqual({ ok: true, state })
    const result = validateSave({ ...state, gameEdition: 'companions' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.equipmentItems[0]).toEqual(item)
      expect(result.state.equipmentItems).toHaveLength(3)
      expect(combatPower(result.state)).toBe(10)
    }
  })
  it.each([
    { gameEdition: 'unknown' },
    { equipmentItems: [{ ...item, slot: 'steed' }] },
    { equipmentItems: [{ ...item, id: 'slot-steed' }] },
    { equipmentMode: 'auto' }, { equipmentItems: null }, { equipmentItems: [null] },
    { equipmentItems: [item, item] }, { equipmentItems: [{ ...item, bonus: -2 }] },
    { equipmentItems: [{ ...item, bonus: 1000 }] }, { equipmentItems: [{ ...item, bonus: 1.5 }] },
    { equipmentItems: [{ ...item, equipped: 'true' }] }, { equipmentItems: [{ ...item, slot: 'unknown' }] },
    { equipmentItems: [{ ...item, name: 'x'.repeat(65) }] }, { equipmentItems: [{ ...item, id: '' }] },
    { equipmentItems: Array.from({ length: 33 }, (_, i) => ({ ...item, id: `item-${i}` })) },
  ])('rejects malformed saved inventory: %j', (patch) => {
    const current = { ...createDefaultState(), level: 6 }
    const invalid = { ...current, ...patch }
    expect(validateSave(invalid).ok).toBe(false)
  })
})
