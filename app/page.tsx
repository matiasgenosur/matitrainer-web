'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

const stats = [
  { value: '500+', label: 'km registrados' },
  { value: '14', label: 'actividades' },
  { value: '4', label: 'meses entrenando' },
  { value: '12K+', label: 'cal quemadas' },
]

const features = [
  { icon: '📊', title: 'Análisis profundo', desc: 'Métricas de zonas HR, ACWR, fatiga acumulada y más.' },
  { icon: '🏆', title: 'Predictor de carrera', desc: 'Estimaciones de 5K a 42K con la fórmula Riegel.' },
  { icon: '📅', title: 'Plan de entrenamiento', desc: 'Calendario mensual con adherencia al plan.' },
  { icon: '🎯', title: 'Portal del entrenador', desc: 'Diego puede ver reportes y enviar feedback en tiempo real.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col overflow-hidden relative">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="animate-float absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="animate-float-delayed absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="animate-pulse-glow absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      {/* Nav bar */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center font-bold text-white shadow-lg shadow-violet-500/25">
            M
          </div>
          <span className="font-semibold text-white text-lg">MatiTrainer</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>Powered by Strava</span>
          <span className="text-orange-500">🔶</span>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-violet-500/30 bg-violet-500/10 text-violet-400 text-sm font-medium mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          Dashboard de entrenamiento activo
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-extrabold text-white mb-4 leading-tight tracking-tight"
        >
          Mati
          <span className="gradient-text">Trainer</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-xl sm:text-2xl text-gray-400 font-light mb-4 tracking-wide"
        >
          Track.{' '}
          <span className="text-violet-400">Analyze.</span>{' '}
          Improve.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-base text-gray-500 max-w-md mb-12"
        >
          El dashboard privado de Matias y Diego. Datos de Strava sincronizados. Análisis profesional.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 mb-20"
        >
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(139,92,246,0.4)' }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-violet-500 text-white font-semibold text-lg shadow-lg shadow-violet-500/20 transition-all cursor-pointer"
            >
              🏃 Entrar como Atleta
            </motion.button>
          </Link>

          <Link href="/trainer?key=diego2026">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              className="px-8 py-4 rounded-2xl border border-white/20 bg-white/5 text-white font-semibold text-lg hover:bg-white/10 hover:border-white/30 transition-all backdrop-blur-sm cursor-pointer"
            >
              📋 Entrar como Entrenador
            </motion.button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-20 w-full max-w-2xl"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass rounded-2xl p-4 text-center"
            >
              <p className="text-3xl font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl"
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              className="glass rounded-2xl p-5 text-left hover:border-violet-500/30 transition-all group"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-violet-400 transition-colors">
                {f.title}
              </h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-gray-600">
        MatiTrainer &middot; Construido con amor para Matias &amp; Diego
      </footer>
    </div>
  )
}
