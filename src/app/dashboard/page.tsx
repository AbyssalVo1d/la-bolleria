'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/types'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

export default function DashboardPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cierres, setCierres] = useState<any[]>([])
  const [filtro, setFiltro] = useState('mes')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    iniciar()
  }, [])

  useEffect(() => {
    if (usuario) cargarDatos()
  }, [filtro, usuario])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)
  }

  const cargarDatos = async () => {
    setLoading(true)
    let fechaDesde = new Date()

    if (filtro === 'semana') fechaDesde.setDate(fechaDesde.getDate() - 7)
    else if (filtro === 'mes') fechaDesde.setMonth(fechaDesde.getMonth() - 1)
    else if (filtro === 'trimestre') fechaDesde.setMonth(fechaDesde.getMonth() - 3)
    else if (filtro === 'anio') fechaDesde.setFullYear(fechaDesde.getFullYear() - 1)

    const { data } = await supabase
      .from('cierres_turno')
      .select('*, usuarios(nombre)')
      .gte('fecha', fechaDesde.toISOString().split('T')[0])
      .order('fecha', { ascending: true })

    setCierres(data || [])
    setLoading(false)
  }

  // Agrupar por fecha
  const datosGrafico = () => {
    const mapa: Record<string, { fecha: string, ventas: number, tickets: number }> = {}
    cierres.forEach(c => {
      if (!mapa[c.fecha]) mapa[c.fecha] = { fecha: c.fecha, ventas: 0, tickets: 0 }
      mapa[c.fecha].ventas += Number(c.total_ventas)
      mapa[c.fecha].tickets += c.cantidad_tickets
    })
    return Object.values(mapa)
  }

  // Ranking vendedoras
  const rankingVendedoras = () => {
    const mapa: Record<string, { nombre: string, ventas: number, tickets: number }> = {}
    cierres.forEach(c => {
      const nombre = c.usuarios?.nombre || 'Sin nombre'
      if (!mapa[nombre]) mapa[nombre] = { nombre, ventas: 0, tickets: 0 }
      mapa[nombre].ventas += Number(c.total_ventas)
      mapa[nombre].tickets += c.cantidad_tickets
    })
    return Object.values(mapa).sort((a, b) => b.ventas - a.ventas)
  }

  const totalVentas = cierres.reduce((sum, c) => sum + Number(c.total_ventas), 0)
  const totalTickets = cierres.reduce((sum, c) => sum + c.cantidad_tickets, 0)
  const datos = datosGrafico()
  const ranking = rankingVendedoras()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!usuario) return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <p className="text-amber-800">Cargando...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
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
          {usuario.rol === 'admin' && (
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

        {/* Solo admin ve gráficos */}
        {usuario.rol === 'admin' && (
          <>
            {/* Filtro período */}
            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm font-medium text-gray-700">Ver:</span>
              {['semana', 'mes', 'trimestre', 'anio'].map(f => (
                <button
                  key={f}
                  onClick={() => setFiltro(f)}
                  className={`px-4 py-1 rounded-full text-sm font-medium transition ${
                    filtro === f ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 hover:bg-amber-50'
                  }`}
                >
                  {f === 'semana' ? 'Semana' : f === 'mes' ? 'Mes' : f === 'trimestre' ? 'Trimestre' : 'Año'}
                </button>
              ))}
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
                <p>No hay datos para el período seleccionado</p>
              </div>
            ) : (
              <>
                {/* Gráfico ventas en $ */}
                <div className="bg-white rounded-xl shadow p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4">💵 Ventas en $</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={datos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString('es-AR')}`, 'Ventas']} />
                      <Bar dataKey="ventas" fill="#d97706" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Gráfico tickets */}
                <div className="bg-white rounded-xl shadow p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4">🎫 Tickets emitidos</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={datos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => [value, 'Tickets']} />
                      <Line type="monotone" dataKey="tickets" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Ranking vendedoras */}
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-bold text-gray-800 mb-4">🏆 Ranking vendedoras</h3>
                  <div className="space-y-3">
                    {ranking.map((v, i) => (
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