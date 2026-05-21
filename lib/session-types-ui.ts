// Mapping between the English backend session_type/block_type and
// the Spanish labels shown in the UI.

import type { SessionType, BlockType } from './types'

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  easy_run: 'Fácil',
  long_run: 'Largo',
  tempo: 'Medio',
  intervals: 'Intervalos',
  fartlek: 'Fartlek',
  recovery: 'Recuperación',
  trail: 'Trail',
  strength: 'Fuerza',
  crossfit: 'CrossFit',
  mobility: 'Movilidad',
  cross_training: 'Cross-training',
  rest: 'Descanso',
  other: 'Otro',
}

export const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  easy_run: '#22c55e',
  long_run: '#06b6d4',
  tempo: '#f59e0b',
  intervals: '#ef4444',
  fartlek: '#a855f7',
  recovery: '#84cc16',
  trail: '#0ea5e9',
  strength: '#8b5cf6',
  crossfit: '#ec4899',
  mobility: '#14b8a6',
  cross_training: '#6366f1',
  rest: '#6b7280',
  other: '#9ca3af',
}

export const SESSION_TYPES: SessionType[] = [
  'easy_run',
  'long_run',
  'tempo',
  'intervals',
  'fartlek',
  'recovery',
  'trail',
  'strength',
  'crossfit',
  'mobility',
  'cross_training',
  'rest',
  'other',
]

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  single: 'Único',
  straight_sets: 'Series',
  circuit: 'Circuito',
  superset: 'Superserie',
  warmup: 'Calentamiento',
  cooldown: 'Vuelta a la calma',
}

export const BLOCK_TYPES: BlockType[] = [
  'single',
  'straight_sets',
  'circuit',
  'superset',
  'warmup',
  'cooldown',
]

/**
 * Maps the Spanish session_type values stored in legacy training_plans
 * to the canonical English enum used in planned_sessions.
 */
export function mapLegacySessionType(value: string | null | undefined): SessionType {
  if (!value) return 'other'
  const v = value.trim()
  switch (v) {
    case 'Largo':
    case 'Largo+':
    case 'long_run':
    case 'long':
      return 'long_run'
    case 'Fácil':
    case 'easy':
    case 'easy_run':
      return 'easy_run'
    case 'Recuperación':
    case 'recovery':
      return 'recovery'
    case 'Medio':
    case 'tempo':
      return 'tempo'
    case 'Intervalos':
    case 'intervals':
    case 'pista':
      return 'intervals'
    case 'Trail':
    case 'trail':
      return 'trail'
    case 'Descanso':
    case 'rest':
      return 'rest'
    case 'Fartlek':
    case 'fartlek':
      return 'fartlek'
    case 'Fuerza':
    case 'strength':
      return 'strength'
    case 'CrossFit':
    case 'crossfit':
      return 'crossfit'
    case 'Movilidad':
    case 'mobility':
      return 'mobility'
    case 'Cross-training':
    case 'cross_training':
      return 'cross_training'
    default:
      return 'other'
  }
}
