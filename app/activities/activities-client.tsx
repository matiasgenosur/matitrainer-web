'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Activity } from '@/lib/types'
import ActivityRow from '@/components/activity-row'

interface ActivitiesClientProps {
  activities: Activity[]
}

const ACTIVITY_TYPES = ['Todos', 'Run', 'Hike', 'Soccer', 'Walk', 'Workout']

export default function ActivitiesClient({ activities }: ActivitiesClientProps) {
  const [typeFilter, setTypeFilter] = useState('Todos')
  const [sortBy, setSortBy] = useState<'date' | 'distance' | 'fatigue' | 'pace'>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = [...activities]

    if (typeFilter !== 'Todos') {
      result = result.filter((a) => a.type === typeFilter)
    }

    if (search.trim()) {
      const s = search.toLowerCase()
      result = result.filter((a) => a.name.toLowerCase().includes(s))
    }

    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortBy === 'distance') cmp = a.distance_km - b.distance_km
      else if (sortBy === 'fatigue') cmp = a.fatigue_score - b.fatigue_score
      else if (sortBy === 'pace') cmp = a.pace_min_km - b.pace_min_km
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [activities, typeFilter, sortBy, sortDir, search])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return <span className="text-gray-600">↕</span>
    return <span className="text-violet-400">{sortDir === 'desc' ? '↓' : '↑'}</span>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar actividad..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all flex-1"
        />
        <div className="flex gap-2 flex-wrap">
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                typeFilter === t
                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th
                  className="text-left py-3 px-4 text-xs text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('date')}
                >
                  Fecha <SortIcon col="date" />
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Actividad</th>
                <th
                  className="text-left py-3 px-4 text-xs text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('distance')}
                >
                  Distancia <SortIcon col="distance" />
                </th>
                <th
                  className="text-left py-3 px-4 text-xs text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('pace')}
                >
                  Ritmo <SortIcon col="pace" />
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Tiempo</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Desnivel</th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Calorías</th>
                <th
                  className="text-left py-3 px-4 text-xs text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                  onClick={() => toggleSort('fatigue')}
                >
                  Fatiga <SortIcon col="fatigue" />
                </th>
                <th className="text-left py-3 px-4 text-xs text-gray-400 font-medium">Strava</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((activity, i) => (
                <ActivityRow key={activity.id} activity={activity} index={i} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500 text-sm">
                    No se encontraron actividades
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <p className="text-xs text-gray-500 text-right">{filtered.length} de {activities.length} actividades</p>
    </div>
  )
}
