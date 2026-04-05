'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ACWRResult } from '@/lib/types'

interface ACWRGaugeProps {
  result: ACWRResult
}

const RECOVERY_TIPS: Record<ACWRResult['level'], {
  summary: string
  tips: { icon: string; title: string; detail: string }[]
}> = {
  low: {
    summary: 'Tu carga es baja respecto a tu base. Puedes aumentar volumen e intensidad gradualmente.',
    tips: [
      { icon: '🏃', title: 'Entrenamiento', detail: 'Puedes agregar 10–15% más de volumen esta semana. Buen momento para sesiones de calidad o largo.' },
      { icon: '🥗', title: 'Nutrición', detail: 'Mantén buena ingesta de carbohidratos (4–6g/kg/día) para tener energía disponible para el entrenamiento.' },
      { icon: '💧', title: 'Hidratación', detail: 'Al menos 2.5L de agua al día. Incluye electrolitos si entrenas más de 90 minutos.' },
      { icon: '😴', title: 'Sueño', detail: '7–9 horas. El cuerpo está listo para absorber más carga.' },
    ],
  },
  optimal: {
    summary: 'Zona óptima. Tu carga reciente está bien balanceada con tu base de fitness acumulada.',
    tips: [
      { icon: '🥩', title: 'Proteína', detail: '1.6–2g por kg de peso corporal al día para mantener la adaptación muscular. Prioriza 30g dentro de los 30 min post-entrenamiento.' },
      { icon: '🫐', title: 'Antiinflamatorios naturales', detail: 'Arándanos, jengibre y cúrcuma (con pimienta negra para mejor absorción) reducen la inflamación del entrenamiento.' },
      { icon: '💧', title: 'Hidratación', detail: '2.5–3L de agua diarios. En sesiones largas usa bebida isotónica (sodio + carbohidratos).' },
      { icon: '😴', title: 'Sueño', detail: '8 horas idealmente. La síntesis proteica muscular y la liberación de hormona de crecimiento ocurren en sueño profundo.' },
      { icon: '🦵', title: 'Compresores / Presoterapia', detail: 'Sesión de 30 min post-entrenamiento o antes de dormir. Mejora el retorno venoso y reduce la sensación de piernas pesadas.' },
    ],
  },
  caution: {
    summary: 'Tu carga reciente superó tu base crónica. Prioriza recuperación hoy y mañana.',
    tips: [
      { icon: '🦵', title: 'Presoterapia / Compresores', detail: 'Sesión de 40–50 min a presión media (40–60 mmHg). Hazlo dentro de las 2h post-entrenamiento o antes de dormir. Activa el retorno venoso y reduce el DOMS (dolor muscular tardío) significativamente.' },
      { icon: '🧊', title: 'Baño de contraste o agua fría', detail: '10 min en agua fría (12–15°C) o alternando 1 min frío / 2 min caliente × 3 ciclos. Reduce inflamación aguda y acelera la eliminación de metabolitos de fatiga.' },
      { icon: '🥩', title: 'Ventana post-entrenamiento', detail: 'En los primeros 30 min: 30g de proteína + 60g de carbohidratos simples. Activa la síntesis proteica muscular en el momento óptimo.' },
      { icon: '🫦', title: 'Foam roller / masaje', detail: '10–15 min en cuádriceps, isquiotibiales, pantorrillas y glúteos. Reduce tensión fascial, mejora circulación local y movilidad articular.' },
      { icon: '🥗', title: 'Dieta antiinflamatoria', detail: 'Prioriza salmón, sardinas, aceite de oliva extra virgen, nueces, espinaca, cúrcuma con pimienta negra y jengibre. Evita azúcar refinada y alcohol (potencian la inflamación).' },
      { icon: '😴', title: 'Sueño prioritario', detail: '8–9 horas. Considera una siesta de 20 min si puedes. Duerme con piernas ligeramente elevadas para reducir inflamación en extremidades.' },
    ],
  },
  high: {
    summary: 'Riesgo real de lesión o sobreentrenamiento. El cuerpo necesita recuperación urgente.',
    tips: [
      { icon: '🛌', title: 'Descanso — no entrenar fuerte', detail: 'Máximo caminata suave o movilidad articular 20–30 min. Cero intensidad hasta que el ACWR baje a zona óptima. Un día más de descanso hoy evita semanas fuera por lesión.' },
      { icon: '🦵', title: 'Presoterapia diaria', detail: 'Sesión de 45–60 min, idealmente con gradiente de presión (mayor presión en tobillo que muslo). Hacerlo todos los días hasta recuperar. Puedes usarlo mientras ves una serie o trabajas en el computador.' },
      { icon: '🧊', title: 'Inmersión en agua fría', detail: '10–15 min en agua fría (10–15°C). Reduce inflamación sistémica aguda. Si no tienes tina, ducha de agua fría enfocada en piernas por 5–10 min. Evita hacerlo si tienes sensación de enfermedad.' },
      { icon: '🥩', title: 'Proteína elevada', detail: '2–2.4g/kg de peso corporal. Fuentes completas: pollo, pescado, huevo, queso cottage, legumbres. El músculo se repara principalmente en las 48–72h post-esfuerzo máximo.' },
      { icon: '🥗', title: 'Dieta antiinflamatoria estricta', detail: 'Elimina completamente alcohol y azúcar refinada esta semana. Agrega: salmón o sardina (2x/semana), aceite de oliva extra virgen, verduras de hoja verde, cúrcuma + pimienta negra, jengibre fresco.' },
      { icon: '💊', title: 'Suplementos de recuperación', detail: 'Magnesio glicinato (200–400mg antes de dormir): reduce calambres y mejora calidad del sueño. Omega-3 (2–3g/día): antiinflamatorio potente. Vitamina C (500mg): síntesis de colágeno. Consulta con médico si tomas medicamentos.' },
      { icon: '😴', title: 'Sueño = medicina en esta zona', detail: '9 horas mínimo. Duerme con piernas ligeramente elevadas (almohada bajo los pies). No pongas alarma si puedes evitarlo — deja que el cuerpo duerma lo que necesita.' },
      { icon: '🚫', title: 'Evitar', detail: 'Alcohol, trasnochadas, sesiones HIIT o de alta intensidad. Cada uno de estos factores puede extender el tiempo de recuperación 24–48h adicionales.' },
    ],
  },
}

