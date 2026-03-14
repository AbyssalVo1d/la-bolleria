'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Insumo, Usuario } from '@/types'

interface ItemEntrada {
  insumoId: string
  cantidad: string
  motivo: string
  detalle: string
}

export default function NuevaEntradaPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [receptores, setReceptores] = useState<Usuario[]>([])
  const [items, setItems] = useState<ItemEntrada[]>([
    { insumoId: '', cantidad: '', motivo: 'compra', detalle: '' }
  ])
  const [recibidoPor, setRecibidoPor] = useState('')
  const [recibidoLibre, setRecibidoLibre] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    cargarInsumos()
    cargarReceptores()
  }, [])

  const cargarInsumos = async () => {
    const { data } = await supabase.from('insumos').select('*').eq('activo', true).order('nombre')
    setInsumos(data || [])
  }

  const cargarReceptores = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .in('rol', ['produccion', 'admin'])
      .eq('activo', true)
      .order('nombre')
    setReceptores(data || [])
  }

  const agregarItem = () => setItems([...items, { insumoId: '', cantidad: '', motivo: 'compra', detalle: '' }])
  const quitarItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const actualizarItem = (index: number, campo: keyof ItemEntrada, valor: string) => {
    const nuevos = [...items]
    nuevos[index][campo] = valor
    setItems(nuevos)
  }

  const recibidoFinal = (): string => {
    if (recibidoPor === 'otro') return recibidoLibre.trim()
    const u = receptores.find(r => r.id === recibidoPor)
    return u ? u.nombre : ''
  }

  const guardar = async () => {
    const validos = items.filter(i => i.insumoId && i.cantidad)
    if (validos.length === 0) { setError('Agregá al menos un insumo con cantidad'); return }
    if (items.some(i => (i.insumoId && !i.cantidad) || (!i.insumoId && i.cantidad))) {
      setError('Completá insumo y cantidad en todas las filas, o quitá las vacías'); return
    }
    const receptor = recibidoFinal()
    if (!receptor) { setError('Indicá quién recibe la mercadería'); return }

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const movimientos = validos.map(i => ({
      insumo_id: parseInt(i.insumoId),
      tipo: 'entrada',
      cantidad: parseFloat(i.cantidad),
      motivo: i.motivo,
      detalle: i.detalle || null,
      usuario_id: user.id,
      fecha: new Date().toISOString().split('T')[0],
      entregado_a: receptor,
    }))

    const { error: err } = await supabase.from('movimientos_stock').insert(movimientos)
    if (err) { setError('Error al guardar: ' + err.message); setGuardando(false); return }
    router.push('/stock')
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-green-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/stock')} className="text-green-200 hover:text-white text-sm">← Volver</button>
        <span className="text-xl font-bold">📥 Nueva entrada de stock</span>
      </header>

      <main className="p-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">

          <p className="text-sm text-gray-500">Podés registrar varios insumos de una sola vez.</p>

          <div className="space-y-4">
            {items.map((item, index) => {
              const insumoSel = insumos.find(i => i.id === parseInt(item.insumoId))
              return (
                <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Insumo #{index + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => quitarItem(index)} className="text-red-400 hover:text-red-600 text-sm font-medium">✕ Quitar</button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Insumo *</label>
                      <select value={item.insumoId} onChange={(e) => actualizarItem(index, 'insumoId', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                        <option value="">Seleccioná un insumo</option>
                        {insumos.map(i => (
                          <option key={i.id} value={i.id}>{i.nombre} (stock: {i.stock_actual} {i.unidad})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Cantidad {insumoSel ? `(${insumoSel.unidad})` : ''} *
                      </label>
                      <input type="number" value={item.cantidad} onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                        placeholder="0" min="0" step="0.01"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Motivo *</label>
                      <select value={item.motivo} onChange={(e) => actualizarItem(index, 'motivo', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
                        <option value="compra">Compra</option>
                        <option value="donacion">Donación</option>
                        <option value="ajuste">Ajuste de inventario</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Detalle (opcional)</label>
                      <input type="text" value={item.detalle} onChange={(e) => actualizarItem(index, 'detalle', e.target.value)}
                        placeholder="Ej: Compra en Molinos"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button onClick={agregarItem}
            className="w-full border-2 border-dashed border-green-300 text-green-600 hover:border-green-400 hover:bg-green-50 font-medium py-2 rounded-xl text-sm transition">
            + Agregar otro insumo
          </button>

          {/* Quién recibe */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <label className="block text-sm font-semibold text-gray-700">¿Quién recibe la mercadería? *</label>
            <select value={recibidoPor} onChange={(e) => { setRecibidoPor(e.target.value); setRecibidoLibre('') }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400">
              <option value="">Seleccioná una persona</option>
              {receptores.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
              <option value="otro">Otro...</option>
            </select>
            {recibidoPor === 'otro' && (
              <input type="text" value={recibidoLibre} onChange={(e) => setRecibidoLibre(e.target.value)}
                placeholder="Nombre de la persona"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {items.filter(i => i.insumoId && i.cantidad).length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              ✅ Se van a registrar <strong>{items.filter(i => i.insumoId && i.cantidad).length}</strong> entrada(s)
            </div>
          )}

          <button onClick={guardar} disabled={guardando}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Registrar entradas'}
          </button>

        </div>
      </main>
    </div>
  )
}
