'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NuevoCierrePage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [turno, setTurno] = useState<'mañana' | 'tarde' | 'noche'>('mañana')
  const [totalVentas, setTotalVentas] = useState('')
  const [cantidadTickets, setCantidadTickets] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const guardar = async () => {
    if (!totalVentas || !cantidadTickets) {
      setError('Completá el total de ventas y la cantidad de tickets')
      return
    }

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('cierres_turno').insert({
      vendedora_id: user.id,
      fecha,
      turno,
      total_ventas: parseFloat(totalVentas),
      cantidad_tickets: parseInt(cantidadTickets),
      observaciones,
    })

    if (error) {
      setError('Error al guardar: ' + error.message)
      setGuardando(false)
      return
    }

    router.push('/ventas')
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/ventas')} className="text-blue-200 hover:text-white text-sm">
          ← Volver
        </button>
        <span className="text-xl font-bold">💰 Nuevo cierre de turno</span>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value as 'mañana' | 'tarde' | 'noche')}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total vendido ($) *</label>
            <input
              type="number"
              value={totalVentas}
              onChange={(e) => setTotalVentas(e.target.value)}
              placeholder="Ej: 150000"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de tickets *</label>
            <input
              type="number"
              value={cantidadTickets}
              onChange={(e) => setCantidadTickets(e.target.value)}
              placeholder="Ej: 45"
              min="0"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Día de mucho movimiento, faltó cambio"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar cierre'}
          </button>
        </div>
      </main>
    </div>
  )
}