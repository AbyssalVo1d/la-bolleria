'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TZ = 'America/Argentina/Buenos_Aires'
const COLORES = ['#92400e', '#b45309', '#d97706', '#f59e0b', '#fbbf24', '#fcd34d']

function GraficoBarras({ datos, dataKey, formatear }: {
  datos: { nombre: string, [k: string]: any }[]
  dataKey: string
  formatear: (v: number) => string
}) {
  const [tooltip, setTooltip] = useState<{ nombre: string, valor: string } | null>(null)
  const maximo = Math.max(...datos.map(d => d[dataKey]), 1)
  return (
    <div className="relative space-y-3">
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
      {tooltip && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white border border-amber-200 rounded-lg shadow px-3 py-2 text-sm z-10 pointer-events-none">
          <p className="font-semibold text-gray-800 mb-1">{tooltip.nombre}</p>
          <p className="text-amber-700 font-bold">{tooltip.valor}</p>
        </div>
      )}
    </div>
  )
}

function hoyAR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

function turnoActual(): string {
  const h = parseInt(new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false }))
  if (h >= 8 && h < 14) return 'mañana'
  if (h >= 14 && h <= 21) return 'tarde'
  return ''
}

function fmtFecha(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function CierreDiaPage() {
  const [fecha, setFecha] = useState(hoyAR())
  const [turno, setTurno] = useState(turnoActual())
  const [todosLosDatos, setTodosLosDatos] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    verificarAcceso()
  }, [])

  useEffect(() => {
    if (fecha) cargarDatos(fecha)
  }, [fecha])

  const verificarAcceso = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    if (!u || (u.rol !== 'admin' && u.rol !== 'ventas')) { router.push('/dashboard'); return }
    cargarDatos(hoyAR())
  }

  const cargarDatos = async (f: string) => {
    setLoading(true)

    // Rango UTC del día en Argentina
    const startUTC = `${f}T03:00:00.000Z`
    const nextDay = new Date(f)
    nextDay.setDate(nextDay.getDate() + 1)
    const endUTC = `${nextDay.toISOString().split('T')[0]}T03:00:00.000Z`

    // Ventas del día
    const { data: ventasRows } = await supabase
      .from('ventas')
      .select('*')
      .gte('creado_en', startUTC)
      .lt('creado_en', endUTC)
      .order('creado_en', { ascending: true })

    const ids = ventasRows && ventasRows.length > 0
      ? [...new Set([...ventasRows.map((v: any) => v.cobrado_por), ...ventasRows.map((v: any) => v.atendido_por)])]
      : []
    const { data: usersData } = ids.length > 0
      ? await supabase.from('usuarios').select('id,nombre').in('id', ids)
      : { data: [] }
    const uMap: Record<string, string> = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.nombre]))

    const ventas = (ventasRows || []).map((v: any) => ({
      ...v,
      cobrador_nombre: uMap[v.cobrado_por] || '—',
      atendedor_nombre: uMap[v.atendido_por] || '—',
    }))

    // Partes producción del día (producido)
    const { data: partesProducidos } = await supabase
      .from('partes_produccion')
      .select('*, usuarios(nombre), detalle_parte(*)')
      .eq('fecha', f)
      .eq('tipo', 'producido')
      .order('creado_en', { ascending: true })

    // Partes sobrantes del día
    const { data: partesSobrantes } = await supabase
      .from('partes_produccion')
      .select('*, usuarios(nombre), detalle_parte(*)')
      .eq('fecha', f)
      .eq('tipo', 'sobrante')
      .order('creado_en', { ascending: true })

    setTodosLosDatos({
      ventas,
      partesProducidos: partesProducidos || [],
      partesSobrantes: partesSobrantes || [],
    })
    setLoading(false)
  }

  // Filtro client-side por turno
  const ventasFiltradas = todosLosDatos
    ? turno ? todosLosDatos.ventas.filter((v: any) => v.turno === turno) : todosLosDatos.ventas
    : []

  const datos = todosLosDatos ? (() => {
    const ventas = ventasFiltradas
    const totalVentas = ventas.reduce((s: number, v: any) => s + Number(v.monto), 0)
    const rankCobro: Record<string, { nombre: string, total: number, cant: number }> = {}
    ventas.forEach((v: any) => {
      const n = v.cobrador_nombre
      if (!rankCobro[n]) rankCobro[n] = { nombre: n, total: 0, cant: 0 }
      rankCobro[n].total += Number(v.monto)
      rankCobro[n].cant += 1
    })
    const rankAtencion: Record<string, { nombre: string, cant: number, total: number }> = {}
    ventas.forEach((v: any) => {
      const n = v.atendedor_nombre
      if (!rankAtencion[n]) rankAtencion[n] = { nombre: n, cant: 0, total: 0 }
      rankAtencion[n].cant += 1
      rankAtencion[n].total += Number(v.monto)
    })
    const medios: Record<string, number> = {}
    ventas.forEach((v: any) => {
      medios[v.medio_pago] = (medios[v.medio_pago] || 0) + Number(v.monto)
    })
    return {
      ventas,
      totalVentas,
      cantVentas: ventas.length,
      rankCobro: Object.values(rankCobro).sort((a: any, b: any) => b.total - a.total),
      rankAtencion: Object.values(rankAtencion).sort((a: any, b: any) => b.cant - a.cant),
      medios,
      partesProducidos: todosLosDatos.partesProducidos,
      partesSobrantes: todosLosDatos.partesSobrantes,
    }
  })() : null

  const descargarPDF = async () => {
    if (!datos) return
    setGenerandoPDF(true)

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const MEDIO_ES: Record<string, string> = {
      efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia',
    }

    let y = 15
    const margin = 15
    const pageW = 210
    const colR = pageW - margin

    const titulo = (text: string, size = 14) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(40, 40, 40)
      doc.text(text, margin, y)
      y += size * 0.5 + 2
    }

    const linea = (text: string, size = 10, indent = 0) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(text, margin + indent, y)
      y += size * 0.45 + 1.5
    }

    const lineaDerecha = (izq: string, der: string, size = 10, indent = 0) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      doc.text(izq, margin + indent, y)
      doc.text(der, colR, y, { align: 'right' })
      y += size * 0.45 + 1.5
    }

    const separador = () => {
      y += 2
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, colR, y)
      y += 4
    }

    const saltarLinea = (n = 1) => { y += n * 5 }

    // Header
    doc.setFillColor(146, 64, 14)
    doc.rect(0, 0, 210, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('La Bollería', margin, 11)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.text(`Cierre del día — ${fmtFecha(fecha)}${turno ? ` · ${turno}` : ''}`, margin, 19)
    doc.text(`Generado: ${new Date().toLocaleString('es-AR', { timeZone: TZ })}`, colR, 19, { align: 'right' })
    y = 35

    // Resumen ventas
    titulo('Resumen de ventas')
    separador()
    lineaDerecha('Total vendido:', `$${datos.totalVentas.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`, 12)
    lineaDerecha('Cantidad de ventas:', String(datos.cantVentas), 10)
    saltarLinea()

    // Medios de pago
    titulo('Medios de pago', 12)
    Object.entries(datos.medios).forEach(([m, monto]: any) => {
      lineaDerecha(`  ${MEDIO_ES[m] || m}:`, `$${Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`, 10, 2)
    })
    saltarLinea()

    // Ranking cobradoras
    titulo('Ranking — quién cobró', 12)
    datos.rankCobro.forEach((r: any, i: number) => {
      lineaDerecha(`  ${i + 1}. ${r.nombre}  (${r.cant} venta${r.cant !== 1 ? 's' : ''}):`,
        `$${r.total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`, 10, 2)
    })
    saltarLinea()

    // Ranking atención
    titulo('Ranking — quién atendió', 12)
    datos.rankAtencion.forEach((r: any, i: number) => {
      linea(`  ${i + 1}. ${r.nombre} — ${r.cant} cliente${r.cant !== 1 ? 's' : ''}`, 10, 2)
    })

    // Nueva página si hay partes
    if (datos.partesProducidos.length > 0 || datos.partesSobrantes.length > 0) {
      doc.addPage()
      y = 15

      if (datos.partesProducidos.length > 0) {
        titulo('Parte de producción')
        separador()
        datos.partesProducidos.forEach((p: any) => {
          titulo(`  ${p.usuarios?.nombre || '—'}`, 11)
          p.detalle_parte?.forEach((d: any) => {
            linea(`    • ${d.producto}`, 10, 4)
          })
          if (p.observaciones) linea(`    📝 ${p.observaciones}`, 9, 4)
          saltarLinea(0.5)
        })
        saltarLinea()
      }

      if (datos.partesSobrantes.length > 0) {
        titulo('Parte de lo que quedó')
        separador()
        datos.partesSobrantes.forEach((p: any) => {
          titulo(`  ${p.usuarios?.nombre || '—'}`, 11)
          p.detalle_parte?.forEach((d: any) => {
            linea(`    • ${d.producto}`, 10, 4)
          })
          if (p.observaciones) linea(`    📝 ${p.observaciones}`, 9, 4)
          saltarLinea(0.5)
        })
      }
    }

    doc.save(`cierre-dia-${fecha}.pdf`)
    setGenerandoPDF(false)
  }

  const MEDIO_LABEL: Record<string, string> = {
    efectivo: '💵 Efectivo', debito: '💳 Débito', credito: '💳 Crédito', transferencia: '📲 Transferencia',
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-amber-200 hover:text-white text-sm">← Volver</button>
          <span className="text-xl font-bold">📊 Cierre del día</span>
        </div>
        {datos && !loading && (
          <button
            onClick={descargarPDF}
            disabled={generandoPDF}
            className="bg-white text-amber-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-50 transition disabled:opacity-50"
          >
            {generandoPDF ? 'Generando...' : '⬇️ Descargar PDF'}
          </button>
        )}
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-4">

        {/* Selector de fecha y turno */}
        <div className="bg-white rounded-xl shadow px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Fecha:</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {fecha !== hoyAR() && (
              <button onClick={() => setFecha(hoyAR())} className="text-xs text-amber-600 hover:underline">
                Hoy
              </button>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
            <div className="flex gap-2">
              {[{ v: '', l: 'Todos' }, { v: 'mañana', l: '🌅 Mañana' }, { v: 'tarde', l: '🌆 Tarde' }].map(t => (
                <button key={t.v} onClick={() => setTurno(t.v)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                    turno === t.v
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-amber-400'
                  }`}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-amber-800 py-8">Cargando...</p>
        ) : !datos ? null : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Total vendido</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${datos.totalVentas.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Ventas</p>
                <p className="text-2xl font-bold text-blue-700">{datos.cantVentas}</p>
              </div>
            </div>

            {/* Medios de pago */}
            {Object.keys(datos.medios).length > 0 && (
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">Medios de pago</p>
                <div className="space-y-1.5">
                  {Object.entries(datos.medios).map(([m, monto]: any) => (
                    <div key={m} className="flex justify-between text-sm">
                      <span className="text-gray-600">{MEDIO_LABEL[m] || m}</span>
                      <span className="font-bold text-gray-900">${Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking atención — primero */}
            {datos.rankAtencion.length > 0 && (
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">🙋 Quién atendió más</p>
                <GraficoBarras
                  datos={datos.rankAtencion.map((r: any) => ({ nombre: r.nombre, valor: r.cant, monto: r.total }))}
                  dataKey="valor"
                  formatear={(v) => `${v} cliente${v !== 1 ? 's' : ''}`}
                />
                <div className="mt-3 space-y-1">
                  {datos.rankAtencion.map((r: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs text-gray-500">
                      <span>{i + 1}. {r.nombre}</span>
                      <span className="font-medium text-gray-700">${r.total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ranking cobradoras — segundo */}
            {datos.rankCobro.length > 0 && (
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <p className="text-sm font-semibold text-gray-700 mb-4">💵 Quién cobró más</p>
                <GraficoBarras
                  datos={datos.rankCobro.map((r: any) => ({ nombre: r.nombre, valor: r.total }))}
                  dataKey="valor"
                  formatear={(v) => `$${v.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
                />
              </div>
            )}

            {/* Partes producción */}
            {datos.partesProducidos.length > 0 && (
              <div className="bg-white rounded-xl shadow px-5 py-4">
                <p className="text-sm font-semibold text-gray-700 mb-3">🎂 Parte de producción</p>
                <div className="space-y-3">
                  {datos.partesProducidos.map((p: any) => (
                    <div key={p.id}>
                      <p className="text-xs font-semibold text-gray-500 uppercase">{p.usuarios?.nombre}</p>
                      {p.detalle_parte?.map((d: any) => (
                        <p key={d.id} className="text-sm text-gray-700 pl-2">• {d.producto}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Partes sobrantes */}
            {datos.partesSobrantes.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-orange-700 mb-3">📦 Lo que quedó</p>
                <div className="space-y-3">
                  {datos.partesSobrantes.map((p: any) => (
                    <div key={p.id}>
                      <p className="text-xs font-semibold text-gray-500 uppercase">{p.usuarios?.nombre}</p>
                      {p.detalle_parte?.map((d: any) => (
                        <p key={d.id} className="text-sm text-gray-700 pl-2">• {d.producto}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {datos.cantVentas === 0 && datos.partesProducidos.length === 0 && datos.partesSobrantes.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <p className="text-4xl mb-3">📊</p>
                <p>No hay datos para el {fmtFecha(fecha)}</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
