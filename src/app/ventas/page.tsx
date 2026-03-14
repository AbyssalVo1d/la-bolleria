'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CierreTurno, Usuario } from '@/types'

const TZ = 'America/Argentina/Buenos_Aires'

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric'
  })
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

type Tab = 'ventas' | 'cierres'

export default function VentasPage() {
  const [tab, setTab] = useState<Tab>('ventas')
  const [ventasInd, setVentasInd] = useState<any[]>([])
  const [cierres, setCierres] = useState<CierreTurno[]>([])
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { iniciar() }, [])
  useEffect(() => {
    if (!usuario) return
    if (tab === 'ventas') cargarVentas()
    else cargarCierres()
  }, [tab, usuario])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)
  }

  const cargarVentas = async () => {
    setLoading(true)
    const { data: rows } = await supabase
      .from('ventas')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(100)

    if (rows && rows.length > 0) {
      const ids = [...new Set([...rows.map(v => v.cobrado_por), ...rows.map(v => v.atendido_por)])]
      const { data: users } = await supabase.from('usuarios').select('id,nombre').in('id', ids)
      const map: Record<string, string> = Object.fromEntries((users || []).map(u => [u.id, u.nombre]))
      setVentasInd(rows.map(v => ({
        ...v,
        cobrador_nombre: map[v.cobrado_por] || '—',
        atendedor_nombre: map[v.atendido_por] || '—',
      })))
    } else {
      setVentasInd([])
    }
    setLoading(false)
  }

  const cargarCierres = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('cierres_turno')
      .select('*, usuarios(nombre)')
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })
    setCierres(data || [])
    setLoading(false)
  }

  const totalVentasInd = ventasInd.reduce((s, v) => s + Number(v.monto), 0)
  const totalCierres = cierres.reduce((s, c) => s + Number(c.total_ventas), 0)

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-blue-200 hover:text-white text-sm">← Volver</button>
          <span className="text-xl font-bold">💰 Ventas</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push('/ventas/nueva-venta')}
            className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition">
            + Nueva venta
          </button>
          <button onClick={() => router.push('/ventas/nuevo-cierre')}
            className="bg-blue-800 hover:bg-blue-900 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
            + Cierre
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex max-w-3xl mx-auto">
          <button onClick={() => setTab('ventas')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              tab === 'ventas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            🛒 Ventas individuales
          </button>
          <button onClick={() => setTab('cierres')}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
              tab === 'cierres' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            📋 Cierres de turno
          </button>
        </div>
      </div>

      <main className="p-6 max-w-3xl mx-auto">

        {tab === 'ventas' && (
          <>
            <div className="bg-white rounded-xl shadow px-5 py-4 text-center mb-6">
              <p className="text-sm text-gray-500 mb-1">Total (últimas 100 ventas)</p>
              <p className="text-2xl font-bold text-blue-700">
                ${totalVentasInd.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
              </p>
            </div>

            {loading ? (
              <p className="text-center text-amber-800">Cargando...</p>
            ) : ventasInd.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">🛒</p>
                <p>No hay ventas registradas todavía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ventasInd.map((v) => (
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
          </>
        )}

        {tab === 'cierres' && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total vendido</p>
                <p className="text-xl font-bold text-blue-700">
                  ${totalCierres.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total tickets</p>
                <p className="text-2xl font-bold text-blue-700">
                  {cierres.reduce((s, c) => s + c.cantidad_tickets, 0)}
                </p>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-amber-800">Cargando...</p>
            ) : cierres.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">💰</p>
                <p>No hay cierres registrados todavía</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cierres.map((cierre) => (
                  <div key={cierre.id} className="bg-white rounded-xl shadow px-5 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-800">
                          {formatFecha(cierre.fecha)} — {cierre.turno.charAt(0).toUpperCase() + cierre.turno.slice(1)}
                        </p>
                        {usuario?.rol === 'admin' && (
                          <p className="text-sm text-gray-500">{(cierre as any).usuarios?.nombre}</p>
                        )}
                        {cierre.observaciones && (
                          <p className="text-sm text-gray-400 italic mt-1">📝 {cierre.observaciones}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-700">
                          ${Number(cierre.total_ventas).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                        </p>
                        <p className="text-sm text-gray-500">{cierre.cantidad_tickets} tickets</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
