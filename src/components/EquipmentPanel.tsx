import { useState } from 'react'
import type { Dispatch } from 'react'
import { Minus, Plus, Shield, SlidersHorizontal } from 'lucide-react'
import type { GameAction, GameState } from '../types/game'
import { equipmentLabel, equipmentTotal, itemBonusTotal, MAX_ITEM_BONUS, starterEquipment, visibleEquipment } from '../utils/equipment'
import { signed } from '../utils/game'
import { gameReducer } from '../store/gameReducer'
import { EquipmentIcon } from './EquipmentIcon'
import { ConfirmDialog } from './Modal'

type QuickAction = Extract<GameAction, { type: 'setQuickItemBonus' | 'toggleQuickItem' }>

export function EquipmentPanel({ state, dispatch, onManage }: {
  state: GameState; dispatch: Dispatch<GameAction>; onManage: () => void
}) {
  const [pending, setPending] = useState<QuickAction | null>(null)
  const items = visibleEquipment(state.equipmentItems.length ? state.equipmentItems : starterEquipment(state.equipmentBonus, state.gameEdition), state.gameEdition)
  const previewTotal = itemBonusTotal(items)

  function act(action: QuickAction) {
    if (state.equipmentMode === 'manual' && state.equipmentItems.length && previewTotal !== state.equipmentBonus) {
      setPending(action)
    } else dispatch(action)
  }

  return (
    <section className="panel quick-equipment-panel" aria-labelledby="equipment-title">
      <div className="quick-equipment-heading">
        <div className="section-eyebrow"><Shield size={18} /><h2 id="equipment-title">Снаряжение</h2></div>
        <div className="quick-equipment-actions"><output aria-label="Сумма предметов">{signed(previewTotal)}</output>
          <button className="icon-button" type="button" data-tour="equipment-open" aria-label="Настройки снаряжения" onClick={onManage}><SlidersHorizontal size={19} /></button>
        </div>
      </div>
      <div className="quick-equipment-grid">
        {items.map((item, index) => {
          const label = equipmentLabel(items, index)
          return (
            <article className={`gear-tile ${item.equipped ? '' : 'gear-in-reserve'}`} key={item.id}>
              <h3 title={item.name ? `${label}: ${item.name}` : label}>{item.name || label}</h3>
              <div className="gear-controls">
                <button className="gear-step" type="button" aria-label={`${label}: уменьшить бонус`} disabled={item.bonus === 0}
                  onClick={() => act({ type: 'setQuickItemBonus', id: item.id, value: item.bonus - 1 })}><Minus size={18} /></button>
                <button className="gear-item" type="button" aria-label={`Учитывать в силе: ${label}`} aria-pressed={item.equipped}
                  title={item.equipped ? 'В расчёте — нажми, чтобы убрать в запас' : 'В запасе — нажми, чтобы учитывать'}
                  onClick={() => act({ type: 'toggleQuickItem', id: item.id })}>
                  <EquipmentIcon slot={item.slot} />
                  <output aria-label={`Бонус на главной: ${label}`}>{item.bonus}</output>
                </button>
                <button className="gear-step" type="button" aria-label={`${label}: увеличить бонус`} disabled={item.bonus >= MAX_ITEM_BONUS}
                  onClick={() => act({ type: 'setQuickItemBonus', id: item.id, value: item.bonus + 1 })}><Plus size={18} /></button>
              </div>
            </article>
          )
        })}
      </div>
      <p className="quick-equipment-hint">{state.equipmentMode === 'manual'
        ? 'Нажми + у вещи, чтобы считать бонусы по предметам.'
        : 'Нажми на иконку, чтобы убрать вещь в запас.'}</p>
      {pending && <ConfirmDialog title="Включить учёт по предметам?" confirmLabel="Включить" onCancel={() => setPending(null)} onConfirm={() => { dispatch(pending); setPending(null) }}>
        <p>После этого действия бонус изменится с {signed(equipmentTotal(state))} на {signed(equipmentTotal(gameReducer(state, pending)))}. Ручная сумма останется сохранена.</p>
      </ConfirmDialog>}
    </section>
  )
}
