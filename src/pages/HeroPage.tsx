import { useEffect, useState } from 'react'
import { Check, ChevronRight, Crown, Dices, Download, GraduationCap, Info, RotateCcw, Settings2, WifiOff, X } from 'lucide-react'
import { useGame } from '../hooks/useGame'
import { usePwa } from '../hooks/usePwa'
import { HeroPanel } from '../components/HeroPanel'
import { EquipmentPanel } from '../components/EquipmentPanel'
import { SettingsModal } from '../components/SettingsModal'
import { InstallModal } from '../components/InstallModal'
import { EquipmentModal } from '../components/EquipmentModal'
import { ConfirmDialog } from '../components/Modal'
import { DiceModal } from '../components/DiceModal'
import { rollD6 } from '../utils/dice'
import type { DiceValue } from '../utils/dice'
import { TUTORIAL_STEPS, useTutorial } from '../hooks/useTutorial'
import { TutorialCoach } from '../components/TutorialCoach'
import { DocumentationModal } from '../components/DocumentationModal'

export function HeroPage() {
  const { state: savedState, dispatch: saveDispatch, warning, dismissWarning, storageFailed } = useGame()
  const tutorial = useTutorial()
  const state = tutorial.session?.game ?? savedState
  const dispatch = tutorial.session ? tutorial.dispatch : saveDispatch
  const pwa = usePwa()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [newGamePending, setNewGamePending] = useState(false)
  const [documentationOpen, setDocumentationOpen] = useState(false)
  const [tutorialJustFinished, setTutorialJustFinished] = useState(false)
  const [dice, setDice] = useState<{ value: DiceValue; rollNumber: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', state.theme === 'dark' ? '#242522' : '#f2e4c5')
  }, [state.theme])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4500)
    return () => window.clearTimeout(timer)
  }, [notice])

  function throwDice() {
    const value = rollD6()
    setDice((previous) => ({ value, rollNumber: (previous?.rollNumber ?? 0) + 1 }))
  }

  function startTutorial() {
    setSettingsOpen(false)
    setEquipmentOpen(false)
    setDocumentationOpen(false)
    setNewGamePending(false)
    setDice(null)
    setNotice(null)
    setTutorialJustFinished(false)
    tutorial.start(savedState.theme)
  }

  function finishTutorial(completed = false) {
    tutorial.finish(completed)
    setSettingsOpen(false)
    setEquipmentOpen(false)
    setDocumentationOpen(completed)
    setTutorialJustFinished(completed)
    setNewGamePending(false)
    setDice(null)
  }

  function advanceTutorial(id: string) {
    const current = tutorial.session
    if (!current || TUTORIAL_STEPS[current.index].id !== id) return
    if (current.index === TUTORIAL_STEPS.length - 1) finishTutorial(true)
    else tutorial.advance(id)
  }

  function openDocumentation() {
    setSettingsOpen(false)
    setDocumentationOpen(true)
    setTutorialJustFinished(Boolean(tutorial.session))
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="Манчкин — Счётчик героя, главная">
          <span className="brand-mark"><img src="/icon.svg" alt="" width="48" height="48" /></span>
          <div><span className="brand-eyebrow">МАНЧКИН</span><h1>Счётчик героя</h1></div>
        </a>
        <div className="header-actions"><span className="mode-badge"><span />{state.epicMode ? 'Эпическая' : 'Обычная'} партия <b>1–{state.epicMode ? 20 : 10}</b></span>
          <button className="icon-button settings-button" data-tour="settings-open" aria-label="Открыть настройки" onClick={() => setSettingsOpen(true)}><Settings2 size={21} /></button></div>
      </header>
      <main>
        <div className="page-intro"><div><p className="eyebrow"><span />ЛИСТ ТВОЕГО ПРИКЛЮЧЕНИЯ</p><h2>Всё решает <em>сила!</em></h2><p className="intro-copy">Хватай шмотки. Круши монстров. Забирай сокровища.</p></div>
          <div className="intro-ornament" aria-hidden="true"><span /><Crown size={22} strokeWidth={1.2} /><span /></div>
        </div>
        {tutorial.invitationVisible && !tutorial.session && <section className="tutorial-invitation" aria-label="Знакомство с приложением">
          <div><h2><GraduationCap size={22} />Первый раз за столом?</h2><p>Покажем кнопки за минуту. Твоя партия сохранится.</p></div>
          <div className="tutorial-invitation-actions"><button className="primary-button" type="button" onClick={startTutorial}>Начать обучение</button>
            <button className="secondary-button" type="button" onClick={tutorial.dismissInvitation}>Позже</button></div>
        </section>}
        {(warning || storageFailed) && <div className="warning-banner" role="alert"><Info size={18} /><p>{storageFailed ? 'Не удалось сохранить прогресс. Разреши сайту хранить данные в настройках браузера. До этого прогресс может потеряться при закрытии или перезагрузке.' : warning}</p>{!storageFailed && <button className="icon-button" onClick={dismissWarning} aria-label="Закрыть предупреждение"><X size={17} /></button>}</div>}
        <div className="dashboard"><HeroPanel state={state} dispatch={dispatch} onEquipment={() => setEquipmentOpen(true)} /><EquipmentPanel state={state} dispatch={dispatch} onManage={() => setEquipmentOpen(true)} /></div>
        <div className="main-game-actions">
          <button className="secondary-button" type="button" onClick={throwDice}><Dices size={18} />Кубик D6</button>
          <button className="new-game-button" type="button" onClick={() => setNewGamePending(true)}><RotateCcw size={17} />Новая партия</button>
        </div>
        <div className="table-tip"><span className="tip-icon"><Info size={16} /></span><p>Всё просто: <strong>уровень + бонусы + модификаторы.</strong><span className="desktop-tip"> Чтобы ввести число, нажми на него.</span></p></div>
      </main>
      <footer className="app-footer">
        <div className="save-status"><span className="status-dot" /><span>{storageFailed ? 'Не сохранено' : 'Прогресс сохраняется'}<i>·</i><span className="offline-status">{!pwa.online ? <><WifiOff size={12} />Без интернета</> : pwa.offlineReady ? 'Готово к офлайну' : import.meta.env.DEV ? 'Режим разработки' : 'Подготовка офлайна…'}</span></span></div>
        <button className="install-link" onClick={() => setInstallOpen(true)}><Download size={15} />{pwa.installed ? 'О приложении' : 'На главный экран'}<ChevronRight size={14} /></button>
      </footer>
      <div className="bottom-signature" aria-hidden="true"><span />МЕНЬШЕ ПОДСЧЁТОВ. БОЛЬШЕ ПРИКЛЮЧЕНИЙ.<span /></div>
      {settingsOpen && <SettingsModal state={state} dispatch={dispatch} onClose={() => setSettingsOpen(false)} onNotice={setNotice} onTutorial={startTutorial} onDocumentation={openDocumentation} />}
      {equipmentOpen && <EquipmentModal state={state} dispatch={dispatch} onClose={() => setEquipmentOpen(false)} />}
      {installOpen && <InstallModal canInstall={pwa.canInstall} installed={pwa.installed} offlineReady={pwa.offlineReady} onInstall={pwa.install} onClose={() => setInstallOpen(false)} />}
      {dice && <DiceModal value={dice.value} rollNumber={dice.rollNumber} onRoll={throwDice} onClose={() => setDice(null)} />}
      {documentationOpen && <DocumentationModal onClose={() => setDocumentationOpen(false)} onTutorial={startTutorial} afterTutorial={tutorialJustFinished} />}
      {newGamePending && <ConfirmDialog title="Начать новую партию?" confirmLabel="Начать заново" onCancel={() => setNewGamePending(false)} onConfirm={() => {
        dispatch({ type: 'newGame' })
        setNewGamePending(false)
        setNotice('Новая партия началась. Удачного приключения!')
      }}><p>Уровень вернётся к 1, бонусы и модификаторы — к 0. Названия и бонусы снаряжения очистятся, включая скрытого наёмника и скакуна. Версия игры и настройки сохранятся.</p></ConfirmDialog>}
      {notice && <div className="toast" role="status"><Check size={18} /><span>{notice}</span><button className="icon-button" aria-label="Закрыть уведомление" onClick={() => setNotice(null)}><X size={16} /></button></div>}
      {pwa.needRefresh && <div className="update-prompt" role="status"><div><strong>Прибыло обновление</strong><p>Прогресс сохранён. Обновить приложение?</p></div><button className="primary-button" onClick={() => void pwa.update().catch(() => setNotice('Обновление не загружено. Попробуйте снова при подключении к интернету.'))}>Обновить</button><button className="icon-button" aria-label="Обновить позже" onClick={pwa.dismissUpdate}><X size={18} /></button></div>}
      {pwa.registrationError && <div className="pwa-error" role="status">Офлайн-режим не подключён. Откройте приложение по HTTPS или localhost и перезагрузите страницу.</div>}
      {tutorial.session && <TutorialCoach index={tutorial.session.index} onAdvance={advanceTutorial} onExit={() => finishTutorial()} />}
    </div>
  )
}
