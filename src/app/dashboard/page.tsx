'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/types'
import * as XLSX from 'xlsx'

const COLORES = ['#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d']
const COLORES_MEDIO = ['#2563eb', '#16a34a', '#9333ea', '#d97706']
const TZ = 'America/Argentina/Buenos_Aires'

type Filtro = 'dia' | 'semana' | 'mes' | 'trimestre' | 'anio' | 'personalizado'

function obtenerRango(filtro: Filtro, offset: number, desdeCustom: string, hastaCustom: string) {
  // Usar fecha local Argentina
  const ahora = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }))
  let desde = new Date(ahora)
  let hasta = new Date(ahora)
  let label = ''

  if (filtro === 'dia') {
    desde.setDate(ahora.getDate() + offset)
    desde.setHours(0, 0, 0, 0)
    hasta = new Date(desde)
    hasta.setHours(23, 59, 59, 999)
    label = desde.toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    label = label.charAt(0).toUpperCase() + label.slice(1)
  } else if (filtro === 'semana') {
    const dia = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
    desde.setDate(ahora.getDate() - dia + offset * 7)
    desde.setHours(0, 0, 0, 0)
    hasta = new Date(desde)
    hasta.setDate(desde.getDate() + 6)
    hasta.setHours(23, 59, 59, 999)
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', timeZone: TZ }
    label = `${desde.toLocaleDateString('es-AR', opts)} al ${hasta.toLocaleDateString('es-AR', opts)} ${hasta.getFullYear()}`
  } else if (filtro === 'mes') {
    desde = new Date(ahora.getFullYear(), ahora.getMonth() + offset, 1)
    hasta = new Date(ahora.getFullYear(), ahora.getMonth() + offset + 1, 0, 23, 59, 59)
    label = desde.toLocaleDateString('es-AR', { timeZone: TZ, month: 'long', year: 'numeric' })
    label = label.charAt(0).toUpperCase() + label.slice(1)
  } else if (filtro === 'trimestre') {
    const trimestre = Math.floor(ahora.getMonth() / 3) + offset
    const anio = ahora.getFullYear() + Math.floor(trimestre / 4)
    const trimNorm = ((trimestre % 4) + 4) % 4
    desde = new Date(anio, trimNorm * 3, 1)
    hasta = new Date(anio, trimNorm * 3 + 3, 0, 23, 59, 59)
    label = `T${trimNorm + 1} ${anio}`
  } else if (filtro === 'anio') {
    const anio = ahora.getFullYear() + offset
    desde = new Date(anio, 0, 1)
    hasta = new Date(anio, 11, 31, 23, 59, 59)
    label = `${anio}`
  } else {
    desde = desdeCustom ? new Date(desdeCustom + 'T00:00:00') : new Date(ahora.getFullYear(), ahora.getMonth(), 1)
    hasta = hastaCustom ? new Date(hastaCustom + 'T23:59:59') : new Date()
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ }
    label = `${desde.toLocaleDateString('es-AR', opts)} — ${hasta.toLocaleDateString('es-AR', opts)}`
  }

  return { desde, hasta, label }
}

type DatoVendedora = { nombre: string, ventas: number, cantidad: number }
type DatoMedio = { medio: string, total: number, cantidad: number }

const MEDIO_LABEL: Record<string, string> = {
  efectivo: '💵 Efectivo',
  debito: '💳 Débito',
  credito: '💳 Crédito',
  transferencia: '📲 Transferencia',
}

function GraficoPie({ datos }: { datos: DatoMedio[] }) {
  const [tooltip, setTooltip] = useState<string | null>(null)
  const total = datos.reduce((s, d) => s + d.total, 0)
  if (total === 0) return null

  let angle = -Math.PI / 2
  const slices = datos.map((d, i) => {
    const pct = d.total / total
    const start = angle
    angle += pct * 2 * Math.PI
    return { ...d, pct, start, end: angle, color: COLORES_MEDIO[i % COLORES_MEDIO.length] }
  })

  const arc = (start: number, end: number) => {
    const cx = 100, cy = 100, r = 80
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end)
    const large = end - start > Math.PI ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-center">
      <svg viewBox="0 0 200 200" className="w-44 h-44 shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={arc(s.start, s.end)} fill={s.color}
            stroke="white" strokeWidth="2"
            opacity={tooltip && tooltip !== s.medio ? 0.5 : 1}
            className="transition-opacity cursor-pointer"
            onMouseEnter={() => setTooltip(s.medio)}
            onMouseLeave={() => setTooltip(null)} />
        ))}
      </svg>
      <div className="space-y-2 w-full">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-sm text-gray-700 flex-1">{s.medio}</span>
            <span className="text-sm font-bold text-gray-800">${s.total.toLocaleString('es-AR')}</span>
            <span className="text-xs text-gray-400 w-10 text-right">{Math.round(s.pct * 100)}%</span>
            <span className="text-xs text-gray-400 w-12 text-right">{s.cantidad} vta{s.cantidad !== 1 ? 's' : ''}</span>
          </div>
        ))}
        <div className="border-t pt-2 flex justify-between text-xs text-gray-500 font-medium">
          <span>Total</span>
          <span>${total.toLocaleString('es-AR')}</span>
        </div>
      </div>
    </div>
  )
}

