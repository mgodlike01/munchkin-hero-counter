import type { EquipmentItem, GameState } from '../types/game'
import { createDefaultState, statRange } from '../utils/game'
import { EQUIPMENT_SLOTS, isCompanionItem, MAX_EQUIPMENT_ITEMS, MAX_STORED_EQUIPMENT_ITEMS, MAX_ITEM_BONUS, MAX_ITEM_NAME, ordinaryItemCount, starterEquipment, withCompanions } from '../utils/equipment'

// Keep the original key so installed v1 applications retain their progress on update.
export const STORAGE_KEY = 'munchkin.hero.v1'
export const RECOVERY_KEY = 'munchkin.hero.recovery'
export const MAX_SAVE_BYTES = 32 * 1024

export type SaveResult = { ok: true; state: GameState } | { ok: false; error: string }
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

export function validateSave(value: unknown): SaveResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Сохранение должно быть JSON-объектом.' }
  }
  const data = value as Record<string, unknown>
  if (data.schemaVersion !== 1 && data.schemaVersion !== 2) {
    return { ok: false, error: 'Неподдерживаемая версия сохранения. Поддерживаются версии 1 и 2.' }
  }
  for (const key of ['epicMode', 'heroWinsTies'] as const) {
    if (typeof data[key] !== 'boolean') return { ok: false, error: `Поле ${key} должно быть логическим.` }
  }
  for (const key of ['level', 'equipmentBonus', 'temporaryModifier', 'monsterPower'] as const) {
    const [min, max] = statRange(key, data.epicMode as boolean)
    const n = data[key]
    if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < min || n > max) {
      return { ok: false, error: `Поле ${key}: требуется целое число от ${min} до ${max}.` }
    }
  }
  if (data.theme !== undefined && data.theme !== 'dark' && data.theme !== 'light') {
    return { ok: false, error: 'Неизвестная тема оформления.' }
  }
  if (data.haptics !== undefined && typeof data.haptics !== 'boolean') {
    return { ok: false, error: 'Поле haptics должно быть логическим.' }
  }
  if (data.gameEdition !== undefined && data.gameEdition !== 'base' && data.gameEdition !== 'companions') {
    return { ok: false, error: 'Неизвестная версия игры.' }
  }
  const gameEdition = data.gameEdition === 'companions' ? 'companions' : 'base'
  const equipmentItems: EquipmentItem[] = []
  if (data.schemaVersion === 2) {
    if (data.equipmentMode !== 'manual' && data.equipmentMode !== 'items') {
      return { ok: false, error: 'Неизвестный режим учёта снаряжения.' }
    }
    if (!Array.isArray(data.equipmentItems) || data.equipmentItems.length > MAX_STORED_EQUIPMENT_ITEMS) {
      return { ok: false, error: `Список снаряжения должен содержать не более ${MAX_EQUIPMENT_ITEMS} обычных предметов и двух спутников.` }
    }
    const ids = new Set<string>()
    for (const entry of data.equipmentItems) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        return { ok: false, error: 'Некорректная запись предмета.' }
      }
      const item = entry as Record<string, unknown>
      if (typeof item.id !== 'string' || !item.id.trim() || item.id.length > 80 || ids.has(item.id)
        || !EQUIPMENT_SLOTS.some(({ slot }) => slot === item.slot)
        || typeof item.name !== 'string' || item.name.length > MAX_ITEM_NAME
        || typeof item.bonus !== 'number' || !Number.isSafeInteger(item.bonus) || item.bonus < 0 || item.bonus > MAX_ITEM_BONUS
        || typeof item.equipped !== 'boolean') {
        return { ok: false, error: 'Проверьте слоты, названия, бонусы и уникальность предметов.' }
      }
      ids.add(item.id)
      const parsed = { id: item.id, slot: item.slot as EquipmentItem['slot'], name: item.name, bonus: item.bonus, equipped: item.equipped }
      if ((isCompanionItem(parsed) && parsed.id !== `slot-${parsed.slot}`)
        || (['slot-hireling', 'slot-steed'].includes(parsed.id) && parsed.id !== `slot-${parsed.slot}`)) {
        return { ok: false, error: 'Некорректный слот наёмника или скакуна.' }
      }
      equipmentItems.push(parsed)
    }
    if (ordinaryItemCount(equipmentItems) > MAX_EQUIPMENT_ITEMS) {
      return { ok: false, error: `Можно сохранить не более ${MAX_EQUIPMENT_ITEMS} обычных предметов.` }
    }
  }
  // Only allow known fields; optional settings keep original v1 saves compatible.
  return {
    ok: true,
    state: {
      schemaVersion: 2,
      level: data.level as number,
      equipmentBonus: data.equipmentBonus as number,
      equipmentMode: data.schemaVersion === 2 ? data.equipmentMode as GameState['equipmentMode'] : 'manual',
      gameEdition,
      equipmentItems: gameEdition === 'companions'
        ? equipmentItems.length ? withCompanions(equipmentItems) : starterEquipment(data.equipmentBonus as number, gameEdition)
        : equipmentItems,
      temporaryModifier: data.temporaryModifier as number,
      monsterPower: data.monsterPower as number,
      epicMode: data.epicMode as boolean,
      heroWinsTies: data.heroWinsTies as boolean,
      theme: data.theme === 'light' ? 'light' : 'dark',
      haptics: (data.haptics as boolean | undefined) ?? true,
    },
  }
}

export function parseSave(json: string): SaveResult {
  if (new TextEncoder().encode(json).byteLength > MAX_SAVE_BYTES) {
    return { ok: false, error: 'Сохранение слишком большое. Максимум — 32 КБ.' }
  }
  try {
    return validateSave(JSON.parse(json))
  } catch {
    return { ok: false, error: 'Не удалось прочитать сохранение.' }
  }
}

export function loadGame(storage: StoragePort): { state: GameState; warning: string | null } {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw === null) return { state: createDefaultState(), warning: null }
    const result = parseSave(raw)
    if (result.ok) return { state: result.state, warning: null }
    // Keep the unreadable source separate before allowing a fresh game to be saved.
    storage.setItem(RECOVERY_KEY, raw)
    return {
      state: createDefaultState(),
      warning: 'Сохранение повреждено или имеет другую версию. Исходные данные оставлены в резерве; начата новая партия.',
    }
  } catch {
    return {
      state: createDefaultState(),
      warning: 'Хранилище браузера недоступно. Прогресс потеряется после закрытия или перезагрузки приложения.',
    }
  }
}

export function saveGame(storage: StoragePort, state: GameState): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

