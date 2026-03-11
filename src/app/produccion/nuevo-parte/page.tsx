'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface ItemParte {
  producto: string
  cantidad: string
  unidad: string
}

export default function NuevoPartePage() {
  const [turno, setTurno] = useState<'mañana' | 'tarde'>('mañana')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [items, setItems] = useState<ItemParte[]>([{ producto: '', cantidad: '', unidad: 'docena' }])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const agregarItem = () => {
    setItems([...items, { producto: '', cantidad: '', unidad: 'docena' }])
  }

  const quitarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const actualizarItem = (index: number, campo: keyof ItemParte, valor: string) => {
    const nuevos = [...items]
    nuevos[index][campo] = valor
    setItems(nuevos)
  }

  const guardar = async () => {
    const itemsValidos = items.filter(i => i.producto && i.cantidad)
    if (itemsValidos.length === 0) {
      setError('Agregá al menos un producto con cantidad')
      return
    }

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: parte, error: parteError } = await supabase
      .from('partes_produccion')
      .insert({ empleado_id: user.id, fecha, turno, observaciones })
      .select()
      .single()

    if (parteError || !parte) {
      setError('Error al guardar el parte: ' + parteError?.message)
      setGuardando(false)
      return
    }

    const detalle = itemsValidos.map(i => ({
      parte_id: parte.id,
      producto: i.producto,
      cantidad: parseFloat(i.cantidad),
      unidad: i.unidad,
    }))

    const { error: detalleError } = await supabase.from('detalle_parte').insert(detalle)

    if (detalleError) {
      setError('Error al guardar detalle: ' + detalleError.message)
      setGuardando(false)
      return
    }

    router.push('/produccion')
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-green-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/produccion')} className="text-green-200 hover:text-white text-sm">
          ← Volver
        </button>
        <span className="text-xl font-bold">📋 Nuevo parte de producción</span>
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
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turno</label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value as 'mañana' | 'tarde')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
              >
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
              </select>
            </div>
          </div>

          {/* Productos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Productos elaborados</label>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <input
                    type="text"
                    value={item.producto}
                    onChange={(e) => actualizarItem(index, 'producto', e.target.value)}
                    placeholder="Ej: Facturas"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                  />
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                      placeholder="Cantidad"
                      min="0"
                      className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                    />
                    <select
                      value={item.unidad}
                      onChange={(e) => actualizarItem(index, 'unidad', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                    >
                      <option value="docena">Docena</option>
                      <option value="unidad">Unidad</option>
                      <option value="kg">Kg</option>
                      <option value="bandeja">Bandeja</option>
                      <option value="torta">Torta</option>
                    </select>
                    {items.length > 1 && (
                      <button
                        onClick={() => quitarItem(index)}
                        className="text-red-400 hover:text-red-600 text-lg px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={agregarItem}
              className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
            >
              + Agregar producto
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Ej: Se rompió el horno a las 10hs"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar parte'}
          </button>
        </div>
      </main>
    </div>
  )
}