'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TZ = 'America/Argentina/Buenos_Aires'
const LOGO_B64 = 'data:image/jpeg;base64,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'

const MEDIOS_PAGO = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'debito',        label: '💳 Débito' },
  { value: 'credito',       label: '💳 Crédito' },
  { value: 'transferencia', label: '📲 Transferencia' },
]

const MEDIO_ES: Record<string, string> = {
  efectivo: 'Efectivo', debito: 'Débito', credito: 'Crédito', transferencia: 'Transferencia',
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

  // Header: logo sobre fondo negro + texto debajo
  const logoW = 44, logoH = 22, logoX = (PW - logoW) / 2
  doc.setFillColor(0, 0, 0)
  doc.rect(logoX, y, logoW, logoH, 'F')
  doc.addImage(LOGO_B64, 'JPEG', logoX, y, logoW, logoH)
  y += logoH + 5
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

  // Encabezado tabla
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Producto', 2, y)
  doc.text('Cant  Subtotal', PW - 2, y, { align: 'right' })
  y += 5
  sep()

  // Items: nombre en línea propia, cant+subtotal en línea siguiente (derecha)
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
  line(`Medio de pago: ${MEDIO_ES[v.medio_pago] || v.medio_pago}`, 10, true)
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
  const [medioPago, setMedioPago] = useState('efectivo')
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

  const guardar = async () => {
    if (items.every(it => !it.productoId)) { setError('Agregá al menos un producto'); return }
    for (let i = 0; i < items.length; i++) {
      if (items[i].productoId && (!items[i].monto || parsNum(items[i].monto) <= 0)) {
        setError(`Ingresá el monto del producto ${i + 1}`); return
      }
    }
    if (!cobradoPor) { setError('Indicá quién cobró'); return }
    if (!atendidoPor) { setError('Indicá quién atendió'); return }

    setGuardando(true)
    setError('')

    // Número correlativo
    const { data: ultima } = await supabase
      .from('ventas')
      .select('numero_comprobante')
      .not('numero_comprobante', 'is', null)
      .order('numero_comprobante', { ascending: false })
      .limit(1)
      .single()
    const ultimo = ultima?.numero_comprobante ? parseInt(ultima.numero_comprobante) : 0
    const numero_comprobante = String(ultimo + 1).padStart(6, '0')

    const { data: venta, error: errVenta } = await supabase
      .from('ventas')
      .insert({ monto: total, medio_pago: medioPago, cobrado_por: cobradoPor, atendido_por: atendidoPor, turno, numero_comprobante })
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

    // Preparar items para el PDF (enriquecer con nombre y unidad del producto)
    const itemsConDatos = itemsValidos.map(it => {
      const prod = productoById(it.productoId)
      return {
        productoNombre: it.productoNombre,
        cantidad: it.cantidad,
        monto: parsNum(it.monto),
        productos: { nombre: it.productoNombre, unidad: prod?.unidad || 'u' },
      }
    })

    setVentaGuardada(venta)
    setItemsGuardados(itemsConDatos)
    setGuardando(false)
  }

  const nuevaVenta = () => {
    setVentaGuardada(null)
    setItemsGuardados([])
    setItems([{ productoId: '', productoNombre: '', cantidad: '', monto: '' }])
    setMedioPago('efectivo')
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
            <p className="text-sm text-gray-500">{MEDIO_ES[ventaGuardada.medio_pago] || ventaGuardada.medio_pago}</p>
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

        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Medio de pago *</label>
          <div className="grid grid-cols-2 gap-2">
            {MEDIOS_PAGO.map(m => (
              <button key={m.value} type="button" onClick={() => setMedioPago(m.value)}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition ${
                  medioPago === m.value
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400'
                }`}>
                {m.label}
              </button>
            ))}
          </div>
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
