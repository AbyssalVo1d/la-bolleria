'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CierreTurno, Usuario } from '@/types'

export default function VentasPage() {
  const [cierres, setCierres] = useState<CierreTurno[]>([])
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroVendedora, setFiltroVendedora] = useState('')
  const [vendedoras, setVendedoras] = useState<Usuario[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    iniciar()
  }, [])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)

    if (u?.rol === 'admin') {
      const { data: vends } = await supabase.from('usuarios').select('*').eq('rol', 'ventas').eq('activo', true)
      setVendedoras(vends || [])
    }

    cargarCierres(u?.rol, user.id, '')
  }

  const cargarCierres = async (rol: string, userId: string, vendId: string) => {
    setLoading(true)
    let query = supabase
      .from('cierres_turno')
      .select('*, usuarios(nombre)')
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })

    if (rol !== 'admin') {
      query = query.eq('vendedora_id', userId)
    } else if (vendId) {
      query = query.eq('vendedora_id', vendId)
    }

    const { data } = await query
    setCierres(data || [])
    setLoading(false)
  }

  const handleFiltro = (vendId: string) => {
    setFiltroVendedora(vendId)
    if (usuario) cargarCierres(usuario.rol, usuario.id, vendId)
  }

  const totalVentas = cierres.reduce((sum, c) => sum + Number(c.total_ventas), 0)
  const totalTickets = cierres.reduce((sum, c) => sum + c.cantidad_tickets, 0)

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-blue-200 hover:text-white text-sm">
            ← Volver
          </button>
          <span className="text-xl font-bold">💰 Ventas</span>
        </div>
        <button
          onClick={() => router.push('/ventas/nuevo-cierre')}
          className="bg-white text-blue-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-blue-50 transition"
        >
          + Nuevo cierre
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto">

        {/* Totales */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Total vendido</p>
            <p className="text-xl font-bold text-blue-700 break-all">
              ${totalVentas.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Total tickets</p>
            <p className="text-2xl font-bold text-blue-700">{totalTickets}</p>
          </div>
        </div>

        {/* Filtro por vendedora (solo admin) */}
        {usuario?.rol === 'admin' && vendedoras.length > 0 && (
          <div className="mb-4">
            <select
              value={filtroVendedora}
              onChange={(e) => handleFiltro(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">Todas las vendedoras</option>
              {vendedoras.map(v => (
                <option key={v.id} value={v.id}>{v.nombre}</option>
              ))}
            </select>
          </div>
        )}

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
                      {cierre.fecha} — {cierre.turno.charAt(0).toUpperCase() + cierre.turno.slice(1)}
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
      </main>
    </div>
  )
}