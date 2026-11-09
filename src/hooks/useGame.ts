import { useCallback, useRef, useState } from 'react'
import type { GameAction } from '../types/game'
import { loadGame, saveGame } from '../services/save'
import { createDefaultState } from '../utils/game'
import { gameReducer } from '../store/gameReducer'

function initialGame() {
  try {
    return loadGame(window.localStorage)
  } catch {
    return { state: createDefaultState(), warning: 'Хранилище браузера недоступно. Прогресс потеряется после закрытия или перезагрузки приложения.' }
  }
}

export function useGame() {
  const [initial] = useState(initialGame)
  const [state, setState] = useState(initial.state)
  const [warning, setWarning] = useState(initial.warning)
  const [storageFailed, setStorageFailed] = useState(false)
  const current = useRef(state)

  const dispatch = useCallback((action: GameAction) => {
    const next = gameReducer(current.current, action)
    // Persist synchronously, before paint: closing the PWA immediately after a tap keeps that tap.
    let saved = false
    try { saved = saveGame(window.localStorage, next) } catch { /* Storage may be blocked. */ }
    setStorageFailed(!saved)
    current.current = next
    setState(next)
    if (action.type !== 'renameItem' && next.haptics && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(8) } catch { /* Unsupported devices still work. */ }
    }
  }, [])

  return { state, dispatch, warning, dismissWarning: () => setWarning(null), storageFailed }
}
