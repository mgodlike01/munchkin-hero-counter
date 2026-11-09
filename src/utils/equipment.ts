import type { EquipmentItem, EquipmentSlot, GameEdition, GameState } from '../types/game'

export const MAX_EQUIPMENT_ITEMS = 32
export const MAX_ITEM_NAME = 64
export const MAX_ITEM_BONUS = 999
const BASE_SLOTS: { slot: EquipmentSlot; label: string; hint: string }[] = [
  { slot: 'head', label: 'Головняк', hint: 'Шлем, шляпа и другие головные уборы' },
  { slot: 'armor', label: 'Броня', hint: 'Защита твоего героя' },
  { slot: 'boots', label: 'Обувка', hint: 'Сапоги и прочая обувь' },
  { slot: 'hand1', label: 'Правая рука', hint: 'Оружие или щит' },
  { slot: 'hand2', label: 'Левая рука', hint: 'Второй предмет в руках' },
  { slot: 'other', label: 'Другие бонусы', hint: 'Всё, что не занимает обычный слот' },
]
export const COMPANION_SLOTS: { slot: EquipmentSlot; label: string; hint: string }[] = [
  { slot: 'hireling', label: 'Наёмник', hint: 'Бонус твоего помощника' },
  { slot: 'steed', label: 'Скакун', hint: 'Бонус твоего скакуна' },
]
export const EQUIPMENT_SLOTS = [...BASE_SLOTS, ...COMPANION_SLOTS]
export const MAX_STORED_EQUIPMENT_ITEMS = MAX_EQUIPMENT_ITEMS + COMPANION_SLOTS.length

export function starterEquipment(carriedBonus = 0, edition: GameEdition = 'base'): EquipmentItem[] {
  const slots = edition === 'companions' ? EQUIPMENT_SLOTS : BASE_SLOTS
  return slots.map(({ slot }) => ({
    id: `slot-${slot}`, slot, name: '',
    bonus: slot === 'other' ? carriedBonus : 0,
    equipped: true,
  }))
}

export function isCompanionItem(item: EquipmentItem): boolean {
  return COMPANION_SLOTS.some(({ slot }) => item.slot === slot)
}

export function visibleEquipment(items: EquipmentItem[], edition: GameEdition): EquipmentItem[] {
  return edition === 'companions' ? items : items.filter((item) => !isCompanionItem(item))
}

export function withCompanions(items: EquipmentItem[]): EquipmentItem[] {
  const missing = starterEquipment(0, 'companions')
    .filter((item) => isCompanionItem(item) && !items.some(({ id }) => id === item.id))
  return [...items, ...missing]
}

export function ordinaryItemCount(items: EquipmentItem[]): number {
  return items.filter((item) => !isCompanionItem(item)).length
}

export function itemBonusTotal(items: EquipmentItem[]): number {
  return items.reduce((total, item) => total + (item.equipped ? item.bonus : 0), 0)
}

export function equipmentTotal(state: GameState): number {
  return state.equipmentMode === 'items' ? itemBonusTotal(visibleEquipment(state.equipmentItems, state.gameEdition)) : state.equipmentBonus
}

export function isStarterItem(item: EquipmentItem): boolean {
  return EQUIPMENT_SLOTS.some(({ slot }) => item.id === `slot-${slot}`)
}

export function equipmentLabel(items: EquipmentItem[], index: number): string {
  const item = items[index]
  return isStarterItem(item)
    ? EQUIPMENT_SLOTS.find(({ slot }) => slot === item.slot)!.label
    : `Доп. предмет ${items.slice(0, index + 1).filter((entry) => !isStarterItem(entry)).length}`
}
