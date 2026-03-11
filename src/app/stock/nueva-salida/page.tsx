'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Insumo } from '@/types'

interface ItemSalida {
  insumoId: string
  cantidad: string
  motivo: string
  detalle: string
}

export default function NuevaSalidaPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [items, setItems] = useState<ItemSalida[]>([
    { insumoId: '', cantidad: '', motivo: 'uso_produccion', detalle: '' }
  ])
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

  const agregarItem = () => {
    setItems([...items, { insumoId: '', cantidad: '', motivo: 'uso_produccion', detalle: '' }])
  }

  const quitarItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const actualizarItem = (index: number, campo: keyof ItemSalida, valor: string) => {
    const nuevos = [...items]
    nuevos[index][campo] = valor
    setItems(nuevos)
  }

  const guardar = async () => {
    const itemsValidos = items.filter(i => i.insumoId && i.cantidad)
    if (itemsValidos.length === 0) {
      setError('Agregá al menos un insumo con cantidad')
      return
    }

    const hayInvalidos = items.some(i => (i.insumoId && !i.cantidad) || (!i.insumoId && i.cantidad))
    if (hayInvalidos) {
      setError('Completá insumo y cantidad en todas las filas, o quitá las vacías')
      return
    }

    // Verificar stock suficiente para cada item
    for (const item of itemsValidos) {
      const insumo = insumos.find(i => i.id === parseInt(item.insumoId))
      if (insumo && parseFloat(item.cantidad) > insumo.stock_actual) {
        setError(`Stock insuficiente para "${insumo.nombre}". Stock actual: ${insumo.stock_actual} ${insumo.unidad}`)
        return
      }
    }

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const movimientos = itemsValidos.map(i => ({
      insumo_id: parseInt(i.insumoId),
      tipo: 'salida',
      cantidad: parseFloat(i.cantidad),
      motivo: i.motivo,
      detalle: i.detalle || null,
      usuario_id: user.id,
      fecha: new Date().toISOString().split('T')[0],
    }))

    const { error: err } = await supabase.from('movimientos_stock').insert(movimientos)

    if (err) {
      setError('Error al guardar: ' + err.message)
      setGuardando(false)
      return
    }

    router.push('/stock')
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-red-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/stock')} className="text-red-200 hover:text-white text-sm">
          ← Volver
        </button>
        <span className="text-xl font-bold">📤 Nueva salida de stock</span>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">

          <p className="text-sm text-gray-500">Podés registrar varios insumos de una sola vez.</p>

          {/* Filas de insumos */}
          <div className="space-y-4">
            {items.map((item, index) => {
              const insumoSel = insumos.find(i => i.id === parseInt(item.insumoId))
              const stockInsuficiente = insumoSel && item.cantidad &&
                parseFloat(item.cantidad) > insumoSel.stock_actual

              return (
                <div key={index} className={`border rounded-xl p-4 space-y-3 ${
                  stockInsuficiente ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Insumo #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        onClick={() => quitarItem(index)}
                        className="text-red-400 hover:text-red-600 text-sm font-medium"
                      >
                        ✕ Quitar
                      </button>
                    )}
                  </div>

                  {/* Insumo + Cantidad */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Insumo *</label>
                      <select
                        value={item.insumoId}
                        onChange={(e) => actualizarItem(index, 'insumoId', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <option value="">Seleccioná un insumo</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>
                            {i.nombre} (stock: {i.stock_actual} {i.unidad})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cantidad {insumoSel ? `(${insumoSel.unidad})` : ''} *
                      </label>
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className={`w-full border rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 ${
                          stockInsuficiente ? 'border-red-400' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Aviso stock insuficiente inline */}
                  {stockInsuficiente && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ Stock insuficiente — disponible: {insumoSel.stock_actual} {insumoSel.unidad}
                    </p>
                  )}

                  {/* Motivo + Detalle */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
                      <select
                        value={item.motivo}
                        onChange={(e) => actualizarItem(index, 'motivo', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      >
                        <option value="uso_produccion">Uso en producción</option>
                        <option value="merma">Merma / vencimiento</option>
                        <option value="ajuste">Ajuste de inventario</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Detalle (opcional)</label>
                      <input
                        type="text"
                        value={item.detalle}
                        onChange={(e) => actualizarItem(index, 'detalle', e.target.value)}
                        placeholder="Ej: Para facturas turno mañana"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  </div>

                </div>
              )
            })}
          </div>

          {/* Botón agregar otro */}
          <button
            onClick={agregarItem}
            className="w-full border-2 border-dashed border-red-300 text-red-500 hover:border-red-400 hover:bg-red-50 font-medium py-2 rounded-xl text-sm transition"
          >
            + Agregar otro insumo
          </button>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Resumen */}
          {items.filter(i => i.insumoId && i.cantidad).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              📤 Se van a registrar <strong>{items.filter(i => i.insumoId && i.cantidad).length}</strong> salida(s)
            </div>
          )}

          <button
            onClick={guardar}
            disabled={guardando}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Registrar salidas'}
          </button>

        </div>
      </main>
    </div>
  )
}