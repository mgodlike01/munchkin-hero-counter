import type { GameAction, GameState } from '../types/game'
import { clampStat, createDefaultState } from '../utils/game'
import { isStarterItem, MAX_EQUIPMENT_ITEMS, MAX_ITEM_BONUS, MAX_ITEM_NAME, ordinaryItemCount, starterEquipment, withCompanions } from '../utils/equipment'

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'setStat':
      return { ...state, [action.key]: clampStat(action.key, action.value, state.epicMode) }
    case 'setSetting':
      return {
        ...state,
        [action.key]: action.value,
        level: action.key === 'epicMode' ? clampStat('level', state.level, action.value) : state.level,
      }
    case 'setTheme':
      return { ...state, theme: action.value }
    case 'setGameEdition': {
      if (action.value === state.gameEdition) return state
      const items = state.equipmentItems.length ? state.equipmentItems : starterEquipment(state.equipmentBonus, action.value)
      return { ...state, gameEdition: action.value, equipmentItems: action.value === 'companions' ? withCompanions(items) : items }
    }
    case 'setEquipmentMode':
      return {
        ...state,
        equipmentMode: action.value,
        equipmentItems: action.value === 'items' && state.equipmentItems.length === 0
          ? starterEquipment(state.equipmentBonus, state.gameEdition) : state.equipmentItems,
      }
    case 'setItemBonus':
      if (!Number.isFinite(action.value)) return state
      return { ...state, equipmentItems: state.equipmentItems.map((item) => item.id === action.id
        ? { ...item, bonus: Math.max(0, Math.min(MAX_ITEM_BONUS, Math.trunc(action.value))) } : item) }
    case 'setQuickItemBonus':
    case 'toggleQuickItem': {
      if (action.type === 'setQuickItemBonus' && !Number.isFinite(action.value)) return state
      const items = state.equipmentItems.length ? state.equipmentItems : starterEquipment(state.equipmentBonus, state.gameEdition)
      if (!items.some((item) => item.id === action.id)) return state
      const advanced = { ...state, equipmentMode: 'items' as const, equipmentItems: items }
      return action.type === 'setQuickItemBonus'
        ? gameReducer(advanced, { type: 'setItemBonus', id: action.id, value: action.value })
        : gameReducer(advanced, { type: 'toggleItem', id: action.id })
    }
    case 'renameItem':
      return { ...state, equipmentItems: state.equipmentItems.map((item) => item.id === action.id
        ? { ...item, name: action.value.slice(0, MAX_ITEM_NAME) } : item) }
    case 'toggleItem':
      return { ...state, equipmentItems: state.equipmentItems.map((item) => item.id === action.id
        ? { ...item, equipped: !item.equipped } : item) }
    case 'addItem':
      if (ordinaryItemCount(state.equipmentItems) >= MAX_EQUIPMENT_ITEMS || !action.id || action.id.length > 80 || state.equipmentItems.some((item) => item.id === action.id)) return state
      return { ...state, equipmentItems: [...state.equipmentItems, { id: action.id, slot: 'other', name: '', bonus: 0, equipped: true }] }
    case 'removeItem':
      return { ...state, equipmentItems: state.equipmentItems.filter((item) => item.id !== action.id || isStarterItem(item)) }
    case 'resetTemporary':
      return { ...state, temporaryModifier: 0 }
    case 'finishBattle':
      return { ...state, temporaryModifier: 0, monsterPower: 0 }
    case 'newGame':
      return {
        ...createDefaultState(),
        epicMode: state.epicMode,
        heroWinsTies: state.heroWinsTies,
        theme: state.theme,
        haptics: state.haptics,
        equipmentMode: state.equipmentMode,
        gameEdition: state.gameEdition,
        equipmentItems: state.equipmentMode === 'items' || state.gameEdition === 'companions' ? starterEquipment(0, state.gameEdition) : [],
      }
  }
}