export default function ACWRGauge({ result }: ACWRGaugeProps) {
  const [showTips, setShowTips] = useState(result.level === 'caution' || result.level === 'high')
  const [showExplainer, setShowExplainer] = useState(false)

  const pct = Math.min(100, Math.max(0, (result.acwr / 2) * 100))

  const levelLabels = {
    low: 'Carga Baja',
    optimal: 'Zona Óptima',
    caution: 'Precaución',
    high: 'Riesgo Alto',
  }

  const tips = RECOVERY_TIPS[result.level]

  return (
    <div className="space-y-4">
      {/* Value + level */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold text-white">{result.acwr.toFixed(2)}</p>
          <p className="text-sm font-medium" style={{ color: result.color }}>{levelLabels[result.level]}</p>
        </div>
        <div className="text-right text-xs text-gray-400 space-y-1">
          <p>Carga aguda (7d): <span className="text-white font-mono">{result.acuteLoad}</span></p>
          <p>Carga crónica (28d): <span className="text-white font-mono">{result.chronicLoad}</span></p>
        </div>
      </div>

      {/* Gauge bar */}
      <div className="relative">
        <div className="h-3 rounded-full overflow-hidden bg-white/10 relative">
          <div className="absolute inset-0 flex">
            <div className="h-full bg-blue-500/40" style={{ width: '40%' }} />
            <div className="h-full bg-emerald-500/40" style={{ width: '25%' }} />
            <div className="h-full bg-amber-500/40" style={{ width: '10%' }} />
            <div className="h-full bg-red-500/40" style={{ width: '25%' }} />
          </div>
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ background: result.color }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>0.0</span>
          <span className="text-blue-400">0.8</span>
          <span className="text-emerald-400">1.3</span>
          <span className="text-amber-400">1.5</span>
          <span className="text-red-400">2.0</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-300 leading-relaxed">{tips.summary}</p>

      {/* Explainer toggle */}
      <button
        onClick={() => setShowExplainer(v => !v)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1"
      >
        <span className="text-gray-600">{showExplainer ? '▲' : '▼'}</span>
        ¿Qué es el ACWR?
      </button>

      <AnimatePresence>
        {showExplainer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-400 space-y-2 leading-relaxed">
              <p><span className="text-white font-medium">ACWR</span> (Acute:Chronic Workload Ratio) compara cuánto entrenaste esta semana vs. tu promedio de las últimas 4 semanas.</p>
              <p>
                <span className="text-blue-400 font-medium">Carga aguda</span> = fatiga acumulada últimos 7 días.<br />
                <span className="text-violet-400 font-medium">Carga crónica</span> = promedio semanal de los últimos 28 días (tu "base de fitness").
              </p>
              <p>Si esta semana entrenaste mucho más de lo normal → ACWR alto → mayor riesgo de lesión. Si llevás semanas consistentes → ACWR estable en zona óptima.</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 border-t border-white/10">
                <span className="text-blue-400">{'< 0.8'} → Carga baja</span>
                <span className="text-emerald-400">0.8–1.3 → Zona ideal</span>
                <span className="text-amber-400">1.3–1.5 → Precaución</span>
                <span className="text-red-400">{'> 1.5'} → Riesgo alto</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recovery tips toggle */}
      <button
        onClick={() => setShowTips(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all"
        style={{
          background: `${result.color}12`,
          color: result.color,
          border: `1px solid ${result.color}30`,
        }}
      >
        <span>💡 Recomendaciones de recuperación</span>
        <span>{showTips ? '▲' : '▼'}</span>
      </button>

      <AnimatePresence>
        {showTips && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 pt-1">
              {tips.tips.map((tip, i) => (
                <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-3">
                  <p className="text-xs font-semibold text-white mb-1">{tip.icon} {tip.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{tip.detail}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
