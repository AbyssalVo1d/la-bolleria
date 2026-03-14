'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Producto {
  id: number
  nombre: string
  categoria: string
  precio: number | null
  unidad: string
  activo: boolean
}

type Vista = 'lista' | 'nuevo' | 'editar'

const UNIDADES = ['unidad', 'docena', 'kg']

const CATEGORIAS_FIJAS = [
  'Viennoiserie', 'Budines', 'Porciones', 'Alfajores', 'Cookies',
  'Masas Finas', 'Tortas', 'Postres y Tartas', 'Hojaldre',
  'Facturas de Manteca', 'Panes', 'Bizcochos y Chipá', 'Café al Paso',
]

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function CatalogoPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [vista, setVista] = useState<Vista>('lista')
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)

  // Formulario
  const [editando, setEditando] = useState<Producto | null>(null)
  const [fNombre, setFNombre] = useState('')
  const [fCategoriaSelect, setFCategoriaSelect] = useState('')
  const [fCategoriaOtra, setFCategoriaOtra] = useState('')
  const [fPrecio, setFPrecio] = useState('')
  const [fUnidad, setFUnidad] = useState('unidad')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { verificarAcceso() }, [])

  const verificarAcceso = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: u } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    if (!u || (u.rol !== 'admin' && u.rol !== 'ventas')) { router.push('/dashboard'); return }
    cargarProductos()
  }

  const cargarProductos = async () => {
    setLoading(true)
    const { data } = await supabase.from('productos').select('*').order('categoria').order('nombre')
    setProductos(data || [])
    setLoading(false)
  }

  const categoriaActual = fCategoriaSelect === '__otra__' ? fCategoriaOtra : fCategoriaSelect

  const abrirNuevo = () => {
    setEditando(null)
    setFNombre('')
    setFCategoriaSelect('')
    setFCategoriaOtra('')
    setFPrecio('')
    setFUnidad('unidad')
    setError('')
    setVista('nuevo')
  }

  const abrirEditar = (p: Producto) => {
    setEditando(p)
    setFNombre(p.nombre)
    const esFija = CATEGORIAS_FIJAS.includes(p.categoria)
    setFCategoriaSelect(esFija ? p.categoria : '__otra__')
    setFCategoriaOtra(esFija ? '' : p.categoria)
    setFPrecio(p.precio != null ? String(p.precio) : '')
    setFUnidad(p.unidad)
    setError('')
    setVista('editar')
  }

  const guardar = async () => {
    if (!fNombre.trim()) { setError('El nombre es obligatorio'); return }
    if (!categoriaActual.trim()) { setError('La categoría es obligatoria'); return }

    setGuardando(true)
    setError('')
    const payload = {
      nombre: fNombre.trim(),
      categoria: categoriaActual.trim(),
      precio: fPrecio !== '' ? parseFloat(fPrecio.replace(',', '.')) : null,
      unidad: fUnidad,
    }

    if (editando) {
      const { error: e } = await supabase.from('productos').update(payload).eq('id', editando.id)
      if (e) { setError('Error: ' + e.message); setGuardando(false); return }
    } else {
      const { error: e } = await supabase.from('productos').insert(payload)
      if (e) { setError('Error: ' + e.message); setGuardando(false); return }
    }

    await cargarProductos()
    setVista('lista')
    setGuardando(false)
  }

  const toggleActivo = async (p: Producto) => {
    await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id)
    setProductos(prev => prev.map(x => x.id === p.id ? { ...x, activo: !p.activo } : x))
  }

  const productosFiltrados = productos.filter(p => {
    if (soloActivos && !p.activo) return false
    if (busqueda) {
      const q = normalizar(busqueda)
      if (!normalizar(p.nombre).includes(q) && !normalizar(p.categoria).includes(q)) return false
    }
    return true
  })

  const categorias = [...new Set(productosFiltrados.map(p => p.categoria))]

  if (vista === 'nuevo' || vista === 'editar') {
    return (
      <div className="min-h-screen bg-amber-50">
        <header className="bg-amber-700 text-white px-6 py-4 flex items-center gap-3 shadow">
          <button onClick={() => setVista('lista')} className="text-amber-200 hover:text-white text-sm">← Volver</button>
          <span className="text-xl font-bold">
            {vista === 'nuevo' ? '➕ Nuevo producto' : '✏️ Editar producto'}
          </span>
        </header>
        <main className="p-6 max-w-lg mx-auto">
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input
                value={fNombre}
                onChange={e => setFNombre(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Ej: Croissant Simple"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select
                value={fCategoriaSelect}
                onChange={e => setFCategoriaSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">Seleccioná una categoría</option>
                {CATEGORIAS_FIJAS.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__otra__">Otra...</option>
              </select>
              {fCategoriaSelect === '__otra__' && (
                <input
                  value={fCategoriaOtra}
                  onChange={e => setFCategoriaOtra(e.target.value)}
                  placeholder="Escribí la nueva categoría"
                  className="mt-2 w-full border border-amber-400 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (opcional)</label>
                <input
                  value={fPrecio}
                  onChange={e => setFPrecio(e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
                <select
                  value={fUnidad}
                  onChange={e => setFUnidad(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={guardar}
              disabled={guardando}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear producto'}
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-amber-200 hover:text-white text-sm">← Volver</button>
          <span className="text-xl font-bold">📋 Catálogo</span>
        </div>
        <button onClick={abrirNuevo} className="bg-white text-amber-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-50 transition">
          + Nuevo producto
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow px-5 py-4 flex flex-col sm:flex-row gap-3">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar producto o categoría..."
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={soloActivos}
              onChange={e => setSoloActivos(e.target.checked)}
              className="w-4 h-4"
            />
            Solo activos
          </label>
        </div>

        <p className="text-xs text-gray-500 px-1">
          {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} · {categorias.length} categoría{categorias.length !== 1 ? 's' : ''}
        </p>

        {loading ? (
          <p className="text-center text-amber-800 py-8">Cargando...</p>
        ) : categorias.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p>No hay productos</p>
          </div>
        ) : (
          categorias.map(cat => (
            <div key={cat} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="bg-amber-100 px-5 py-2">
                <p className="font-bold text-amber-800 text-sm uppercase tracking-wide">{cat}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {productosFiltrados.filter(p => p.categoria === cat).map(p => (
                  <div key={p.id} className={`flex items-center justify-between px-5 py-3 ${!p.activo ? 'opacity-50' : ''}`}>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {p.unidad}
                        {p.precio != null && ` · $${Number(p.precio).toLocaleString('es-AR')}`}
                        {!p.activo && ' · inactivo'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(p)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium px-2 py-1 rounded hover:bg-amber-50"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => toggleActivo(p)}
                        className={`text-xs font-medium px-2 py-1 rounded transition ${
                          p.activo
                            ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                            : 'text-green-500 hover:text-green-700 hover:bg-green-50'
                        }`}
                      >
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}
