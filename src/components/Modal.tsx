import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props { title: string; children: ReactNode; onClose: () => void; compact?: boolean; tourId?: string }
const openModals = new Set<HTMLDialogElement>()
let originalOverflow = ''

export function Modal({ title, children, onClose, compact = false, tourId }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement as HTMLElement | null
    if (!openModals.size) originalOverflow = document.body.style.overflow
    if (dialog) openModals.add(dialog)
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    if (dialog) dialog.scrollTop = 0
    return () => {
      dialog?.close()
      if (dialog) openModals.delete(dialog)
      if (!openModals.size) document.body.style.overflow = originalOverflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog ref={ref} className={`modal ${compact ? 'modal-compact' : ''}`} aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal-body">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button className="icon-button" type="button" data-tour={tourId ? `${tourId}-close` : undefined} onClick={onClose} aria-label={`Закрыть: ${title}`}><X size={20} /></button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function ConfirmDialog({ title, children, confirmLabel, onConfirm, onCancel }: {
  title: string; children: ReactNode; confirmLabel: string; onConfirm: () => void; onCancel: () => void
}) {
  return (
    <Modal title={title} onClose={onCancel} compact>
      <div className="confirm-copy">{children}</div>
      <div className="dialog-actions">
        <button className="secondary-button" onClick={onCancel} autoFocus>Отмена</button>
        <button className="primary-button" data-tour="confirm-action" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}
