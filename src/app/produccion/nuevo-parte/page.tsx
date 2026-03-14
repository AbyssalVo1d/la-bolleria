'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/types'

interface ItemParte {
  producto: string
  cantidad: string
}

interface SeccionProductor {
  productorId: string
  items: ItemParte[]
}

export default function NuevoPartePage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [secciones, setSecciones] = useState<SeccionProductor[]>([
    { productorId: '', items: [{ producto: '', cantidad: '' }] }
  ])
  const [productores, setProductores] = useState<Usuario[]>([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    cargarProductores()
  }, [])

  const cargarProductores = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'produccion')
      .eq('activo', true)
      .order('nombre')
    setProductores(data || [])
  }

  const agregarSeccion = () => {
    setSecciones([...secciones, { productorId: '', items: [{ producto: '', cantidad: '' }] }])
  }

  const quitarSeccion = (si: number) => {
    setSecciones(secciones.filter((_, i) => i !== si))
  }

  const actualizarProductor = (si: number, productorId: string) => {
    const nuevas = [...secciones]
    nuevas[si] = { ...nuevas[si], productorId }
    setSecciones(nuevas)
  }

  const agregarItem = (si: number) => {
    const nuevas = [...secciones]
    nuevas[si] = { ...nuevas[si], items: [...nuevas[si].items, { producto: '', cantidad: '' }] }
    setSecciones(nuevas)
  }

  const quitarItem = (si: number, ii: number) => {
    const nuevas = [...secciones]
    nuevas[si] = { ...nuevas[si], items: nuevas[si].items.filter((_, i) => i !== ii) }
    setSecciones(nuevas)
  }

  const actualizarItem = (si: number, ii: number, campo: keyof ItemParte, valor: string) => {
    const nuevas = [...secciones]
    const nuevosItems = [...nuevas[si].items]
    nuevosItems[ii] = { ...nuevosItems[ii], [campo]: valor }
    nuevas[si] = { ...nuevas[si], items: nuevosItems }
    setSecciones(nuevas)
  }

  const guardar = async () => {
    // Validar que cada sección tenga productor y al menos un producto con cantidad
    for (let i = 0; i < secciones.length; i++) {
      const s = secciones[i]
      if (!s.productorId) {
        setError(`Seleccioná el productor en la sección ${i + 1}`)
        return
      }
      const validos = s.items.filter(it => it.producto && it.cantidad)
      if (validos.length === 0) {
        setError(`Agregá al menos un producto en la sección ${i + 1}`)
        return
      }
    }

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    for (const seccion of secciones) {
      const itemsValidos = seccion.items.filter(it => it.producto && it.cantidad)

      const { data: parte, error: parteError } = await supabase
        .from('partes_produccion')
        .insert({
          empleado_id: seccion.productorId,
          fecha,
          turno: 'mañana', // campo requerido en DB, ya no se usa en la UI
          observaciones: observaciones || null,
        })
        .select()
        .single()

      if (parteError || !parte) {
        setError('Error al guardar: ' + parteError?.message)
        setGuardando(false)
        return
      }

      const detalle = itemsValidos.map(it => ({
        parte_id: parte.id,
        producto: it.producto,
        cantidad: parseFloat(it.cantidad),
        unidad: 'unidad', // campo requerido en DB, ya no se usa en la UI
      }))

      const { error: detalleError } = await supabase.from('detalle_parte').insert(detalle)
      if (detalleError) {
        setError('Error al guardar detalle: ' + detalleError.message)
        setGuardando(false)
        return
      }
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

      <main className="p-6 max-w-lg mx-auto space-y-4">

        {/* Fecha global */}
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />
        </div>

        {/* Secciones por productor */}
        {secciones.map((seccion, si) => (
          <div key={si} className="bg-white rounded-xl shadow p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Productor {secciones.length > 1 ? si + 1 : ''}
              </span>
              {secciones.length > 1 && (
                <button
                  onClick={() => quitarSeccion(si)}
                  className="text-red-400 hover:text-red-600 text-sm font-medium"
                >
                  ✕ Quitar
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién produjo? *</label>
              <select
                value={seccion.productorId}
                onChange={(e) => actualizarProductor(si, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
              >
                <option value="">Seleccioná un productor</option>
                {productores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Productos elaborados</label>
              <div className="space-y-2">
                {seccion.items.map((item, ii) => (
                  <div key={ii} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={item.producto}
                      onChange={(e) => actualizarItem(si, ii, 'producto', e.target.value)}
                      placeholder="Ej: Facturas"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                    />
                    <input
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(si, ii, 'cantidad', e.target.value)}
                      placeholder="Cant."
                      min="0"
                      className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
                    />
                    {seccion.items.length > 1 && (
                      <button
                        onClick={() => quitarItem(si, ii)}
                        className="text-red-400 hover:text-red-600 text-lg px-1 shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => agregarItem(si)}
                className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
              >
                + Agregar producto
              </button>
            </div>
          </div>
        ))}

        {/* Agregar productor */}
        <button
          onClick={agregarSeccion}
          className="w-full border-2 border-dashed border-green-300 text-green-600 hover:border-green-400 hover:bg-green-50 font-medium py-3 rounded-xl text-sm transition"
        >
          + Agregar otro productor
        </button>

        {/* Observaciones */}
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Ej: Se rompió el horno a las 10hs"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar parte'}
        </button>

      </main>
    </div>
  )
}
