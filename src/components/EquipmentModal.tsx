import { useState } from 'react'
import type { Dispatch } from 'react'
import { ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { EquipmentItem, EquipmentMode, GameAction, GameState } from '../types/game'
import { equipmentLabel, equipmentTotal, isStarterItem, itemBonusTotal, MAX_EQUIPMENT_ITEMS, MAX_ITEM_BONUS, MAX_ITEM_NAME, ordinaryItemCount, visibleEquipment } from '../utils/equipment'
import { signed } from '../utils/game'
import { Counter } from './Counter'
import { ConfirmDialog, Modal } from './Modal'
import { EquipmentIcon } from './EquipmentIcon'

type Confirmation = { kind: 'remove'; item: EquipmentItem } | { kind: 'mode'; mode: EquipmentMode; total: number }

export function EquipmentModal({ state, dispatch, onClose }: {
  state: GameState; dispatch: Dispatch<GameAction>; onClose: () => void
}) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const total = equipmentTotal(state)
  const items = visibleEquipment(state.equipmentItems, state.gameEdition)
  const activeItems = items.filter((item) => item.equipped && item.bonus !== 0).length

  function chooseMode(mode: EquipmentMode) {
    if (mode === state.equipmentMode) return
    const nextTotal = mode === 'manual' ? state.equipmentBonus
      : state.equipmentItems.length ? itemBonusTotal(items) : state.equipmentBonus
    if (nextTotal !== total) setConfirmation({ kind: 'mode', mode, total: nextTotal })
    else dispatch({ type: 'setEquipmentMode', value: mode })
  }

  function confirm() {
    if (confirmation?.kind === 'remove') dispatch({ type: 'removeItem', id: confirmation.item.id })
    if (confirmation?.kind === 'mode') dispatch({ type: 'setEquipmentMode', value: confirmation.mode })
    setConfirmation(null)
  }

  return (
    <>
      <Modal title="Снаряжение героя" onClose={onClose} tourId="equipment">
        <p className="settings-intro">Каждая плюшка приближает победу.</p>
        <div className="equipment-mode" role="group" aria-label="Способ учёта бонусов">
          <button aria-pressed={state.equipmentMode === 'manual'} onClick={() => chooseMode('manual')}>Вручную</button>
          <button data-tour="equipment-items" aria-pressed={state.equipmentMode === 'items'} onClick={() => chooseMode('items')}>По предметам <ChevronRight size={14} /></button>
        </div>
        <div className="equipment-summary"><div><span>Бонус снаряжения</span><p>{state.equipmentMode === 'items' ? 'Сумма всех включённых предметов' : 'Твоя общая сумма бонусов'}</p></div><output aria-label="Итог снаряжения" aria-live="polite">{signed(total)}</output></div>
        {state.equipmentMode === 'manual' ? <div className="equipment-manual"><Counter label="Ручной бонус" value={state.equipmentBonus} min={0} max={999} onChange={(value) => dispatch({ type: 'setStat', key: 'equipmentBonus', value })} /><p>Введи сумму сам или включи учёт по предметам. При первом включении текущий бонус перейдёт в «Другие бонусы».</p></div> : <>
          <div className="equipment-list">
            {items.map((item, index) => {
              const label = equipmentLabel(items, index)
              const starter = isStarterItem(item)
              return (
                <article className={`equipment-row ${item.equipped ? '' : 'equipment-inactive'}`} key={item.id}>
                  <div className="equipment-item-heading"><span className="equipment-item-slot"><EquipmentIcon slot={item.slot} size={18} /><h3>{label}</h3></span><div className="equipment-item-actions">
                    <button type="button" className="equipped-switch" role="switch" aria-label={`Учитывать: ${label}`} aria-checked={item.equipped} onClick={() => dispatch({ type: 'toggleItem', id: item.id })}><span />{item.equipped ? 'В расчёте' : 'В запасе'}</button>
                    {!starter && <button type="button" className="icon-button remove-item" data-tour="equipment-remove" aria-label={`Удалить: ${label}`} onClick={() => setConfirmation({ kind: 'remove', item })}><Trash2 size={16} /></button>}
                  </div></div>
                  <div className="equipment-item-details"><input className="item-name" aria-label={`Название: ${label}`} placeholder="Название предмета" maxLength={MAX_ITEM_NAME} autoComplete="off" value={item.name} onChange={(event) => dispatch({ type: 'renameItem', id: item.id, value: event.target.value })} /><Counter label={`Бонус: ${label}`} value={item.bonus} min={0} max={MAX_ITEM_BONUS} onChange={(value) => dispatch({ type: 'setItemBonus', id: item.id, value })} /></div>
                </article>
              )
            })}
          </div>
          <button className="secondary-button add-equipment" data-tour="equipment-add" disabled={ordinaryItemCount(state.equipmentItems) >= MAX_EQUIPMENT_ITEMS} onClick={() => dispatch({ type: 'addItem', id: crypto.randomUUID() })}><Plus size={17} />Добавить предмет</button>
          <p className="equipment-help">В расчёте: {activeItems}. До {MAX_EQUIPMENT_ITEMS} обычных предметов{state.gameEdition === 'companions' ? ' и отдельно наёмник со скакуном' : ''}. Для двуручного оружия укажи бонус в одной руке, вторую оставь пустой. Особые свойства карт проверяй по правилам своей партии.</p>
        </>}
        <p className="settings-footnote">Ручная сумма и список вещей сохраняются отдельно.<br />Используется только выбранный режим.</p>
      </Modal>
      {confirmation && <ConfirmDialog title={confirmation.kind === 'remove' ? 'Удалить предмет?' : 'Переключить учёт бонусов?'}
        confirmLabel={confirmation.kind === 'remove' ? 'Удалить' : 'Переключить'} onCancel={() => setConfirmation(null)} onConfirm={confirm}>
        {confirmation.kind === 'remove' ? <p>«{confirmation.item.name || 'Дополнительный предмет'}» с бонусом {signed(confirmation.item.bonus)} исчезнет из снаряжения.</p> : <p>Бонус снаряжения изменится с {signed(total)} на {signed(confirmation.total)}. Ручная сумма и список предметов останутся сохранены.</p>}
      </ConfirmDialog>}
    </>
  )
}
