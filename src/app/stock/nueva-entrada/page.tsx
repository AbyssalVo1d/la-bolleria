'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Insumo } from '@/types'

export default function NuevaEntradaPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [insumoId, setInsumoId] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('compra')
  const [detalle, setDetalle] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    cargarInsumos()
  }, [])

  const cargarInsumos = async () => {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setInsumos(data || [])
  }

  const guardar = async () => {
    if (!insumoId || !cantidad) {
      setError('Completá todos los campos obligatorios')
      return
    }
    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('movimientos_stock').insert({
      insumo_id: parseInt(insumoId),
      tipo: 'entrada',
      cantidad: parseFloat(cantidad),
      motivo,
      detalle,
      usuario_id: user?.id,
      fecha: new Date().toISOString().split('T')[0],
    })

    if (error) {
      setError('Error al guardar: ' + error.message)
      setGuardando(false)
      return
    }

    router.push('/stock')
  }

  const insumoSeleccionado = insumos.find(i => i.id === parseInt(insumoId))

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-green-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/stock')} className="text-green-200 hover:text-white text-sm">
          ← Volver
        </button>
        <span className="text-xl font-bold">📥 Nueva entrada de stock</span>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Insumo *</label>
            <select
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Seleccioná un insumo</option>
              {insumos.map(i => (
                <option key={i.id} value={i.id}>
                  {i.nombre} (stock actual: {i.stock_actual} {i.unidad})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad {insumoSeleccionado ? `(${insumoSeleccionado.unidad})` : ''} *
            </label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Ej: 10"
              min="0"
              step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motivo *</label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="compra">Compra</option>
              <option value="donacion">Donación</option>
              <option value="ajuste">Ajuste de inventario</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Detalle (opcional)</label>
            <input
              type="text"
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              placeholder="Ej: Compra en Molinos Río de la Plata"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Registrar entrada'}
          </button>
        </div>
      </main>
    </div>
  )
}