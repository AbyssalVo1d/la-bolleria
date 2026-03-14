'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/types'

interface SeccionProductor {
  productorId: string
  texto: string
}

export default function NuevoParteSobrantePage() {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [observaciones, setObservaciones] = useState('')
  const [secciones, setSecciones] = useState<SeccionProductor[]>([
    { productorId: '', texto: '' }
  ])
  const [productores, setProductores] = useState<Usuario[]>([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { cargarProductores() }, [])

  const cargarProductores = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'produccion')
      .eq('activo', true)
      .order('nombre')
    setProductores(data || [])
  }

  const agregarSeccion = () => setSecciones([...secciones, { productorId: '', texto: '' }])
  const quitarSeccion = (si: number) => setSecciones(secciones.filter((_, i) => i !== si))

  const actualizarProductor = (si: number, productorId: string) => {
    const nuevas = [...secciones]
    nuevas[si] = { ...nuevas[si], productorId }
    setSecciones(nuevas)
  }

  const actualizarTexto = (si: number, texto: string) => {
    const nuevas = [...secciones]
    nuevas[si] = { ...nuevas[si], texto }
    setSecciones(nuevas)
  }

  const guardar = async () => {
    for (let i = 0; i < secciones.length; i++) {
      const s = secciones[i]
      if (!s.productorId) { setError(`Seleccioná el productor en la sección ${i + 1}`); return }
      if (!s.texto.trim()) { setError(`Escribí lo que quedó en la sección ${i + 1}`); return }
    }

    setGuardando(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    for (const seccion of secciones) {
      const { data: parte, error: parteError } = await supabase
        .from('partes_produccion')
        .insert({
          empleado_id: seccion.productorId,
          fecha,
          turno: 'mañana',
          observaciones: observaciones || null,
          tipo: 'sobrante',
        })
        .select()
        .single()

      if (parteError || !parte) {
        setError('Error al guardar: ' + parteError?.message)
        setGuardando(false)
        return
      }

      const { error: detalleError } = await supabase.from('detalle_parte').insert({
        parte_id: parte.id,
        producto: seccion.texto.trim(),
        cantidad: 1,
        unidad: 'unidad',
      })

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
      <header className="bg-orange-600 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/produccion')} className="text-orange-200 hover:text-white text-sm">
          ← Volver
        </button>
        <span className="text-xl font-bold">📦 Parte de lo que quedó</span>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-4">

        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
        </div>

        {secciones.map((seccion, si) => (
          <div key={si} className="bg-white rounded-xl shadow p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Productor {secciones.length > 1 ? si + 1 : ''}
              </span>
              {secciones.length > 1 && (
                <button onClick={() => quitarSeccion(si)} className="text-red-400 hover:text-red-600 text-sm font-medium">
                  ✕ Quitar
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién? *</label>
              <select
                value={seccion.productorId}
                onChange={(e) => actualizarProductor(si, e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
              >
                <option value="">Seleccioná un productor</option>
                {productores.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué quedó? *</label>
              <textarea
                value={seccion.texto}
                onChange={(e) => actualizarTexto(si, e.target.value)}
                placeholder="Ej: 5 facturas, 1 torta entera, 8 medialunas..."
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm resize-none"
              />
            </div>
          </div>
        ))}

        <button
          onClick={agregarSeccion}
          className="w-full border-2 border-dashed border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-50 font-medium py-3 rounded-xl text-sm transition"
        >
          + Agregar otro productor
        </button>

        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={guardar}
          disabled={guardando}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar parte'}
        </button>

      </main>
    </div>
  )
}
