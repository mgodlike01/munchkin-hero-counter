import { useId, useState } from 'react'
import type { Dispatch } from 'react'
import { BookOpen, Crown, GraduationCap, Moon, Sun, Vibrate } from 'lucide-react'
import type { GameAction, GameState } from '../types/game'
import { ConfirmDialog, Modal } from './Modal'

function Toggle({ label, description, checked, onChange, icon: Icon }: {
  label: string; description: string; checked: boolean; onChange: () => void; icon: typeof Crown
}) {
  const id = useId()
  return (
    <div className="setting-row">
      <Icon size={20} className="setting-icon" />
      <div className="setting-copy"><label id={id}>{label}</label><p>{description}</p></div>
      <button className="toggle" type="button" role="switch" aria-checked={checked} aria-labelledby={id} onClick={onChange}><span /></button>
    </div>
  )
}

export function SettingsModal({ state, dispatch, onClose, onNotice, onTutorial, onDocumentation }: {
  state: GameState; dispatch: Dispatch<GameAction>; onClose: () => void; onNotice: (message: string) => void
  onTutorial: () => void; onDocumentation: () => void
}) {
  const [normalModePending, setNormalModePending] = useState(false)
  const hasVibration = typeof navigator.vibrate === 'function'

  function confirm() {
    dispatch({ type: 'setSetting', key: 'epicMode', value: false })
    onNotice('Обычный режим включён. Уровень изменён на 10.')
    setNormalModePending(false)
  }

  return (
    <>
      <Modal title="Настройки приключения" onClose={onClose} tourId="settings">
        <p className="settings-intro">Твоя партия — твои правила.</p>
        <div className="edition-setting">
          <h3>Версия игры</h3>
          <div className="edition-selector" role="group" aria-label="Версия игры">
            <button type="button" aria-pressed={state.gameEdition === 'base'} onClick={() => dispatch({ type: 'setGameEdition', value: 'base' })}>Базовая</button>
            <button type="button" aria-pressed={state.gameEdition === 'companions'} onClick={() => dispatch({ type: 'setGameEdition', value: 'companions' })}>Наёмники и скакуны</button>
          </div>
          <p>{state.gameEdition === 'companions'
            ? 'Наёмник и скакун добавлены в снаряжение. Их бонусы задаются отдельно.'
            : 'Основные слоты снаряжения. Бонусы наёмника и скакуна не учитываются.'}</p>
        </div>
        <div className="settings-group">
          <Toggle label="Эпический режим" description="Уровни от 1 до 20 вместо 10" icon={Crown} checked={state.epicMode}
            onChange={() => state.epicMode && state.level > 10 ? setNormalModePending(true) : dispatch({ type: 'setSetting', key: 'epicMode', value: !state.epicMode })} />
          <Toggle label="Виброотклик" description={hasVibration ? 'Лёгкая вибрация при нажатии' : 'Этот браузер не поддерживает вибрацию'} icon={Vibrate} checked={state.haptics}
            onChange={() => dispatch({ type: 'setSetting', key: 'haptics', value: !state.haptics })} />
        </div>
        <div className="theme-row"><span>Оформление</span><div className="theme-selector" role="group" aria-label="Тема оформления">
          <button aria-pressed={state.theme === 'dark'} onClick={() => dispatch({ type: 'setTheme', value: 'dark' })}><Moon size={16} />Тёмная</button>
          <button aria-pressed={state.theme === 'light'} onClick={() => dispatch({ type: 'setTheme', value: 'light' })}><Sun size={16} />Светлая</button>
        </div></div>
        <div className="settings-help-actions" role="group" aria-label="Помощь">
          <button className="secondary-button" type="button" data-tour="training-open" onClick={onTutorial}><GraduationCap size={18} />Обучение</button>
          <button className="secondary-button" type="button" data-tour="documentation-open" onClick={onDocumentation}><BookOpen size={18} />Документация</button>
        </div>
        <p className="settings-footnote">Прогресс хранится на этом устройстве автоматически.</p>
      </Modal>
      {normalModePending && <ConfirmDialog
        title="Вернуться к обычному режиму?" confirmLabel="Включить"
        onCancel={() => setNormalModePending(false)} onConfirm={confirm}>
        <p>Текущий уровень {state.level} станет 10. Остальные показатели сохранятся.</p>
      </ConfirmDialog>}
    </>
  )
}
