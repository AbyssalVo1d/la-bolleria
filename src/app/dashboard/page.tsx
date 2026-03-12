'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/types'

const COLORES = ['#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d']

type Filtro = 'semana' | 'mes' | 'trimestre' | 'anio'

function obtenerRango(filtro: Filtro, offset: number): { desde: Date, hasta: Date, label: string } {
  const hoy = new Date()
  let desde = new Date()
  let hasta = new Date()
  let label = ''

  if (filtro === 'semana') {
    const dia = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1
    desde = new Date(hoy)
    desde.setDate(hoy.getDate() - dia + offset * 7)
    desde.setHours(0, 0, 0, 0)
    hasta = new Date(desde)
    hasta.setDate(desde.getDate() + 6)
    hasta.setHours(23, 59, 59, 999)
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' }
    label = `${desde.toLocaleDateString('es-AR', opts)} al ${hasta.toLocaleDateString('es-AR', opts)} ${hasta.getFullYear()}`
  } else if (filtro === 'mes') {
    desde = new Date(hoy.getFullYear(), hoy.getMonth() + offset, 1)
    hasta = new Date(hoy.getFullYear(), hoy.getMonth() + offset + 1, 0, 23, 59, 59)
    label = desde.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    label = label.charAt(0).toUpperCase() + label.slice(1)
  } else if (filtro === 'trimestre') {
    const trimestre = Math.floor(hoy.getMonth() / 3) + offset
    const anio = hoy.getFullYear() + Math.floor(trimestre / 4)
    const trimNorm = ((trimestre % 4) + 4) % 4
    desde = new Date(anio, trimNorm * 3, 1)
    hasta = new Date(anio, trimNorm * 3 + 3, 0, 23, 59, 59)
    label = `T${trimNorm + 1} ${anio}`
  } else {
    const anio = hoy.getFullYear() + offset
    desde = new Date(anio, 0, 1)
    hasta = new Date(anio, 11, 31, 23, 59, 59)
    label = `${anio}`
  }

  return { desde, hasta, label }
}

type DatoVendedora = { nombre: string, ventas: number, tickets: number }

