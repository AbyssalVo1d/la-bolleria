'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TZ = 'America/Argentina/Buenos_Aires'

async function cargarLogo(): Promise<string | null> {
  try {
    const res = await fetch('/logo.jpg.jpeg')
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
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
  mixto: '💳💵 Múltiples medios',
}

const MEDIO_ES: Record<string, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia', mixto: 'Múltiples medios',
}

export default function VentasPage() {
  const [todasLasVentas, setTodasLasVentas] = useState<any[]>([])
  const [itemsPorVenta, setItemsPorVenta] = useState<Record<number, any[]>>({})
  const [vendedoras, setVendedoras] = useState<any[]>([])
  const [filtroVendedora, setFiltroVendedora] = useState('')
  const [filtroFecha, setFiltroFecha] = useState(hoyAR())
  const [filtroTurno, setFiltroTurno] = useState(turnoActual())
  const [busquedaComp, setBusquedaComp] = useState('')
  const [loading, setLoading] = useState(true)
  const [userRol, setUserRol] = useState('')
  const [userId, setUserId] = useState('')
  const [cancelando, setCancelando] = useState<number | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { iniciar() }, [])
  useEffect(() => { cargarVentas(filtroFecha) }, [filtroFecha])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)
    const [{ data: vend }, { data: u }] = await Promise.all([
      supabase.from('usuarios').select('id, nombre').eq('rol', 'ventas').eq('activo', true).order('nombre'),
      supabase.from('usuarios').select('rol').eq('id', user.id).single(),
    ])
    setVendedoras(vend || [])
    setUserRol(u?.rol || '')
    await cargarVentas(filtroFecha)
  }

  const cargarVentas = async (fecha: string) => {
    setLoading(true)
    const startUTC = `${fecha}T03:00:00.000Z`
    const nextDay = new Date(fecha)
    nextDay.setDate(nextDay.getDate() + 1)
    const endUTC = `${nextDay.toISOString().split('T')[0]}T03:00:00.000Z`

    const { data: rows } = await supabase
      .from('ventas').select('*')
      .gte('creado_en', startUTC).lt('creado_en', endUTC)
      .order('creado_en', { ascending: false }).limit(500)

    if (rows && rows.length > 0) {
      const ids = [...new Set([...rows.map((v: any) => v.cobrado_por), ...rows.map((v: any) => v.atendido_por)])]
      const { data: users } = await supabase.from('usuarios').select('id,nombre').in('id', ids)
      const map: Record<string, string> = Object.fromEntries((users || []).map((u: any) => [u.id, u.nombre]))
      setTodasLasVentas(rows.map((v: any) => ({
        ...v,
        cobrador_nombre: map[v.cobrado_por] || '—',
        atendedor_nombre: map[v.atendido_por] || '—',
      })))
      const ventaIds = rows.map((v: any) => v.id)
      const { data: items } = await supabase.from('venta_items')
        .select('*, productos(nombre, unidad)').in('venta_id', ventaIds)
      const mapaItems: Record<number, any[]> = {}
      ;(items || []).forEach((it: any) => {
        if (!mapaItems[it.venta_id]) mapaItems[it.venta_id] = []
        mapaItems[it.venta_id].push(it)
      })
      setItemsPorVenta(mapaItems)
    } else {
      setTodasLasVentas([])
      setItemsPorVenta({})
    }
    setLoading(false)
  }

  const buildPDF = async (v: any, items: any[]) => {
    const { jsPDF } = await import('jspdf')
    const PW = 58
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [PW, 260] })
    const cx = PW / 2
    let y = 6

    doc.setTextColor(0, 0, 0)
    const line = (text: string, size = 11, bold = true, align: 'left' | 'center' | 'right' = 'center') => {
      doc.setFontSize(size)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(0, 0, 0)
      const x = align === 'center' ? cx : align === 'right' ? PW - 3 : 3
      doc.text(text, x, y, { align })
      y += size * 0.5 + 2
    }
    const sep = () => {
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.8)
      doc.line(2, y, PW - 2, y)
      y += 4
    }

    // Logo: 28mm ancho, alto proporcional (imagen 218×271 px → 34.8mm)
    const logoW = 28, logoH = Math.round(28 * (271 / 218) * 10) / 10
    const logoX = (PW - logoW) / 2
    const logoB64 = await cargarLogo()
    if (logoB64) {
      doc.addImage(logoB64, 'JPEG', logoX, y, logoW, logoH)
      y += logoH + 3
    }
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(15)
    doc.setFont('helvetica', 'bold')
    doc.text('LA BOLLERÍA', cx, y, { align: 'center' })
    y += 9
    line('Belgrano 320, Corrientes Capital', 9, true)
    line('WhatsApp: 3794-540083', 9, true)
    y += 1
    sep()
    line(`COMPROBANTE DE PAGO Nº ${v.numero_comprobante || '------'}`, 8, true)
    sep()

    const dt = new Date(v.creado_en)
    const fecha = dt.toLocaleDateString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
    const hora = dt.toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
    line(`Fecha: ${fecha}`, 10, true)
    line(`Hora: ${hora}`, 10, true)
    line('Cliente: General', 10, true)
    y += 1
    sep()

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Producto', 2, y)
    doc.text('Cant  Subtotal', PW - 2, y, { align: 'right' })
    y += 5
    sep()

    if (items.length > 0) {
      items.forEach((it: any) => {
        const nombre = it.productos?.nombre || '—'
        const cant = it.cantidad != null
          ? `${Number(it.cantidad).toLocaleString('es-AR')} ${it.productos?.unidad || 'u'}`
          : `1 ${it.productos?.unidad || 'u'}`
        const monto = `$${Number(it.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 0, 0)
        const wrapped = doc.splitTextToSize(nombre, PW - 4)
        doc.text(wrapped, 2, y)
        y += wrapped.length * 4.5
        doc.text(`${cant}  ${monto}`, PW - 2, y, { align: 'right' })
        y += 6
      })
    } else {
      line('(sin detalle de productos)', 9, true)
    }

    sep()
    const total = `$${Number(v.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Subtotal:', 2, y); doc.text(total, PW - 2, y, { align: 'right' }); y += 6
    doc.text('Descuento (0%):', 2, y); doc.text('-$0,00', PW - 2, y, { align: 'right' }); y += 6
    doc.setFontSize(12)
    doc.text('TOTAL:', 2, y); doc.text(total, PW - 2, y, { align: 'right' }); y += 7
    sep()

    if (v.medios_pago && v.medios_pago.length > 0) {
      line('Medios de pago:', 10, true)
      v.medios_pago.forEach((m: any) => {
        line(`${MEDIO_ES[m.medio] || m.medio}: $${Number(m.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`, 9, true)
      })
    } else {
      line(`Medio de pago: ${MEDIO_ES[v.medio_pago] || v.medio_pago}`, 10, true)
    }

    y += 2
    line('¡Que lo disfrute!', 11, true)
    y += 3
    line('DOCUMENTO NO VÁLIDO COMO FACTURA', 7, true)

    return doc
  }

  const imprimirComprobante = async (v: any, items: any[]) => {
    const doc = await buildPDF(v, items)
    doc.autoPrint()
    window.open(doc.output('bloburl'), '_blank')
  }

  const guardarComprobante = async (v: any, items: any[]) => {
    const doc = await buildPDF(v, items)
    doc.save(`comprobante-${v.numero_comprobante || v.id}.pdf`)
  }

  const cancelarVenta = async (v: any) => {
    if (!confirm(`¿Cancelar la venta #${v.numero_comprobante || v.id}? Esta acción no se puede deshacer.`)) return
    setCancelando(v.id)
    const { error } = await supabase
      .from('ventas')
      .update({
        cancelada: true,
        cancelada_por: userId,
        cancelada_en: new Date().toISOString(),
      })
      .eq('id', v.id)
    setCancelando(null)
    if (error) {
      alert('Error al cancelar: ' + error.message)
    } else {
      await cargarVentas(filtroFecha)
    }
  }

  const ventasFiltradas = todasLasVentas.filter(v => {
    if (filtroVendedora && v.cobrado_por !== filtroVendedora) return false
    if (filtroTurno && v.turno !== filtroTurno) return false
    if (busquedaComp && !(v.numero_comprobante || '').includes(busquedaComp.replace(/^0+/, ''))) return false
    return true
  })

  // Separar activas de canceladas
  const ventasActivas = ventasFiltradas.filter(v => !v.cancelada)
  const ventasCanceladas = ventasFiltradas.filter(v => v.cancelada)

  // Total solo de ventas activas
  const totalFiltrado = ventasActivas.reduce((s, v) => s + Number(v.monto), 0)
  const esHoy = filtroFecha === hoyAR()

  const renderVenta = (v: any, esCancelada = false) => {
    const items = itemsPorVenta[v.id] || []
    return (
      <div key={v.id} className={`bg-white rounded-xl shadow px-5 py-3 ${esCancelada ? 'opacity-60' : ''}`}>
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              {v.numero_comprobante && (
                <span className="text-xs font-mono text-gray-400">#{v.numero_comprobante}</span>
              )}
              <p className="text-xs text-gray-400">{formatFechaHora(v.creado_en)}{v.turno ? ` · ${v.turno}` : ''}</p>
              {esCancelada && (
                <span className="text-xs font-semibold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">CANCELADA</span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              💼 {v.cobrador_nombre}
              {v.atendedor_nombre !== v.cobrador_nombre && (
                <span className="text-gray-400"> · atendió {v.atendedor_nombre}</span>
              )}
            </p>
            {/* Medios de pago: múltiples o uno */}
            {v.medios_pago && v.medios_pago.length > 0 ? (
              <div className="mt-0.5 space-y-0">
                {v.medios_pago.map((m: any, i: number) => (
                  <p key={i} className="text-xs text-gray-400">
                    {MEDIO_LABEL[m.medio] || m.medio}: ${Number(m.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">{MEDIO_LABEL[v.medio_pago] || v.medio_pago}</p>
            )}
            {items.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {items.map((it: any) => (
                  <p key={it.id} className="text-xs text-gray-500 pl-2 border-l-2 border-gray-100">
                    {it.productos?.nombre || '—'}
                    {it.cantidad != null && (
                      <span className="text-gray-400"> × {Number(it.cantidad).toLocaleString('es-AR')} {it.productos?.unidad}</span>
                    )}
                    <span className="text-gray-400 ml-1">· ${Number(it.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
            <p className={`text-lg font-bold ${esCancelada ? 'text-gray-400 line-through' : 'text-blue-700'}`}>
              ${Number(v.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </p>
            <div className="flex gap-2 mt-1">
              {!esCancelada && (
                <>
                  <button
                    onClick={() => imprimirComprobante(v, items)}
                    className="text-sm font-medium text-blue-600 hover:bg-blue-50 transition px-5 py-3 rounded-lg border border-blue-200 hover:border-blue-400"
                    title="Imprimir comprobante"
                  >🖨️</button>
                  <button
                    onClick={() => guardarComprobante(v, items)}
                    className="text-sm font-medium text-green-600 hover:bg-green-50 transition px-5 py-3 rounded-lg border border-green-200 hover:border-green-400"
                    title="Guardar PDF"
                  >💾</button>
                  {userRol === 'admin' && (
                    <button
                      onClick={() => cancelarVenta(v)}
                      disabled={cancelando === v.id}
                      className="text-sm font-medium text-red-500 hover:bg-red-50 transition px-5 py-3 rounded-lg border border-red-200 hover:border-red-400 disabled:opacity-50"
                      title="Cancelar venta"
                    >
                      {cancelando === v.id ? '...' : '🚫'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-blue-200 hover:text-white text-sm">← Volver</button>
          <span className="text-xl font-bold">💰 Ventas</span>
        </div>
        <button onClick={() => window.open('/ventas/nueva-venta', '_blank')}
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
              <input type="date" value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Vendedora</label>
              <select value={filtroVendedora} onChange={(e) => setFiltroVendedora(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Todas las vendedoras</option>
                {vendedoras.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
            <div className="flex gap-2">
              {[{ v: '', l: 'Todos' }, { v: 'mañana', l: '🌅 Mañana' }, { v: 'tarde', l: '🌆 Tarde' }].map(t => (
                <button key={t.v} onClick={() => setFiltroTurno(t.v)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                    filtroTurno === t.v
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-blue-400'
                  }`}>{t.l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar por N° comprobante</label>
            <input type="text" value={busquedaComp}
              onChange={e => setBusquedaComp(e.target.value)}
              placeholder="Ej: 000012"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {!esHoy && (
            <button onClick={() => setFiltroFecha(hoyAR())} className="text-xs text-blue-600 hover:underline">
              Volver a hoy
            </button>
          )}
        </div>

        {/* Total (solo ventas activas) */}
        <div className="bg-white rounded-xl shadow px-5 py-4 text-center">
          <p className="text-xs text-gray-400 mb-1">
            Total {filtroVendedora ? `— ${vendedoras.find(v => v.id === filtroVendedora)?.nombre}` : 'del día'}
            {filtroTurno ? ` · ${filtroTurno}` : ''}
            {!esHoy && ` · ${new Date(filtroFecha + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
          </p>
          <p className="text-2xl font-bold text-blue-700">
            ${totalFiltrado.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </p>
          {ventasActivas.length > 0 && (
            <p className="text-xs text-gray-400 mt-1">{ventasActivas.length} venta{ventasActivas.length !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Lista de ventas activas */}
        {loading ? (
          <p className="text-center text-amber-800">Cargando...</p>
        ) : ventasActivas.length === 0 && ventasCanceladas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">🛒</p>
            <p>No hay ventas para este filtro</p>
          </div>
        ) : (
          <>
            {ventasActivas.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">No hay ventas activas</p>
            ) : (
              <div className="space-y-2">
                {ventasActivas.map(v => renderVenta(v, false))}
              </div>
            )}

            {/* Sección de ventas canceladas */}
            {ventasCanceladas.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-red-200" />
                  <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                    Ventas canceladas ({ventasCanceladas.length})
                  </p>
                  <div className="flex-1 h-px bg-red-200" />
                </div>
                {ventasCanceladas.map(v => renderVenta(v, true))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
