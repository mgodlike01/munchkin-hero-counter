import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices } from 'lucide-react'
import type { DiceValue } from '../utils/dice'
import { Modal } from './Modal'

const faces = { 1: Dice1, 2: Dice2, 3: Dice3, 4: Dice4, 5: Dice5, 6: Dice6 }

export function DiceModal({ value, rollNumber, onRoll, onClose }: {
  value: DiceValue; rollNumber: number; onRoll: () => void; onClose: () => void
}) {
  const Face = faces[value]
  return (
    <Modal title="Кубик D6" onClose={onClose} compact>
      <div className="dice-result" role="status" aria-live="polite" aria-atomic="true">
        <Face size={104} strokeWidth={1.3} aria-hidden="true" />
        <output aria-label="Результат броска">{value}</output>
        <p>Бросок №{rollNumber}</p>
      </div>
      <button className="primary-button dice-roll-button" type="button" onClick={onRoll} autoFocus><Dices size={19} />Бросить ещё</button>
      <p className="settings-footnote">Броски не меняют показатели героя.</p>
    </Modal>
  )
}