function GraficoBarras({
  datos,
  dataKey,
  formatear,
}: {
  datos: DatoVendedora[]
  dataKey: 'ventas' | 'tickets'
  formatear: (v: number) => string
}) {
  const [tooltip, setTooltip] = useState<{ nombre: string, valor: string } | null>(null)
  const maximo = Math.max(...datos.map(d => d[dataKey]))

  return (
    <div className="relative">
      <div className="space-y-4">
        {datos.map((d, i) => {
          const porcentaje = maximo > 0 ? (d[dataKey] / maximo) * 100 : 0
          return (
            <div key={d.nombre} className="flex items-center gap-3">
              <div className="w-24 text-right text-xs font-semibold text-gray-700 shrink-0">
                {d.nombre}
              </div>
              <div className="flex-1 relative h-10">
                <div
                  className="h-full rounded-r-lg cursor-pointer transition-opacity hover:opacity-90"
                  style={{
                    width: `${porcentaje}%`,
                    backgroundColor: COLORES[i % COLORES.length],
                    minWidth: porcentaje > 0 ? '8px' : '0',
                  }}
                  onMouseEnter={() => setTooltip({ nombre: d.nombre, valor: formatear(d[dataKey]) })}
                  onMouseLeave={() => setTooltip(null)}
                  onTouchStart={() => setTooltip({ nombre: d.nombre, valor: formatear(d[dataKey]) })}
                  onTouchEnd={() => setTimeout(() => setTooltip(null), 1500)}
                />
              </div>
              <div className="w-24 text-xs font-bold text-amber-700 shrink-0">
                {formatear(d[dataKey])}
              </div>
            </div>
          )
        })}
      </div>

      {tooltip && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white border border-amber-200 rounded-lg shadow px-3 py-2 text-sm z-10 pointer-events-none">
          <p className="font-semibold text-gray-800 mb-1">{tooltip.nombre}</p>
          <p className="text-amber-700 font-bold">{tooltip.valor}</p>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cierres, setCierres] = useState<any[]>([])
  const [filtro, setFiltro] = useState<Filtro>('mes')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { iniciar() }, [])
  useEffect(() => { if (usuario) cargarDatos() }, [filtro, offset, usuario])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)
  }

  const cargarDatos = async () => {
    setLoading(true)
    const { desde, hasta } = obtenerRango(filtro, offset)
    const { data } = await supabase
      .from('cierres_turno')
      .select('*, usuarios(nombre)')
      .gte('fecha', desde.toISOString().split('T')[0])
      .lte('fecha', hasta.toISOString().split('T')[0])
      .order('fecha', { ascending: true })
    setCierres(data || [])
    setLoading(false)
  }

  const rango = obtenerRango(filtro, offset)

  const ventasPorVendedora = (): DatoVendedora[] => {
    const mapa: Record<string, DatoVendedora> = {}
    cierres.forEach(c => {
      const nombre = c.usuarios?.nombre || 'Sin nombre'
      if (!mapa[nombre]) mapa[nombre] = { nombre, ventas: 0, tickets: 0 }
      mapa[nombre].ventas += Number(c.total_ventas)
      mapa[nombre].tickets += c.cantidad_tickets
    })
    return Object.values(mapa).sort((a, b) => b.ventas - a.ventas)
  }

  const datos = ventasPorVendedora()
  const totalVentas = datos.reduce((s, d) => s + d.ventas, 0)
  const totalTickets = datos.reduce((s, d) => s + d.tickets, 0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const cambiarFiltro = (f: Filtro) => {
    setFiltro(f)
    setOffset(0)
  }

  if (!usuario) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-amber-800">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎂</span>
          <h1 className="text-xl font-bold">La Bollería</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Hola, <strong>{usuario.nombre}</strong></span>
          <button
            onClick={handleLogout}
            className="bg-amber-900 hover:bg-amber-800 text-white text-sm px-3 py-1 rounded-lg transition"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">

        {/* Módulos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {(usuario.rol === 'admin' || usuario.rol === 'produccion') && (
            <div onClick={() => router.push('/stock')}
              className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition border-l-4 border-amber-500">
              <div className="text-2xl mb-1">📦</div>
              <p className="font-bold text-sm text-gray-800">Stock</p>
            </div>
          )}
          {(usuario.rol === 'admin' || usuario.rol === 'produccion') && (
            <div onClick={() => router.push('/produccion')}
              className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition border-l-4 border-green-500">
              <div className="text-2xl mb-1">🎂</div>
              <p className="font-bold text-sm text-gray-800">Producción</p>
            </div>
          )}
          {(usuario.rol === 'admin' || usuario.rol === 'ventas') && (
            <div onClick={() => router.push('/ventas')}
              className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition border-l-4 border-blue-500">
              <div className="text-2xl mb-1">💰</div>
              <p className="font-bold text-sm text-gray-800">Ventas</p>
            </div>
          )}
          {usuario.rol === 'admin' && (
            <div onClick={() => router.push('/usuarios')}
              className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition border-l-4 border-purple-500">
              <div className="text-2xl mb-1">👥</div>
              <p className="font-bold text-sm text-gray-800">Usuarios</p>
            </div>
          )}
        </div>

        {usuario.rol === 'admin' && (
          <>
            {/* Selector de período */}
            <div className="bg-white rounded-xl shadow px-5 py-4 mb-6">
              <div className="flex gap-2 mb-3">
                {(['semana', 'mes', 'trimestre', 'anio'] as Filtro[]).map(f => (
                  <button
                    key={f}
                    onClick={() => cambiarFiltro(f)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      filtro === f ? 'bg-amber-600 text-white' : 'bg-amber-50 text-gray-600 hover:bg-amber-100'
                    }`}
                  >
                    {f === 'semana' ? 'Semana' : f === 'mes' ? 'Mes' : f === 'trimestre' ? 'Trimestre' : 'Año'}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setOffset(offset - 1)}
                  className="text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-lg font-bold text-lg transition"
                >
                  ←
                </button>
                <span className="text-sm font-semibold text-amber-800 text-center">
                  {rango.label}
                </span>
                <button
                  onClick={() => setOffset(Math.min(offset + 1, 0))}
                  disabled={offset === 0}
                  className="text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-lg font-bold text-lg transition disabled:opacity-30"
                >
                  →
                </button>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total vendido</p>
                <p className="text-2xl font-bold text-amber-700">
                  ${totalVentas.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total tickets</p>
                <p className="text-2xl font-bold text-amber-700">{totalTickets}</p>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-amber-800">Cargando gráficos...</p>
            ) : datos.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                <p className="text-3xl mb-2">📊</p>
                <p>No hay datos para <strong>{rango.label}</strong></p>
              </div>
            ) : (
              <>
                {/* Gráfico ventas */}
                <div className="bg-white rounded-xl shadow p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4">💵 Ventas por vendedora</h3>
                  <GraficoBarras
                    datos={datos}
                    dataKey="ventas"
                    formatear={(v) => `$${v.toLocaleString('es-AR')}`}
                  />
                </div>

                {/* Gráfico tickets */}
                <div className="bg-white rounded-xl shadow p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4">🎫 Tickets por vendedora</h3>
                  <GraficoBarras
                    datos={datos}
                    dataKey="tickets"
                    formatear={(v) => `${v} tickets`}
                  />
                </div>

                {/* Ranking */}
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-bold text-gray-800 mb-4">🏆 Ranking vendedoras</h3>
                  <div className="space-y-3">
                    {datos.map((v, i) => (
                      <div key={v.nombre} className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                          <span className="font-medium text-gray-800">{v.nombre}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-amber-700">${v.ventas.toLocaleString('es-AR')}</p>
                          <p className="text-xs text-gray-500">{v.tickets} tickets</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}