import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GraduationCap, X } from 'lucide-react'
import { TUTORIAL_STEPS } from '../hooks/useTutorial'

type Anchor = { element: HTMLElement; left: number; top: number; right: number; bottom: number; vw: number; vh: number }
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n))

export function TutorialCoach({ index, onAdvance, onExit }: {
  index: number; onAdvance: (id: string) => void; onExit: () => void
}) {
  const step = TUTORIAL_STEPS[index]
  const [anchor, setAnchor] = useState<Anchor | null>(null)
  const [tipHeight, setTipHeight] = useState(230)
  const card = useRef<HTMLDivElement>(null)
  const callbacks = useRef({ onAdvance, onExit })
  callbacks.current = { onAdvance, onExit }

  useEffect(() => {
    document.documentElement.dataset.tourActive = 'true'
    let target: HTMLElement | null = null
    let frame = 0
    const clicked = () => callbacks.current.onAdvance(step.id)
    const resize = new ResizeObserver(() => schedule())

    function update() {
      const candidate = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      if (!candidate || !candidate.getClientRects().length) { setAnchor(null); return }
      if (candidate !== target) {
        target?.removeEventListener('click', clicked)
        target?.classList.remove('tour-target')
        resize.disconnect()
        target = candidate
        target.classList.add('tour-target')
        target.scrollIntoView({ block: 'end', inline: 'nearest', behavior: 'auto' })
        target.focus({ preventScroll: true })
        target.addEventListener('click', clicked)
        resize.observe(target)
      }
      const rect = target.getBoundingClientRect()
      const next = { element: target, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, vw: window.innerWidth, vh: window.innerHeight }
      setAnchor((previous) => previous && Object.keys(next).every((key) => previous[key as keyof Anchor] === next[key as keyof Anchor]) ? previous : next)
    }

    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(update) }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    document.addEventListener('scroll', schedule, true)
    window.addEventListener('resize', schedule)

    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        callbacks.current.onExit()
      } else if (event.key === 'Tab') {
        const controls = [target, ...Array.from(card.current?.querySelectorAll<HTMLElement>('button') ?? [])]
          .filter((element): element is HTMLElement => !!element && element.isConnected)
        if (!controls.length) return
        event.preventDefault()
        const current = controls.indexOf(document.activeElement as HTMLElement)
        controls[(current + (event.shiftKey ? controls.length - 1 : 1)) % controls.length].focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', keydown, true)
    const cancel = (event: Event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      callbacks.current.onExit()
    }
    document.addEventListener('cancel', cancel, true)
    schedule()
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      resize.disconnect()
      target?.removeEventListener('click', clicked)
      target?.classList.remove('tour-target')
      document.removeEventListener('scroll', schedule, true)
      window.removeEventListener('resize', schedule)
      document.removeEventListener('keydown', keydown, true)
      document.removeEventListener('cancel', cancel, true)
      delete document.documentElement.dataset.tourActive
    }
  }, [step.id, step.target])

  const container = anchor?.element.closest('dialog[open]')
    ?? Array.from(document.querySelectorAll('dialog[open]')).at(-1) ?? document.body
  useLayoutEffect(() => {
    if (!card.current) return
    const observer = new ResizeObserver(() => {
      if (card.current) setTipHeight(Math.ceil(card.current.getBoundingClientRect().height))
    })
    observer.observe(card.current)
    setTipHeight(Math.ceil(card.current.getBoundingClientRect().height))
    return () => observer.disconnect()
  }, [container, step.id])

  const vw = anchor?.vw ?? window.innerWidth
  const vh = anchor?.vh ?? window.innerHeight
  const width = Math.min(340, vw - 24)
  const hole = anchor ? {
    left: clamp(anchor.left - 6, 0, vw), top: clamp(anchor.top - 6, 0, vh),
    right: clamp(anchor.right + 6, 0, vw), bottom: clamp(anchor.bottom + 6, 0, vh),
  } : { left: vw / 2, right: vw / 2, top: vh / 2, bottom: vh / 2 }
  let left = clamp((hole.left + hole.right - width) / 2, 12, vw - width - 12)
  let top: number
  if (vh - hole.bottom >= tipHeight + 24) top = hole.bottom + 12
  else if (hole.top >= tipHeight + 24) top = hole.top - tipHeight - 12
  else if (hole.left >= width + 24) { left = hole.left - width - 12; top = clamp((hole.top + hole.bottom - tipHeight) / 2, 12, vh - tipHeight - 12) }
  else if (vw - hole.right >= width + 24) { left = hole.right + 12; top = clamp((hole.top + hole.bottom - tipHeight) / 2, 12, vh - tipHeight - 12) }
  else top = hole.top > vh / 2 ? 12 : Math.max(12, vh - tipHeight - 12)

  return createPortal(
    <div className="tutorial-layer" data-testid="tutorial-layer">
      <div className="tutorial-shade" style={{ left: 0, top: 0, width: vw, height: hole.top }} />
      <div className="tutorial-shade" style={{ left: 0, top: hole.bottom, width: vw, height: vh - hole.bottom }} />
      <div className="tutorial-shade" style={{ left: 0, top: hole.top, width: hole.left, height: hole.bottom - hole.top }} />
      <div className="tutorial-shade" style={{ left: hole.right, top: hole.top, width: vw - hole.right, height: hole.bottom - hole.top }} />
      {anchor && <div className="tutorial-ring" aria-hidden="true" style={{ left: hole.left, top: hole.top, width: hole.right - hole.left, height: hole.bottom - hole.top }} />}
      <div className="tutorial-card" ref={card} role="region" aria-label="Подсказка обучения" aria-live="polite" aria-atomic="true"
        data-testid="tutorial-card" style={{ left, top, width }}>
        <div className="tutorial-card-heading"><span><GraduationCap size={17} />Шаг {index + 1} из {TUTORIAL_STEPS.length}</span>
          <button className="icon-button" type="button" aria-label="Выйти из обучения" onClick={onExit}><X size={18} /></button></div>
        <h2>{step.title}</h2><p>{step.text}</p>
        <div className="tutorial-safety">Учебная партия · твой герой сохранён</div>
      </div>
    </div>, container,
  )
}
