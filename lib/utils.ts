import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPace(paceMinKm: number): string {
  if (!paceMinKm || paceMinKm <= 0 || paceMinKm > 60) return '—'
  const mins = Math.floor(paceMinKm)
  const secs = Math.round((paceMinKm - mins) * 60)
  return `${mins}:${secs.toString().padStart(2, '0')} /km`
}

export function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`
}

export function formatTime(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hrs === 0) return `${mins}m`
  return `${hrs}h ${mins}m`
}

export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  if (hrs === 0) return `${mins} min`
  return `${hrs}:${mins.toString().padStart(2, '0')} hr`
}

export function getActivityIcon(type: string): string {
  switch (type.toLowerCase()) {
    case 'run': return '🏃'
    case 'hike': return '🏔'
    case 'soccer': return '⚽'
    case 'walk': return '🚶'
    case 'workout': return '💪'
    default: return '🏃'
  }
}

export function getActivityColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'run': return '#8b5cf6'
    case 'hike': return '#22c55e'
    case 'soccer': return '#3b82f6'
    case 'walk': return '#f59e0b'
    case 'workout': return '#ec4899'
    default: return '#8b5cf6'
  }
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}
