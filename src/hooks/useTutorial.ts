import { useState } from 'react'
import type { GameAction, GameState } from '../types/game'
import { gameReducer } from '../store/gameReducer'
import { createDefaultState } from '../utils/game'

export const TUTORIAL_KEY = 'munchkin.tutorial.v1'
export const TUTORIAL_STEPS = [
  { id: 'level', target: 'level-increase', title: 'Добавим уровень', text: 'Нажми «+» у уровня. В обычной партии так же добавляй заслуженные уровни, а «−» убирай лишние.' },
  { id: 'equipment', target: 'equipment-open', title: 'Открой снаряжение', text: 'Здесь настраиваются названия, бонусы и дополнительные вещи. Нажми на подсвеченный значок.' },
  { id: 'item-mode', target: 'equipment-items', title: 'Считай по предметам', text: 'Выбери «По предметам»: сила будет учитывать бонусы включённых вещей. Ручная сумма сохраняется отдельно.' },
  { id: 'add', target: 'equipment-add', title: 'Добавим новую вещь', text: 'Нажми «Добавить предмет». Появится отдельная карточка: в ней можно написать название и задать бонус.' },
  { id: 'remove', target: 'equipment-remove', title: 'Теперь уберём её', text: 'Нажми на корзину у добавленной вещи. Основные слоты не удаляются — их можно убрать в запас нажатием на иконку.' },
  { id: 'confirm', target: 'confirm-action', title: 'Подтверди удаление', text: 'Чтобы случайно не потерять вещь, удаление нужно подтвердить. Сейчас мы удаляем только учебный предмет.' },
  { id: 'close-equipment', target: 'equipment-close', title: 'Вернёмся к герою', text: 'Закрой снаряжение. На главном экране бонусы вещей удобно менять кнопками «−» и «+».' },
  { id: 'settings', target: 'settings-open', title: 'Настройки — здесь', text: 'Нажми на значок вверху. Здесь выбираются версия игры, эпический режим, тема и вибрация.' },
  { id: 'documentation', target: 'documentation-open', title: 'Вся помощь под рукой', text: 'Нажми «Документация», чтобы открыть полную справку. Кнопка «Обучение» рядом позволит повторить эти шаги в любое время.' },
] as const

type Session = { index: number; game: GameState }

function invitationNeeded() {
  try { return window.localStorage.getItem(TUTORIAL_KEY) === null } catch { return false }
}

function remember(status: string) {
  try { window.localStorage.setItem(TUTORIAL_KEY, status) } catch { /* Help also works with blocked storage. */ }
}

export function useTutorial() {
  const [session, setSession] = useState<Session | null>(null)
  const [invitationVisible, setInvitationVisible] = useState(invitationNeeded)

  function start(theme: GameState['theme']) {
    remember('started')
    setInvitationVisible(false)
    setSession({ index: 0, game: { ...createDefaultState(), theme, haptics: false } })
  }

  function dispatch(action: GameAction) {
    // This reducer updates a separate in-memory hero, never the real save hook.
    setSession((current) => current ? { ...current, game: gameReducer(current.game, action) } : current)
  }

  function advance(expected: string) {
    setSession((current) => current && TUTORIAL_STEPS[current.index].id === expected && current.index < TUTORIAL_STEPS.length - 1
      ? { ...current, index: current.index + 1 } : current)
  }

  function finish(completed = false) {
    remember(completed ? 'completed' : 'dismissed')
    setInvitationVisible(false)
    setSession(null)
  }

  function dismissInvitation() {
    remember('dismissed')
    setInvitationVisible(false)
  }

  return { session, start, dispatch, advance, finish, invitationVisible, dismissInvitation }
}
