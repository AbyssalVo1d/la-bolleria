'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/types'

const MEDIOS_PAGO = [
  { value: 'efectivo',       label: '💵 Efectivo' },
  { value: 'debito',         label: '💳 Débito' },
  { value: 'credito',        label: '💳 Crédito' },
  { value: 'transferencia',  label: '📲 Transferencia / QR' },
]

export default function NuevaVentaPage() {
  const [monto, setMonto] = useState('')
  const [medioPago, setMedioPago] = useState('efectivo')
  const [cobradoPor, setCobradoPor] = useState('')
  const [atendidoPor, setAtendidoPor] = useState('')
  const [vendedoras, setVendedoras] = useState<Usuario[]>([])
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { iniciar() }, [])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: vends } = await supabase
      .from('usuarios')
      .select('*')
      .eq('rol', 'ventas')
      .eq('activo', true)
      .order('nombre')
    setVendedoras(vends || [])

    const { data: u } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    if (u?.rol === 'ventas') setCobradoPor(user.id)
  }

  const guardar = async () => {
    if (!monto || parseFloat(monto) <= 0) { setError('Ingresá un monto válido'); return }
    if (!cobradoPor) { setError('Indicá quién cobró'); return }
    if (!atendidoPor) { setError('Indicá quién atendió'); return }

    setGuardando(true)
    setError('')

    const { error: err } = await supabase.from('ventas').insert({
      monto: parseFloat(monto),
      cobrado_por: cobradoPor,
      atendido_por: atendidoPor,
      medio_pago: medioPago,
    })

    if (err) { setError('Error al guardar: ' + err.message); setGuardando(false); return }
    router.push('/ventas')
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center gap-3 shadow">
        <button onClick={() => router.push('/ventas')} className="text-blue-200 hover:text-white text-sm">← Volver</button>
        <span className="text-xl font-bold">🛒 Nueva venta</span>
      </header>

      <main className="p-6 max-w-lg mx-auto">
        <div className="bg-white rounded-xl shadow p-6 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($) *</label>
            <input type="number" value={monto} onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 5500" min="0" step="0.01"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Medio de pago *</label>
            <div className="grid grid-cols-2 gap-2">
              {MEDIOS_PAGO.map(m => (
                <button key={m.value} type="button"
                  onClick={() => setMedioPago(m.value)}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cobrado por *</label>
            <select value={cobradoPor} onChange={(e) => setCobradoPor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Seleccioná vendedora</option>
              {vendedoras.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Atendido por *</label>
            <select value={atendidoPor} onChange={(e) => setAtendidoPor(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Seleccioná vendedora</option>
              {vendedoras.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={guardar} disabled={guardando}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Guardar venta'}
          </button>

        </div>
      </main>
    </div>
  )
}
