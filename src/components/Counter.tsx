import { useId, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'

interface Props {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  signed?: boolean
  tourId?: string
}

export function Counter({ label, value, min, max, onChange, signed = false, tourId }: Props) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const discardDraft = useRef(false)
  const commit = () => {
    if (discardDraft.current) { discardDraft.current = false; setDraft(null); return }
    if (draft !== null) {
      const trimmed = draft.trim().replace('−', '-')
      if (/^[+-]?\d+$/.test(trimmed)) {
        const parsed = Number(trimmed)
        if (Number.isFinite(parsed)) onChange(Math.min(max, Math.max(min, parsed)))
      }
      setDraft(null)
    }
  }
  return (
    <div className="counter">
      <button className="step-button" type="button" disabled={value <= min} aria-label={`${label}: уменьшить`}
        onClick={() => { setDraft(null); onChange(value - 1) }}><Minus size={20} /></button>
      <input
        id={id}
        className="counter-value"
        aria-label={label}
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        inputMode={min < 0 ? 'text' : 'numeric'}
        enterKeyHint="done"
        autoComplete="off"
        spellCheck={false}
        maxLength={7}
        value={draft ?? (signed && value > 0 ? `+${value}` : String(value))}
        onFocus={(event) => { discardDraft.current = false; setDraft(String(value)); event.currentTarget.select() }}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') { discardDraft.current = true; setDraft(null); event.currentTarget.blur() }
          if (event.key === 'ArrowUp') { event.preventDefault(); setDraft(null); onChange(value + 1) }
          if (event.key === 'ArrowDown') { event.preventDefault(); setDraft(null); onChange(value - 1) }
        }}
      />
      <button className="step-button" type="button" data-tour={tourId ? `${tourId}-increase` : undefined} disabled={value >= max} aria-label={`${label}: увеличить`}
        onClick={() => { setDraft(null); onChange(value + 1) }}><Plus size={20} /></button>
    </div>
  )
}
