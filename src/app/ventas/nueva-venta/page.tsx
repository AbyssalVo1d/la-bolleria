'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TZ = 'America/Argentina/Buenos_Aires'

const LOGO_BOLLERIA = 'data:image/jpeg;base64,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'


const MEDIOS_PAGO = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'debito',        label: '💳 Débito' },
  { value: 'credito',       label: '💳 Crédito' },
  { value: 'transferencia', label: '📲 Transferencia' },
]

const MEDIO_ES: Record<string, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia', mixto: 'Múltiples medios',
}

interface Producto {
  id: number
  nombre: string
  categoria: string
  precio: number | null
  unidad: string
}

interface ItemVenta {
  productoId: string
  productoNombre: string
  cantidad: string
  monto: string
}

interface MedioPagoEntry {
  medio: string
  monto: string
}

function turnoSegunHora(): string {
  const hora = new Date().toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false })
  const h = parseInt(hora)
  if (h >= 8 && h < 13) return 'mañana'
  if (h >= 16) return 'tarde'
  return 'mañana'
}

function parsNum(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}

function fmtMonto(s: string): string {
  const solo = s.replace(/\D/g, '')
  if (!solo) return ''
  return solo.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

async function buildPDF(v: any, items: any[]) {
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
  const logoB64 = LOGO_BOLLERIA
  if (logoB64) {
    doc.addImage(logoB64, 'JPEG', logoX, y, logoW, logoH)
    y += logoH + 7
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
      const nombre = it.productos?.nombre || it.productoNombre || '—'
      const unidad = it.productos?.unidad || it.unidad || 'u'
      const cant = it.cantidad != null && it.cantidad !== ''
        ? `${Number(String(it.cantidad).replace(',', '.')).toLocaleString('es-AR')} ${unidad}`
        : `1 ${unidad}`
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

  // Medios de pago: múltiples o uno solo
  if (v.medios_pago && v.medios_pago.length > 0) {
    line('Medios de pago:', 10, true)
    v.medios_pago.forEach((m: any) => {
      const label = `${MEDIO_ES[m.medio] || m.medio}: $${Number(m.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}`
      line(label, 9, true)
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

function BuscadorProducto({
  productos,
  value,
  onChange,
}: {
  productos: Producto[]
  value: { productoId: string; productoNombre: string }
  onChange: (productoId: string, productoNombre: string) => void
}) {
  const [query, setQuery] = useState(value.productoNombre)
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value.productoNombre) }, [value.productoNombre])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtrados = query
    ? productos.filter(p => normalizar(p.nombre).includes(normalizar(query)))
    : productos

  const categorias = [...new Set(filtrados.map(p => p.categoria))]

  const seleccionar = (p: Producto) => {
    onChange(String(p.id), p.nombre)
    setQuery(p.nombre)
    setAbierto(false)
  }

  return (
    <div ref={ref} className="relative">
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setAbierto(true); if (!e.target.value) onChange('', '') }}
        onFocus={() => setAbierto(true)}
        placeholder="Buscar producto..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      {abierto && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {categorias.length === 0 ? (
            <p className="text-sm text-gray-400 px-4 py-3">Sin resultados</p>
          ) : (
            categorias.map(cat => (
              <div key={cat}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 pt-2 pb-1 bg-gray-50">
                  {cat}
                </p>
                {filtrados.filter(p => p.categoria === cat).map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={() => seleccionar(p)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-blue-50 flex justify-between items-center"
                  >
                    <span>{p.nombre}</span>
                    {p.precio != null && (
                      <span className="text-xs text-gray-400 ml-2">${Number(p.precio).toLocaleString('es-AR')}</span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function NuevaVentaPage() {
  const [items, setItems] = useState<ItemVenta[]>([{ productoId: '', productoNombre: '', cantidad: '', monto: '' }])
  const [productos, setProductos] = useState<Producto[]>([])
  const [mediosPago, setMediosPago] = useState<MedioPagoEntry[]>([{ medio: 'efectivo', monto: '' }])
  const [turno, setTurno] = useState(turnoSegunHora())
  const [cobradoPor, setCobradoPor] = useState('')
  const [atendidoPor, setAtendidoPor] = useState('')
  const [vendedoras, setVendedoras] = useState<any[]>([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [ventaGuardada, setVentaGuardada] = useState<any>(null)
  const [itemsGuardados, setItemsGuardados] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { iniciar() }, [])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [{ data: prods }, { data: vends }, { data: u }] = await Promise.all([
      supabase.from('productos').select('id,nombre,categoria,precio,unidad').eq('activo', true).order('categoria').order('nombre'),
      supabase.from('usuarios').select('id,nombre').eq('rol', 'ventas').eq('activo', true).order('nombre'),
      supabase.from('usuarios').select('id,rol').eq('id', user.id).single(),
    ])
    setProductos(prods || [])
    setVendedoras(vends || [])
    if (u?.rol === 'ventas') {
      setCobradoPor(user.id)
      setAtendidoPor(user.id)
    }
  }

  const productoById = (id: string) => productos.find(p => String(p.id) === id)

  const actualizarProducto = (i: number, productoId: string, productoNombre: string) => {
    const nuevos = [...items]
    nuevos[i] = { productoId, productoNombre, cantidad: '', monto: '' }
    setItems(nuevos)
  }

  const actualizarCantidad = (i: number, val: string) => {
    const nuevos = [...items]
    nuevos[i].cantidad = val
    const p = productoById(nuevos[i].productoId)
    if (p?.precio != null && val !== '') {
      const cant = parseFloat(val.replace(',', '.')) || 0
      nuevos[i].monto = fmtMonto(String(Math.round(cant * p.precio)))
    }
    setItems(nuevos)
  }

  const actualizarMonto = (i: number, val: string) => {
    const nuevos = [...items]
    nuevos[i].monto = fmtMonto(val)
    const p = productoById(nuevos[i].productoId)
    if (p?.precio != null && p.precio > 0 && val !== '') {
      const monto = parsNum(fmtMonto(val))
      nuevos[i].cantidad = (monto / p.precio).toFixed(p.unidad === 'kg' ? 3 : 0)
    }
    setItems(nuevos)
  }

  const agregarItem = () => setItems([...items, { productoId: '', productoNombre: '', cantidad: '', monto: '' }])
  const quitarItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))

  const total = items.reduce((s, it) => s + parsNum(it.monto), 0)

  // --- Múltiples medios de pago ---

  // Cuando hay un solo medio, sincronizar su monto con el total
  useEffect(() => {
    if (mediosPago.length === 1) {
      setMediosPago([{ ...mediosPago[0], monto: total > 0 ? fmtMonto(String(Math.round(total))) : '' }])
    }
  }, [total])

  const totalMediosPago = mediosPago.reduce((s, m) => s + parsNum(m.monto), 0)
  const restante = Math.round((total - totalMediosPago) * 100) / 100

  const agregarMedioPago = () => {
    if (mediosPago.length >= MEDIOS_PAGO.length) return
    const usados = mediosPago.map(m => m.medio)
    const siguiente = MEDIOS_PAGO.find(m => !usados.includes(m.value))?.value || 'efectivo'
    const restanteActual = Math.round((total - mediosPago.reduce((s, m) => s + parsNum(m.monto), 0)) * 100) / 100
    setMediosPago([
      ...mediosPago,
      { medio: siguiente, monto: restanteActual > 0 ? fmtMonto(String(Math.round(restanteActual))) : '' }
    ])
  }

  const quitarMedioPago = (i: number) => {
    if (mediosPago.length <= 1) return
    const nuevos = mediosPago.filter((_, idx) => idx !== i)
    setMediosPago(nuevos)
  }

  const actualizarMedioEntry = (i: number, medio: string) => {
    const nuevos = [...mediosPago]
    nuevos[i] = { ...nuevos[i], medio }
    setMediosPago(nuevos)
  }

  const actualizarMontoMedio = (i: number, val: string) => {
    const nuevos = [...mediosPago]
    nuevos[i] = { ...nuevos[i], monto: fmtMonto(val) }
    setMediosPago(nuevos)
  }

  // --- Guardar ---

  const guardar = async () => {
    if (items.every(it => !it.productoId)) { setError('Agregá al menos un producto'); return }
    for (let i = 0; i < items.length; i++) {
      if (items[i].productoId && (!items[i].monto || parsNum(items[i].monto) <= 0)) {
        setError(`Ingresá el monto del producto ${i + 1}`); return
      }
    }
    if (!cobradoPor) { setError('Indicá quién cobró'); return }
    if (!atendidoPor) { setError('Indicá quién atendió'); return }

    // Validar pagos múltiples
    if (mediosPago.length > 1) {
      if (restante !== 0) {
        setError(restante > 0
          ? `Falta distribuir $${restante.toLocaleString('es-AR')} entre los medios de pago`
          : `El monto ingresado supera el total por $${Math.abs(restante).toLocaleString('es-AR')}`)
        return
      }
    }

    setGuardando(true)
    setError('')

    const { data: ultima } = await supabase
      .from('ventas')
      .select('numero_comprobante')
      .not('numero_comprobante', 'is', null)
      .order('numero_comprobante', { ascending: false })
      .limit(1)
      .single()
    const ultimo = ultima?.numero_comprobante ? parseInt(ultima.numero_comprobante) : 0
    const numero_comprobante = String(ultimo + 1).padStart(6, '0')

    // Preparar datos de medios de pago
    const esMultiple = mediosPago.length > 1
    const medioPagoStr = esMultiple ? 'mixto' : mediosPago[0].medio
    const mediosPagoData = esMultiple
      ? mediosPago.map(m => ({ medio: m.medio, monto: parsNum(m.monto) }))
      : null

    const ventaPayload: any = {
      monto: total,
      medio_pago: medioPagoStr,
      cobrado_por: cobradoPor,
      atendido_por: atendidoPor,
      turno,
      numero_comprobante,
    }
    if (mediosPagoData) ventaPayload.medios_pago = mediosPagoData

    const { data: venta, error: errVenta } = await supabase
      .from('ventas')
      .insert(ventaPayload)
      .select()
      .single()

    if (errVenta || !venta) {
      setError('Error al guardar: ' + errVenta?.message)
      setGuardando(false)
      return
    }

    const itemsValidos = items.filter(it => it.productoId && parsNum(it.monto) > 0)
    const { error: errItems } = await supabase.from('venta_items').insert(
      itemsValidos.map(it => ({
        venta_id: venta.id,
        producto_id: parseInt(it.productoId),
        cantidad: parseFloat(it.cantidad.replace(',', '.')) || null,
        monto: parsNum(it.monto),
      }))
    )

    if (errItems) {
      setError('Error al guardar items: ' + errItems.message)
      setGuardando(false)
      return
    }

    const itemsConDatos = itemsValidos.map(it => {
      const prod = productoById(it.productoId)
      return {
        productoNombre: it.productoNombre,
        cantidad: it.cantidad,
        monto: parsNum(it.monto),
        productos: { nombre: it.productoNombre, unidad: prod?.unidad || 'u' },
      }
    })

    // Enriquecer venta guardada con medios_pago para el PDF
    setVentaGuardada({ ...venta, medios_pago: mediosPagoData })
    setItemsGuardados(itemsConDatos)
    setGuardando(false)
  }

  const nuevaVenta = () => {
    setVentaGuardada(null)
    setItemsGuardados([])
    setItems([{ productoId: '', productoNombre: '', cantidad: '', monto: '' }])
    setMediosPago([{ medio: 'efectivo', monto: '' }])
    setTurno(turnoSegunHora())
    setError('')
  }

  // Pantalla de confirmación
  if (ventaGuardada) {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-5">
          <div className="text-5xl">✅</div>
          <div>
            <p className="text-xl font-bold text-gray-800">¡Venta registrada!</p>
            {ventaGuardada.numero_comprobante && (
              <p className="text-sm text-gray-500 mt-1 font-mono">Comprobante Nº {ventaGuardada.numero_comprobante}</p>
            )}
            <p className="text-2xl font-bold text-blue-700 mt-2">
              ${Number(ventaGuardada.monto).toLocaleString('es-AR', { minimumFractionDigits: 0 })}
            </p>
            {ventaGuardada.medios_pago ? (
              <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                {ventaGuardada.medios_pago.map((m: any, i: number) => (
                  <p key={i}>{MEDIO_ES[m.medio] || m.medio}: ${Number(m.monto).toLocaleString('es-AR')}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{MEDIO_ES[ventaGuardada.medio_pago] || ventaGuardada.medio_pago}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                const doc = await buildPDF(ventaGuardada, itemsGuardados)
                doc.autoPrint()
                window.open(doc.output('bloburl'), '_blank')
              }}
              className="flex flex-col items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5 px-6 rounded-xl transition"
            >
              <span className="text-3xl">🖨️</span>
              <span className="text-base">Imprimir</span>
            </button>
            <button
              onClick={async () => {
                const doc = await buildPDF(ventaGuardada, itemsGuardados)
                doc.save(`comprobante-${ventaGuardada.numero_comprobante || ventaGuardada.id}.pdf`)
              }}
              className="flex flex-col items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-5 px-6 rounded-xl transition"
            >
              <span className="text-3xl">💾</span>
              <span className="text-base">Guardar PDF</span>
            </button>
          </div>

          <button
            onClick={nuevaVenta}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl transition"
          >
            + Registrar otra venta
          </button>

          <button onClick={() => window.close()} className="text-sm text-gray-400 hover:text-gray-600">
            Cerrar pestaña
          </button>
        </div>
      </div>
    )
  }

  const mediosUsados = mediosPago.map(m => m.medio)

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => window.close()} className="text-blue-200 hover:text-white text-sm">✕ Cerrar</button>
        <span className="text-xl font-bold">🛒 Nueva venta</span>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-4">

        {items.map((item, i) => {
          const prod = productoById(item.productoId)
          return (
            <div key={i} className="bg-white rounded-xl shadow p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Producto {items.length > 1 ? i + 1 : ''}
                </span>
                {items.length > 1 && (
                  <button onClick={() => quitarItem(i)} className="text-red-400 hover:text-red-600 text-xs font-medium">✕ Quitar</button>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Producto *</label>
                <BuscadorProducto
                  productos={productos}
                  value={{ productoId: item.productoId, productoNombre: item.productoNombre }}
                  onChange={(id, nombre) => actualizarProducto(i, id, nombre)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Cantidad {prod ? `(${prod.unidad})` : ''}
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.cantidad}
                    onChange={e => actualizarCantidad(i, e.target.value)}
                    placeholder={prod?.unidad === 'kg' ? '0.350' : '1'}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto ($)</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.monto}
                      onChange={e => actualizarMonto(i, e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg pl-6 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        <button
          onClick={agregarItem}
          className="w-full border-2 border-dashed border-blue-300 text-blue-600 hover:border-blue-400 hover:bg-blue-50 font-medium py-3 rounded-xl text-sm transition"
        >
          + Agregar otro producto
        </button>

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-700">Total</span>
          <span className="text-xl font-bold text-blue-700">
            ${total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </span>
        </div>

        {/* Medios de pago */}
        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Medio de pago *</label>

          <div className="space-y-2">
            {mediosPago.map((entry, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  value={entry.medio}
                  onChange={e => actualizarMedioEntry(i, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {MEDIOS_PAGO.map(m => (
                    <option key={m.value} value={m.value} disabled={mediosUsados.includes(m.value) && m.value !== entry.medio}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {mediosPago.length > 1 && (
                  <div className="relative w-32">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={entry.monto}
                      onChange={e => actualizarMontoMedio(i, e.target.value)}
                      placeholder="0"
                      className="w-full border border-gray-300 rounded-lg pl-6 pr-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                )}

                {mediosPago.length > 1 && (
                  <button
                    type="button"
                    onClick={() => quitarMedioPago(i)}
                    className="text-red-400 hover:text-red-600 text-sm font-medium px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Restante (solo cuando hay múltiples medios) */}
          {mediosPago.length > 1 && (
            <div className={`flex justify-between items-center px-3 py-2 rounded-lg text-sm font-medium ${
              restante === 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : restante < 0
                  ? 'bg-red-50 text-red-600 border border-red-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              <span>{restante === 0 ? '✅ Monto completo' : restante < 0 ? '⚠️ Excede el total' : 'Restante'}</span>
              {restante !== 0 && (
                <span>${Math.abs(restante).toLocaleString('es-AR', { minimumFractionDigits: 0 })}</span>
              )}
            </div>
          )}

          {mediosPago.length < MEDIOS_PAGO.length && (
            <button
              type="button"
              onClick={agregarMedioPago}
              className="w-full border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 text-sm py-2 rounded-lg transition"
            >
              + Agregar otro medio de pago
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Turno</label>
          <div className="grid grid-cols-2 gap-2">
            {['mañana', 'tarde'].map(t => (
              <button key={t} type="button" onClick={() => setTurno(t)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition capitalize ${
                  turno === t
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-amber-400'
                }`}>
                {t === 'mañana' ? '🌅 Mañana' : '🌆 Tarde'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién cobró? *</label>
            <select value={cobradoPor} onChange={e => setCobradoPor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Seleccioná</option>
              {vendedoras.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">¿Quién atendió? *</label>
            <select value={atendidoPor} onChange={e => setAtendidoPor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Seleccioná</option>
              {vendedoras.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button onClick={guardar} disabled={guardando}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 mb-6">
          {guardando ? 'Guardando...' : `Guardar venta · $${total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
        </button>

      </main>
    </div>
  )
}
