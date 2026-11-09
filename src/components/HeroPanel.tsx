import { ChevronRight, Crown, RotateCcw, Shield, SlidersHorizontal, Sparkles, Swords } from 'lucide-react'
import type { Dispatch } from 'react'
import type { GameAction, GameState, StatKey } from '../types/game'
import { combatPower, signed, statRange } from '../utils/game'
import { Counter } from './Counter'
import { equipmentTotal } from '../utils/equipment'

export function HeroPanel({ state, dispatch, onEquipment }: { state: GameState; dispatch: Dispatch<GameAction>; onEquipment: () => void }) {
  const power = combatPower(state)
  const bonus = equipmentTotal(state)
  const stats = [
    { key: 'level', title: 'Уровень', subtitle: `Путь к ${state.epicMode ? '20' : '10'} уровню`, icon: Crown },
    { key: 'equipmentBonus', title: 'Бонусы', subtitle: 'Снаряжение и прочие плюшки', icon: Shield },
    { key: 'temporaryModifier', title: 'Модификаторы', subtitle: 'Только на этот бой', icon: Sparkles },
  ] as const

  function setStat(key: StatKey, value: number) { dispatch({ type: 'setStat', key, value }) }

  return (
    <section className="panel hero-panel" aria-labelledby="hero-title">
      <div className="power-section">
        <div className="section-eyebrow"><Swords size={17} /><h2 id="hero-title">Боевая сила</h2></div>
        <div className="power-number" key={power} data-testid="combat-power" aria-live="polite" aria-atomic="true">{power}</div>
        <div className="hero-decoration" aria-hidden="true"><img src="/icon.svg" alt="" width="116" height="116" /></div>
        <div className="power-formula" aria-label="Формула боевой силы">
          <span><b>{state.level}</b> уровень</span><i>+</i><span><b>{bonus}</b> бонусы</span><i>{state.temporaryModifier < 0 ? '−' : '+'}</i><span><b>{Math.abs(state.temporaryModifier)}</b> временные</span>
        </div>
      </div>
      <div className="stat-list">
        {stats.map(({ key, title, subtitle, icon: Icon }) => {
          const [min, max] = statRange(key, state.epicMode)
          return (
            <div className={`stat-row stat-${key}`} key={key}>
              {key === 'equipmentBonus' ? <button className="stat-description equipment-open" onClick={onEquipment} aria-label="Открыть снаряжение">
                <span className="stat-icon"><Icon size={21} strokeWidth={1.6} /></span>
                <div><h3>{title}</h3><p>{state.equipmentMode === 'items' ? 'По предметам' : 'Вручную'} <ChevronRight size={11} /></p></div>
              </button> : <div className="stat-description">
                {key === 'temporaryModifier' ? <button className="stat-icon reset-modifier" type="button"
                  aria-label="Сбросить временные модификаторы" title="Сбросить временные модификаторы"
                  disabled={state.temporaryModifier === 0} onClick={() => dispatch({ type: 'resetTemporary' })}><RotateCcw size={18} /></button>
                  : <span className="stat-icon" key={state.level}><Icon size={21} strokeWidth={1.6} /></span>}
                <div><h3>{title}</h3><p>{subtitle}</p></div>
              </div>}
              <div className="stat-controls">
                {key === 'equipmentBonus' && state.equipmentMode === 'items' ? <div className="equipment-total-control"><output aria-label="Бонусы снаряжения" className={bonus >= 1000 ? 'equipment-total-wide' : ''}>{bonus}</output><button className="step-button" onClick={onEquipment} aria-label="Настроить бонусы предметов"><SlidersHorizontal size={19} /></button></div>
                  : <Counter label={title} value={state[key]} min={min} max={max} signed={key === 'temporaryModifier'} tourId={key === 'level' ? 'level' : undefined} onChange={(value) => setStat(key, value)} />}
              </div>
            </div>
          )
        })}
      </div>
      <div className="hero-note"><span className="tiny-diamond" />{state.level === (state.epicMode ? 20 : 10) ? 'Легендарный уровень. Вот это герой!' : `Каждый уровень — шаг к легенде. Модификатор: ${signed(state.temporaryModifier)}.`}</div>
    </section>
  )
}
