import { ChessKnight, Crown, Footprints, Hand, Shield, Shirt, Sparkles, UserRound } from 'lucide-react'
import type { EquipmentSlot } from '../types/game'

const icons = { head: Crown, armor: Shirt, boots: Footprints, hand1: Hand, hand2: Shield, other: Sparkles, hireling: UserRound, steed: ChessKnight }

export function EquipmentIcon({ slot, size = 22 }: { slot: EquipmentSlot; size?: number }) {
  const Icon = icons[slot]
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />
}
