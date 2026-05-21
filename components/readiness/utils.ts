// Shared helpers for readiness UI.

export function readinessColor(score: number | null | undefined): string {
  if (score == null) return '#374151' // gray-700
  if (score >= 4) return '#22c55e' // green-500
  if (score >= 3.2) return '#84cc16' // lime-500
  if (score >= 2.5) return '#f59e0b' // amber-500
  if (score >= 1.8) return '#f97316' // orange-500
  return '#ef4444' // red-500
}

export function readinessLabel(score: number | null | undefined): string {
  if (score == null) return 'Sin datos'
  if (score >= 4) return 'Excelente'
  if (score >= 3.2) return 'Bueno'
  if (score >= 2.5) return 'Regular'
  if (score >= 1.8) return 'Bajo'
  return 'Crítico'
}

export const SEVERITY_COLOR: Record<string, string> = {
  low: '#3b82f6',
  medium: '#f59e0b',
  high: '#ef4444',
}

export const ALERT_TYPE_LABEL: Record<string, string> = {
  low_score_streak: 'Readiness bajo sostenido',
  acute_drop: 'Caída aguda de readiness',
  sleep_chronic: 'Sueño crónicamente bajo',
  muscular_persistent: 'Dolor muscular persistente',
  stress_high: 'Estrés elevado',
  motivation_low: 'Ánimo bajo recurrente',
  combo_red: 'Múltiples métricas críticas',
}
