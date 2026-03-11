'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Insumo } from '@/types'

export default function StockPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
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
    setLoading(false)
  }

  const insumosFiltrados = insumos.filter(i =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const getEstadoStock = (insumo: Insumo) => {
    if (insumo.stock_actual <= insumo.stock_minimo) return 'critico'
    if (insumo.stock_actual <= insumo.stock_minimo * 1.5) return 'bajo'
    return 'ok'
  }

  const alertas = insumos.filter(i => getEstadoStock(i) === 'critico')

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-amber-200 hover:text-white text-sm">
            ← Volver
          </button>
          <span className="text-xl font-bold">📦 Stock</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/stock/nueva-entrada')}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            + Entrada
          </button>
          <button
            onClick={() => router.push('/stock/nueva-salida')}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
          >
            − Salida
          </button>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6">
            <p className="font-bold text-red-700 mb-2">🔔 Insumos por agotarse:</p>
            <div className="flex flex-wrap gap-2">
              {alertas.map(a => (
                <span key={a.id} className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full">
                  {a.nombre} — {a.stock_actual} {a.unidad}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Buscador */}
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar insumo..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />

        {/* Lista */}
        {loading ? (
          <p className="text-center text-amber-800">Cargando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insumosFiltrados.map((insumo) => {
              const estado = getEstadoStock(insumo)
              return (
                <div
                  key={insumo.id}
                  className={`bg-white rounded-xl shadow px-5 py-4 border-l-4 ${
                    estado === 'critico' ? 'border-red-500' :
                    estado === 'bajo' ? 'border-yellow-400' :
                    'border-green-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{insumo.nombre}</p>
                      <p className="text-sm text-gray-500">Mínimo: {insumo.stock_minimo} {insumo.unidad}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        estado === 'critico' ? 'text-red-600' :
                        estado === 'bajo' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {insumo.stock_actual}
                      </p>
                      <p className="text-sm text-gray-500">{insumo.unidad}</p>
                    </div>
                  </div>
                  {estado === 'critico' && (
                    <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Stock crítico</p>
                  )}
                  {estado === 'bajo' && (
                    <p className="text-xs text-yellow-600 mt-2 font-medium">⚠️ Stock bajo</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}