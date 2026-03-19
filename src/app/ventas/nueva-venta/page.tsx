'use client'

import { useEffect, useRef, useState } from 'react'
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
