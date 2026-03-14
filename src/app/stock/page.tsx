'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Insumo, MovimientoStock, Usuario } from '@/types'

type Vista = 'stock' | 'historial' | 'nuevo-insumo' | 'editar-insumo'

export default function StockPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [movimientos, setMovimientos] = useState<MovimientoStock[]>([])
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [vista, setVista] = useState<Vista>('stock')

  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState<Insumo['unidad']>('kg')
  const [stockMinimo, setStockMinimo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const [insumoEditando, setInsumoEditando] = useState<Insumo | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  const [unidadEdit, setUnidadEdit] = useState<Insumo['unidad']>('kg')
  const [stockMinimoEdit, setStockMinimoEdit] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    iniciar()
  }, [])

  useEffect(() => {
    if (vista === 'historial') cargarHistorial()
  }, [vista])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)
    await cargarInsumos()
  }

  const cargarInsumos = async () => {
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .eq('activo', true)
      .order('nombre')
    setInsumos(data || [])
    setLoading(false)
  }

  const cargarHistorial = async () => {
    setLoadingHistorial(true)
    const { data } = await supabase
      .from('movimientos_stock')
      .select('*, insumos(nombre, unidad), usuarios(nombre)')
      .order('creado_en', { ascending: false })
      .limit(500)
    setMovimientos(data || [])
    setLoadingHistorial(false)
  }

  const crearInsumo = async () => {
    if (!nombre || !stockMinimo) {
      setError('Completá nombre y stock mínimo')
      return
    }
    setGuardando(true)
    setError('')
    setExito('')

    const { error: err } = await supabase.from('insumos').insert({
      nombre: nombre.trim(),
      unidad,
      stock_minimo: parseFloat(stockMinimo),
      stock_actual: 0,
      activo: true,
    })

    if (err) {
      setError('Error al crear: ' + err.message)
      setGuardando(false)
      return
    }

    setExito(`Insumo "${nombre}" creado correctamente`)
    setNombre('')
    setStockMinimo('')
    setUnidad('kg')
    setGuardando(false)
    await cargarInsumos()
  }

  const abrirEditar = (insumo: Insumo) => {
    setInsumoEditando(insumo)
    setNombreEdit(insumo.nombre)
    setUnidadEdit(insumo.unidad)
    setStockMinimoEdit(String(insumo.stock_minimo))
    setError('')
    setExito('')
    setVista('editar-insumo')
  }

  const guardarEdicion = async () => {
    if (!nombreEdit || !stockMinimoEdit) {
      setError('Completá nombre y stock mínimo')
      return
    }
    setGuardandoEdit(true)
    setError('')

    const { error: err } = await supabase.from('insumos').update({
      nombre: nombreEdit.trim(),
      unidad: unidadEdit,
      stock_minimo: parseFloat(stockMinimoEdit),
    }).eq('id', insumoEditando!.id)

    if (err) {
      setError('Error al guardar: ' + err.message)
      setGuardandoEdit(false)
      return
    }

    setExito(`Insumo actualizado correctamente`)
    setGuardandoEdit(false)
    setInsumoEditando(null)
    setVista('stock')
    await cargarInsumos()
  }

  const insumosFiltrados = insumos.filter(i =>
    i.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const getEstadoStock = (insumo: Insumo) => {
    if (insumo.stock_actual <= insumo.stock_minimo) return 'critico'
    if (insumo.stock_actual <= insumo.stock_minimo * 1.5) return 'bajo'
    return 'ok'
  }

  const alertas = insumos.filter(i => getEstadoStock(i) === 'critico')

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-amber-200 hover:text-white text-sm">
            ← Volver
          </button>
          <span className="text-xl font-bold">📦 Stock</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/stock/nueva-entrada')}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold px-3 py-2 rounded-lg text-sm transition"
          >
            + Entrada
          </button>
          <button
            onClick={() => router.push('/stock/nueva-salida')}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-2 rounded-lg text-sm transition"
          >
            − Salida
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-1 max-w-4xl mx-auto">
          <button
            onClick={() => setVista('stock')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              vista === 'stock'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📦 Inventario
          </button>
          <button
            onClick={() => { setVista('historial') }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              vista === 'historial'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📋 Historial
          </button>
          {(usuario?.rol === 'admin' || usuario?.rol === 'produccion') && (
          <button
            onClick={() => { setVista('nuevo-insumo'); setError(''); setExito('') }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
              vista === 'nuevo-insumo'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ➕ Nuevo producto
          </button>
          )}
        </div>
      </div>

      <main className="p-6 max-w-4xl mx-auto">

        {/* VISTA: INVENTARIO */}
        {vista === 'stock' && (
          <>
            {alertas.length > 0 && (
              <div className="bg-red-50 border border-red-300 rounded-xl p-4 mb-6">
                <p className="font-bold text-red-700 mb-2">🔔 Insumos por agotarse:</p>
                <div className="flex flex-wrap gap-2">
                  {alertas.map(a => (
                    <span key={a.id} className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full">
                      {a.nombre} — {a.stock_actual} {a.unidad}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar insumo..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 mb-4 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            {loading ? (
              <p className="text-center text-amber-800">Cargando...</p>
            ) : insumosFiltrados.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">📦</p>
                <p>No hay insumos cargados todavía</p>
                <button
                  onClick={() => setVista('nuevo-insumo')}
                  className="mt-3 text-amber-600 hover:text-amber-700 font-medium text-sm underline"
                >
                  Agregar el primer insumo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insumosFiltrados.map((insumo) => {
                  const estado = getEstadoStock(insumo)
                  return (
                    <div
                      key={insumo.id}
                      className={`bg-white rounded-xl shadow px-5 py-4 border-l-4 ${
                        estado === 'critico' ? 'border-red-500' :
                        estado === 'bajo' ? 'border-yellow-400' :
                        'border-green-400'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-800">{insumo.nombre}</p>
                          <p className="text-sm text-gray-500">Mínimo: {insumo.stock_minimo} {insumo.unidad}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="text-right">
                            <p className={`text-xl font-bold ${
                              estado === 'critico' ? 'text-red-600' :
                              estado === 'bajo' ? 'text-yellow-600' :
                              'text-green-600'
                            }`}>
                              {insumo.stock_actual}
                            </p>
                            <p className="text-sm text-gray-500">{insumo.unidad}</p>
                          </div>
                          {(usuario?.rol === 'admin' || usuario?.rol === 'produccion') && (
                            <button
                              onClick={() => abrirEditar(insumo)}
                              className="text-gray-400 hover:text-amber-600 transition text-lg leading-none mt-0.5"
                              title="Editar insumo"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </div>
                      {estado === 'critico' && (
                        <p className="text-xs text-red-600 mt-2 font-medium">⚠️ Stock crítico</p>
                      )}
                      {estado === 'bajo' && (
                        <p className="text-xs text-yellow-600 mt-2 font-medium">⚠️ Stock bajo</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* VISTA: HISTORIAL */}
        {vista === 'historial' && (
          <>
            <h2 className="font-bold text-gray-800 text-lg mb-4">Historial de movimientos</h2>
            {loadingHistorial ? (
              <p className="text-center text-amber-800">Cargando historial...</p>
            ) : movimientos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-4xl mb-3">📋</p>
                <p>No hay movimientos registrados todavía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {movimientos.map((m) => {
                  const esEntrada = m.tipo === 'entrada'
                  const insumo = (m as any).insumos
                  const usuarioMov = (m as any).usuarios
                  const fecha = new Date(m.creado_en)
                  const TZ = 'America/Argentina/Buenos_Aires'
                  const fechaStr = fecha.toLocaleDateString('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
                  const horaStr = fecha.toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={m.id} className={`bg-white rounded-xl shadow px-5 py-4 border-l-4 ${
                      esEntrada ? 'border-green-400' : 'border-red-400'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <span className="text-xl mt-0.5">{esEntrada ? '📥' : '📤'}</span>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {insumo?.nombre || 'Insumo eliminado'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {m.motivo.replace(/_/g, ' ')}
                              {m.detalle ? ` — ${m.detalle}` : ''}
                            </p>
                            {(m as any).entregado_a && (
                              <p className="text-xs text-gray-400">
                                {m.tipo === 'entrada' ? '📦 Recibido por' : '📤 Retirado por'}: {(m as any).entregado_a}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-400">👤 {usuarioMov?.nombre || 'Desconocido'}</span>
                              <span className="text-xs text-gray-300">•</span>
                              <span className="text-xs text-gray-400">{fechaStr} {horaStr}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className={`text-lg font-bold ${esEntrada ? 'text-green-600' : 'text-red-600'}`}>
                            {esEntrada ? '+' : '-'}{m.cantidad}
                          </p>
                          <p className="text-xs text-gray-500">{insumo?.unidad || ''}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* VISTA: NUEVO INSUMO */}
        {vista === 'nuevo-insumo' && (
          <>
            <h2 className="font-bold text-gray-800 text-lg mb-4">Agregar nuevo producto/insumo</h2>

            {exito && (
              <div className="bg-green-100 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4">
                ✅ {exito}
              </div>
            )}

            <div className="bg-white rounded-xl shadow p-6 space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del insumo/producto *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Harina 000, Manteca, Azúcar..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de medida *
                  </label>
                  <select
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value as Insumo['unidad'])}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="lt">Litros (lt)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="unidad">Unidad</option>
                    <option value="docena">Docena</option>
                    <option value="atado">Atado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo *
                  </label>
                  <input
                    type="number"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(e.target.value)}
                    placeholder="Ej: 5"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              <div className="bg-amber-50 rounded-lg px-4 py-3 text-sm text-amber-700">
                💡 El stock inicial queda en <strong>0</strong>. Después usá "Entrada" para cargar el stock real.
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={crearInsumo}
                disabled={guardando || !nombre || !stockMinimo}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {guardando ? 'Creando...' : 'Crear insumo'}
              </button>
            </div>
          </>
        )}

        {/* VISTA: EDITAR INSUMO */}
        {vista === 'editar-insumo' && insumoEditando && (
          <>
            <h2 className="font-bold text-gray-800 text-lg mb-4">Editar insumo</h2>

            <div className="bg-white rounded-xl shadow p-6 space-y-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del insumo/producto *
                </label>
                <input
                  type="text"
                  value={nombreEdit}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidad de medida *
                  </label>
                  <select
                    value={unidadEdit}
                    onChange={(e) => setUnidadEdit(e.target.value as Insumo['unidad'])}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    <option value="kg">Kilogramos (kg)</option>
                    <option value="g">Gramos (g)</option>
                    <option value="lt">Litros (lt)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="unidad">Unidad</option>
                    <option value="docena">Docena</option>
                    <option value="atado">Atado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock mínimo *
                  </label>
                  <input
                    type="number"
                    value={stockMinimoEdit}
                    onChange={(e) => setStockMinimoEdit(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={guardarEdicion}
                  disabled={guardandoEdit || !nombreEdit || !stockMinimoEdit}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
                >
                  {guardandoEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  onClick={() => { setVista('stock'); setInsumoEditando(null) }}
                  className="flex-1 bg-white border border-gray-300 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </>
        )}

      </main>
    </div>
  )
}