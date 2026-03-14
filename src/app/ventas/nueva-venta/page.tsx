'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const TZ = 'America/Argentina/Buenos_Aires'

const MEDIOS_PAGO = [
  { value: 'efectivo',      label: '💵 Efectivo' },
  { value: 'debito',        label: '💳 Débito' },
  { value: 'credito',       label: '💳 Crédito' },
  { value: 'transferencia', label: '📲 Transferencia' },
]

interface Producto {
  id: number
  nombre: string
  categoria: string
  precio: number | null
  unidad: string
}

interface ItemVenta {
  productoId: string
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

export default function NuevaVentaPage() {
  const [items, setItems] = useState<ItemVenta[]>([{ productoId: '', cantidad: '', monto: '' }])
  const [productos, setProductos] = useState<Producto[]>([])
  const [medioPago, setMedioPago] = useState('efectivo')
  const [turno, setTurno] = useState(turnoSegunHora())
  const [cobradoPor, setCobradoPor] = useState('')
  const [atendidoPor, setAtendidoPor] = useState('')
  const [vendedoras, setVendedoras] = useState<any[]>([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
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

  const actualizarProducto = (i: number, productoId: string) => {
    const nuevos = [...items]
    nuevos[i] = { productoId, cantidad: '', monto: '' }
    setItems(nuevos)
  }

  const agregarItem = () => setItems([...items, { productoId: '', cantidad: '', monto: '' }])
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

    const { data: venta, error: errVenta } = await supabase
      .from('ventas')
      .insert({
        monto: total,
        medio_pago: medioPago,
        cobrado_por: cobradoPor,
        atendido_por: atendidoPor,
        turno,
      })
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

    router.push('/ventas')
  }

  const categorias = [...new Set(productos.map(p => p.categoria))]

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/ventas')} className="text-blue-200 hover:text-white text-sm">← Volver</button>
        <span className="text-xl font-bold">🛒 Nueva venta</span>
      </header>

      <main className="p-6 max-w-lg mx-auto space-y-4">

        {/* Productos */}
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
                <select
                  value={item.productoId}
                  onChange={e => actualizarProducto(i, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">Seleccioná un producto</option>
                  {categorias.map(cat => (
                    <optgroup key={cat} label={cat}>
                      {productos.filter(p => p.categoria === cat).map(p => (
                        <option key={p.id} value={String(p.id)}>
                          {p.nombre}{p.precio != null ? ` — $${Number(p.precio).toLocaleString('es-AR')}` : ''}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
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

        {/* Total */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-700">Total</span>
          <span className="text-xl font-bold text-blue-700">
            ${total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}
          </span>
        </div>

        {/* Medio de pago */}
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

        {/* Turno */}
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

        {/* Vendedoras */}
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50">
          {guardando ? 'Guardando...' : `Guardar venta · $${total.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
        </button>

      </main>
    </div>
  )
}
