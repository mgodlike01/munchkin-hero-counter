export type EquipmentMode = 'manual' | 'items'
export type GameEdition = 'base' | 'companions'
export type EquipmentSlot = 'head' | 'armor' | 'boots' | 'hand1' | 'hand2' | 'other' | 'hireling' | 'steed'

export interface EquipmentItem {
  id: string
  slot: EquipmentSlot
  name: string
  bonus: number
  equipped: boolean
}

export interface GameState {
  schemaVersion: 2
  level: number
  equipmentBonus: number
  equipmentMode: EquipmentMode
  gameEdition: GameEdition
  equipmentItems: EquipmentItem[]
  temporaryModifier: number
  monsterPower: number
  epicMode: boolean
  heroWinsTies: boolean
  theme: 'dark' | 'light'
  haptics: boolean
}

export type StatKey = 'level' | 'equipmentBonus' | 'temporaryModifier' | 'monsterPower'
export type SettingKey = 'epicMode' | 'heroWinsTies' | 'haptics'

export type GameAction =
  | { type: 'setStat'; key: StatKey; value: number }
  | { type: 'setSetting'; key: SettingKey; value: boolean }
  | { type: 'setTheme'; value: GameState['theme'] }
  | { type: 'setEquipmentMode'; value: EquipmentMode }
  | { type: 'setGameEdition'; value: GameEdition }
  | { type: 'setItemBonus'; id: string; value: number }
  | { type: 'setQuickItemBonus'; id: string; value: number }
  | { type: 'toggleQuickItem'; id: string }
  | { type: 'renameItem'; id: string; value: string }
  | { type: 'toggleItem'; id: string }
  | { type: 'addItem'; id: string }
  | { type: 'removeItem'; id: string }
  | { type: 'resetTemporary' }
  | { type: 'finishBattle' }
  | { type: 'newGame' }