function GraficoBarras({ datos, dataKey, formatear, formatearEscala }: {
  datos: { nombre: string, [k: string]: any }[]
  dataKey: string
  formatear: (v: number) => string
  formatearEscala: (v: number) => string
}) {
  const [tooltip, setTooltip] = useState<{ nombre: string, valor: string } | null>(null)
  const maximo = Math.max(...datos.map(d => d[dataKey]), 1)
  const escala = [0, Math.round(maximo / 2), maximo]

  return (
    <div className="relative">
      <div className="space-y-3">
        {datos.map((d, i) => {
          const pct = (d[dataKey] / maximo) * 100
          return (
            <div key={d.nombre} className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-gray-700">{d.nombre}</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-6 bg-gray-50 rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg cursor-pointer transition-opacity hover:opacity-85"
                    style={{ width: `${pct}%`, backgroundColor: COLORES[i % COLORES.length], minWidth: pct > 0 ? '8px' : '0' }}
                    onMouseEnter={() => setTooltip({ nombre: d.nombre, valor: formatear(d[dataKey]) })}
                    onMouseLeave={() => setTooltip(null)}
                    onTouchStart={() => setTooltip({ nombre: d.nombre, valor: formatear(d[dataKey]) })}
                    onTouchEnd={() => setTimeout(() => setTooltip(null), 1500)}
                  />
                </div>
                <span className="text-xs font-bold text-amber-700 shrink-0 w-28 text-right">{formatear(d[dataKey])}</span>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-3 pr-32">
        {escala.map((v, i) => <span key={i} className="text-xs text-gray-400">{formatearEscala(v)}</span>)}
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
  const [ventas, setVentas] = useState<any[]>([])
  const [filtro, setFiltro] = useState<Filtro>('dia')
  const [offset, setOffset] = useState(0)
  const [desdeCustom, setDesdeCustom] = useState('')
  const [hastaCustom, setHastaCustom] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { iniciar() }, [])
  useEffect(() => { if (usuario) cargarDatos() }, [filtro, offset, desdeCustom, hastaCustom, usuario])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)
  }

  const cargarDatos = async () => {
    setLoading(true)
    const { desde, hasta } = obtenerRango(filtro, offset, desdeCustom, hastaCustom)

    const { data: rows } = await supabase
      .from('ventas')
      .select('*')
      .gte('creado_en', desde.toISOString())
      .lte('creado_en', hasta.toISOString())
      .order('creado_en', { ascending: true })

    if (rows && rows.length > 0) {
      const ids = [...new Set([...rows.map((v: any) => v.cobrado_por), ...rows.map((v: any) => v.atendido_por)])]
      const { data: users } = await supabase.from('usuarios').select('id,nombre').in('id', ids)
      const map: Record<string, string> = Object.fromEntries((users || []).map((u: any) => [u.id, u.nombre]))
      setVentas(rows.map((v: any) => ({
        ...v,
        cobrador_nombre: map[v.cobrado_por] || 'Sin nombre',
        atendedor_nombre: map[v.atendido_por] || 'Sin nombre',
      })))
    } else {
      setVentas([])
    }
    setLoading(false)
  }

  const rango = obtenerRango(filtro, offset, desdeCustom, hastaCustom)

  const datosCobrador = (): DatoVendedora[] => {
    const mapa: Record<string, DatoVendedora> = {}
    ventas.forEach(v => {
      const n = v.cobrador_nombre
      if (!mapa[n]) mapa[n] = { nombre: n, ventas: 0, cantidad: 0 }
      mapa[n].ventas += Number(v.monto)
      mapa[n].cantidad += 1
    })
    return Object.values(mapa).sort((a, b) => b.ventas - a.ventas)
  }

  const datosAtendedor = (): (DatoVendedora & { nombre: string })[] => {
    const mapa: Record<string, DatoVendedora> = {}
    ventas.forEach(v => {
      const n = v.atendedor_nombre
      if (!mapa[n]) mapa[n] = { nombre: n, ventas: 0, cantidad: 0 }
      mapa[n].cantidad += 1
      mapa[n].ventas += Number(v.monto)
    })
    return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad)
  }

  const datosMedioPago = (): DatoMedio[] => {
    const mapa: Record<string, DatoMedio> = {}
    ventas.forEach(v => {
      const m = v.medio_pago || 'efectivo'
      const label = MEDIO_LABEL[m] || m
      if (!mapa[label]) mapa[label] = { medio: label, total: 0, cantidad: 0 }
      mapa[label].total += Number(v.monto)
      mapa[label].cantidad += 1
    })
    return Object.values(mapa).sort((a, b) => b.total - a.total)
  }

  const cobrador = datosCobrador()
  const atendedor = datosAtendedor()
  const medioPago = datosMedioPago()
  const totalVentas = ventas.reduce((s, v) => s + Number(v.monto), 0)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const descargarBackup = async () => {
    // 1. Ventas
    const { data: ventasRows } = await supabase
      .from('ventas')
      .select('*')
      .order('creado_en', { ascending: true })

    const allIds = ventasRows
      ? [...new Set([...ventasRows.map((v: any) => v.cobrado_por), ...ventasRows.map((v: any) => v.atendido_por)])]
      : []
    const { data: usersData } = await supabase.from('usuarios').select('id,nombre').in('id', allIds)
    const uMap: Record<string, string> = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.nombre]))

    const MEDIO_ES: Record<string, string> = {
      efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia',
    }
    const filasVentas = (ventasRows || []).map((v: any) => ({
      Fecha: new Date(v.creado_en).toLocaleString('es-AR', { timeZone: TZ }),
      Monto: Number(v.monto),
      'Medio de pago': MEDIO_ES[v.medio_pago] || v.medio_pago,
      'Cobrado por': uMap[v.cobrado_por] || v.cobrado_por,
      'Atendido por': uMap[v.atendido_por] || v.atendido_por,
    }))

    // 2. Ranking vendedoras (derivado)
    const rankingMap: Record<string, { Vendedora: string, 'Total vendido': number, 'Cantidad de ventas': number }> = {}
    filasVentas.forEach(v => {
      const n = v['Cobrado por']
      if (!rankingMap[n]) rankingMap[n] = { Vendedora: n, 'Total vendido': 0, 'Cantidad de ventas': 0 }
      rankingMap[n]['Total vendido'] += v.Monto
      rankingMap[n]['Cantidad de ventas'] += 1
    })
    const filasRanking = Object.values(rankingMap).sort((a, b) => b['Total vendido'] - a['Total vendido'])

    // 3. Stock — Movimientos
    const { data: movRows } = await supabase
      .from('movimientos_stock')
      .select('*, insumos(nombre, unidad), usuarios(nombre)')
      .order('creado_en', { ascending: true })

    const filasStock = (movRows || []).map((m: any) => ({
      Fecha: new Date(m.creado_en).toLocaleString('es-AR', { timeZone: TZ }),
      Insumo: m.insumos?.nombre || '',
      Tipo: m.tipo === 'entrada' ? 'Entrada' : 'Salida',
      Cantidad: Number(m.cantidad),
      'Unidad': m.insumos?.unidad || '',
      'Entregado a': m.entregado_a || '',
      Usuario: m.usuarios?.nombre || '',
    }))

    // 4. Producción
    const { data: partesRows } = await supabase
      .from('partes_produccion')
      .select('fecha, usuarios(nombre), detalle_parte(producto, cantidad)')
      .order('fecha', { ascending: true })

    const filasProduccion: any[] = []
    ;(partesRows || []).forEach((p: any) => {
      const productor = p.usuarios?.nombre || ''
      ;(p.detalle_parte || []).forEach((d: any) => {
        filasProduccion.push({
          Fecha: p.fecha,
          Productor: productor,
          Producto: d.producto,
          Cantidad: Number(d.cantidad),
        })
      })
    })

    // Armar libro
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasVentas), 'Ventas')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasRanking), 'Ranking vendedoras')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasStock), 'Stock - Movimientos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filasProduccion), 'Producción')

    const fechaHoy = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
    XLSX.writeFile(wb, `backup-la-bolleria-${fechaHoy}.xlsx`)
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
          <span className="text-sm hidden sm:inline">Hola, <strong>{usuario.nombre}</strong></span>
          {(usuario.rol === 'admin' || usuario.rol === 'ventas') && (
            <button onClick={descargarBackup} className="bg-amber-600 hover:bg-amber-500 text-white text-sm px-3 py-1 rounded-lg transition">
              ⬇️ Excel
            </button>
          )}
          <button onClick={handleLogout} className="bg-amber-900 hover:bg-amber-800 text-white text-sm px-3 py-1 rounded-lg transition">
            Salir
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">

        {/* Módulos */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {(usuario.rol === 'admin' || usuario.rol === 'produccion' || usuario.rol === 'ventas') && (
            <div onClick={() => router.push('/stock')}
              className="bg-white rounded-xl shadow p-4 cursor-pointer hover:shadow-md transition border-l-4 border-amber-500">
              <div className="text-2xl mb-1">📦</div>
              <p className="font-bold text-sm text-gray-800">Stock</p>
            </div>
          )}
          {(usuario.rol === 'admin' || usuario.rol === 'produccion' || usuario.rol === 'ventas') && (
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

        {(usuario.rol === 'admin' || usuario.rol === 'ventas') && (
          <>
            {/* Selector de período */}
            <div className="bg-white rounded-xl shadow px-5 py-4 mb-6">
              <div className="flex flex-wrap gap-2 mb-3">
                {([
                  { key: 'dia', label: 'Día' },
                  { key: 'semana', label: 'Semana' },
                  { key: 'mes', label: 'Mes' },
                  { key: 'trimestre', label: 'Trimestre' },
                  { key: 'anio', label: 'Año' },
                  { key: 'personalizado', label: 'Personalizado' },
                ] as { key: Filtro, label: string }[]).map(f => (
                  <button key={f.key} onClick={() => { setFiltro(f.key); setOffset(0) }}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      filtro === f.key ? 'bg-amber-600 text-white' : 'bg-amber-50 text-gray-600 hover:bg-amber-100'
                    }`}>
                    {f.label}
                  </button>
                ))}
              </div>

              {filtro === 'personalizado' ? (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Desde</label>
                    <input type="date" value={desdeCustom} onChange={(e) => setDesdeCustom(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Hasta</label>
                    <input type="date" value={hastaCustom} onChange={(e) => setHastaCustom(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <button onClick={() => setOffset(offset - 1)}
                    className="text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-lg font-bold text-lg transition">←</button>
                  <span className="text-sm font-semibold text-amber-800 text-center">{rango.label}</span>
                  <button onClick={() => setOffset(Math.min(offset + 1, 0))} disabled={offset === 0}
                    className="text-amber-700 hover:bg-amber-50 px-3 py-1 rounded-lg font-bold text-lg transition disabled:opacity-30">→</button>
                </div>
              )}
            </div>

            {/* KPI */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total vendido</p>
                <p className="text-2xl font-bold text-amber-700">
                  ${totalVentas.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-sm text-gray-500 mb-1">Total ventas</p>
                <p className="text-2xl font-bold text-amber-700">{ventas.length}</p>
              </div>
            </div>

            {loading ? (
              <p className="text-center text-amber-800">Cargando gráficos...</p>
            ) : ventas.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
                <p className="text-3xl mb-2">📊</p>
                <p>No hay datos para <strong>{rango.label}</strong></p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl shadow p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4">🙋 Ranking de atención al cliente</h3>
                  <GraficoBarras datos={atendedor.map(d => ({ nombre: d.nombre, valor: d.cantidad }))}
                    dataKey="valor"
                    formatear={(v) => `${v} ventas`}
                    formatearEscala={(v) => `${v}`} />
                </div>

                <div className="bg-white rounded-xl shadow p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4">💵 Ventas por vendedora (cobrado por)</h3>
                  <GraficoBarras datos={cobrador.map(d => ({ nombre: d.nombre, valor: d.ventas }))}
                    dataKey="valor"
                    formatear={(v) => `$${v.toLocaleString('es-AR')}`}
                    formatearEscala={(v) => `$${v.toLocaleString('es-AR')}`} />
                </div>

                <div className="bg-white rounded-xl shadow p-5 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4">💳 Medios de pago</h3>
                  <GraficoPie datos={medioPago} />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
