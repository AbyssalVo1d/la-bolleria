'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TZ = 'America/Argentina/Buenos_Aires'

function hoyAR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

function formatFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const MEDIO_LABEL: Record<string, string> = {
  efectivo: '💵 Efectivo',
  debito: '💳 Débito',
  credito: '💳 Crédito',
  transferencia: '📲 Transferencia',
}

export default function VentasPage() {
  const [todasLasVentas, setTodasLasVentas] = useState<any[]>([])
  const [vendedoras, setVendedoras] = useState<any[]>([])
  const [filtroVendedora, setFiltroVendedora] = useState('')
  const [filtroFecha, setFiltroFecha] = useState(hoyAR())
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { iniciar() }, [])
  useEffect(() => { cargarVentas(filtroFecha) }, [filtroFecha])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: vend } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('rol', 'ventas')
      .eq('activo', true)
      .order('nombre')
    setVendedoras(vend || [])

    await cargarVentas(filtroFecha)
  }

  const cargarVentas = async (fecha: string) => {
    setLoading(true)
    // Convertir fecha AR a rango UTC (AR = UTC-3)
    const startUTC = `${fecha}T03:00:00.000Z`
    const nextDay = new Date(fecha)
    nextDay.setDate(nextDay.getDate() + 1)
    const endUTC = `${nextDay.toISOString().split('T')[0]}T03:00:00.000Z`

    const { data: rows } = await supabase
      .from('ventas')
      .select('*')
      .gte('creado_en', startUTC)
      .lt('creado_en', endUTC)
      .order('creado_en', { ascending: false })
      .limit(500)

    if (rows && rows.length > 0) {
      const ids = [...new Set([...rows.map((v: any) => v.cobrado_por), ...rows.map((v: any) => v.atendido_por)])]
      const { data: users } = await supabase.from('usuarios').select('id,nombre').in('id', ids)
      const map: Record<string, string> = Object.fromEntries((users || []).map((u: any) => [u.id, u.nombre]))
      setTodasLasVentas(rows.map((v: any) => ({
        ...v,
        cobrador_nombre: map[v.cobrado_por] || '—',
        atendedor_nombre: map[v.atendido_por] || '—',
      })))
    } else {
      setTodasLasVentas([])
    }
    setLoading(false)
  }

  // Filtro client-side por vendedora
  const ventasFiltradas = filtroVendedora
    ? todasLasVentas.filter(v => v.cobrado_por === filtroVendedora)
    : todasLasVentas

  const totalFiltrado = ventasFiltradas.reduce((s, v) => s + Number(v.monto), 0)
  const esHoy = filtroFecha === hoyAR()

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-blue-200 hover:text-white text-sm">← Volver</button>
          <span className="text-xl font-bold">💰 Ventas</span>
        </div>
        <button onClick={() => router.push('/ventas/nueva-venta')}
          className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition">
          + Nueva venta
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-4">

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vendedora</label>
              <select
                value={filtroVendedora}
                onChange={(e) => setFiltroVendedora(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Todas las vendedoras</option>
                {vendedoras.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          {!esHoy && (
            <button
              onClick={() => setFiltroFecha(hoyAR())}
              className="text-xs text-blue-600 hover:underline"
            >
              Volver a hoy
            </button>
          )}
        </div>

        {/* Total del día */}
        <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
          <p className="text-xs text-gray-400 mb-1">
            Total {filtroVendedora ? `— ${vendedoras.find(v => v.id === filtroVendedora)?.nombre}` : 'del día'}
            {!esHoy && ` · ${new Date(filtroFecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
          </p>
          <p className="text-2xl font-bold text-blue-700">
            ${totalFiltrado.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </p>
          {ventasFiltradas.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{ventasFiltradas.length} venta{ventasFiltradas.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <p className="text-center text-amber-800">Cargando...</p>
        ) : ventasFiltradas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🛒</p>
            <p>No hay ventas para este filtro</p>
          </div>
        ) : (
          <div className="space-y-2">
            {ventasFiltradas.map((v) => (
              <div key={v.id} className="bg-white rounded-xl shadow px-5 py-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">{formatFechaHora(v.creado_en)}</p>
                    <p className="text-sm text-gray-600">
                      💼 {v.cobrador_nombre}
                      {v.atendedor_nombre !== v.cobrador_nombre && (
                        <span className="text-gray-400"> · atendió {v.atendedor_nombre}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {MEDIO_LABEL[v.medio_pago] || v.medio_pago}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-blue-700 shrink-0 ml-3">
                    ${Number(v.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
