'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Usuario } from '@/types'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [rol, setRol] = useState<'produccion' | 'ventas'>('produccion')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmEliminar, setConfirmEliminar] = useState<string | null>(null)
  const [cambiarPassId, setCambiarPassId] = useState<string | null>(null)
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [mostrarNuevaPass, setMostrarNuevaPass] = useState(false)
  const [guardandoPass, setGuardandoPass] = useState(false)
  const [cambiarRolId, setCambiarRolId] = useState<string | null>(null)
  const [nuevoRol, setNuevoRol] = useState<'produccion' | 'ventas' | 'admin'>('produccion')
  const [guardandoRol, setGuardandoRol] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    verificarAdmin()
    cargarUsuarios()
  }, [])

  const verificarAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data } = await supabase.from('usuarios').select('rol').eq('id', user.id).single()
    if (data?.rol !== 'admin') router.push('/dashboard')
  }

  const cargarUsuarios = async () => {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre')
    setUsuarios(data || [])
    setLoading(false)
  }

  const crearUsuario = async () => {
    setGuardando(true)
    setError('')
    setExito('')

    const res = await fetch('/api/crear-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, password, rol }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError('Error: ' + data.error)
      setGuardando(false)
      return
    }

    setExito(`Usuario ${nombre} creado correctamente`)
    setNombre('')
    setEmail('')
    setPassword('')
    setRol('produccion')
    setMostrarForm(false)
    cargarUsuarios()
    setGuardando(false)
  }

  const toggleActivo = async (usuario: Usuario) => {
    await supabase
      .from('usuarios')
      .update({ activo: !usuario.activo })
      .eq('id', usuario.id)
    cargarUsuarios()
  }

  const eliminarUsuario = async (id: string) => {
    const res = await fetch('/api/eliminar-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError('Error al eliminar: ' + data.error)
      return
    }

    setConfirmEliminar(null)
    cargarUsuarios()
  }

  const cambiarPassword = async (id: string) => {
    if (!nuevaPassword || nuevaPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setGuardandoPass(true)
    setError('')

    const res = await fetch('/api/cambiar-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, password: nuevaPassword }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError('Error: ' + data.error)
      setGuardandoPass(false)
      return
    }

    setExito('Contraseña actualizada correctamente')
    setCambiarPassId(null)
    setNuevaPassword('')
    setGuardandoPass(false)
  }

  const cambiarRol = async (id: string) => {
    setGuardandoRol(true)
    setError('')
    const { error: err } = await supabase
      .from('usuarios')
      .update({ rol: nuevoRol })
      .eq('id', id)
    if (err) {
      setError('Error al cambiar rol: ' + err.message)
    } else {
      setExito('Rol actualizado correctamente')
      setCambiarRolId(null)
      cargarUsuarios()
    }
    setGuardandoRol(false)
  }

  const rolColor = (rol: string) => {
    if (rol === 'admin') return 'bg-purple-100 text-purple-700'
    if (rol === 'produccion') return 'bg-green-100 text-green-700'
    return 'bg-blue-100 text-blue-700'
  }

  const rolNombre = (rol: string) => {
    if (rol === 'admin') return 'Administrador'
    if (rol === 'produccion') return 'Producción'
    return 'Ventas'
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-amber-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-amber-200 hover:text-white text-sm">
            ← Volver
          </button>
          <span className="text-xl font-bold">👥 Usuarios</span>
        </div>
        <button
          onClick={() => { setMostrarForm(!mostrarForm); setError(''); setExito('') }}
          className="bg-white text-amber-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-amber-50 transition"
        >
          {mostrarForm ? 'Cancelar' : '+ Nuevo usuario'}
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto">

        {exito && (
          <div className="bg-green-100 border border-green-300 text-green-700 rounded-lg px-4 py-3 mb-4">
            ✅ {exito}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 rounded-lg px-4 py-3 mb-4">
            ❌ {error}
          </div>
        )}

        {mostrarForm && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h2 className="font-bold text-gray-800 mb-4">Nuevo usuario</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Carlos Gómez"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (usuario de acceso)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: carlos@labolleria.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <input
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    {mostrarPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as 'produccion' | 'ventas')}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="produccion">Producción</option>
                  <option value="ventas">Ventas</option>
                </select>
              </div>

              <button
                onClick={crearUsuario}
                disabled={guardando || !nombre || !email || !password}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
              >
                {guardando ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center text-amber-800">Cargando...</p>
        ) : (
          <div className="space-y-3">
            {usuarios.map((u) => (
              <div key={u.id}>
                <div className={`bg-white rounded-xl shadow p-4 ${!u.activo ? 'opacity-50' : ''}`}>

                  {/* Info del usuario */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-800">{u.nombre}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${rolColor(u.rol)}`}>
                        {rolNombre(u.rol)}
                      </span>
                    </div>
                    <span className={`text-xs font-medium ${u.activo ? 'text-green-600' : 'text-gray-400'}`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* Botones — solo para no admin */}
                  {u.rol !== 'admin' && (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => toggleActivo(u)}
                        className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition ${
                          u.activo
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                        }`}
                      >
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        onClick={() => {
                          setCambiarRolId(cambiarRolId === u.id ? null : u.id)
                          setNuevoRol(u.rol as 'produccion' | 'ventas' | 'admin')
                          setCambiarPassId(null)
                          setConfirmEliminar(null)
                        }}
                        className={`px-3 text-sm font-medium py-1.5 rounded-lg transition ${
                          cambiarRolId === u.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        }`}
                        title="Cambiar rol"
                      >
                        🎭
                      </button>
                      <button
                        onClick={() => {
                          setCambiarPassId(cambiarPassId === u.id ? null : u.id)
                          setNuevaPassword('')
                          setCambiarRolId(null)
                          setConfirmEliminar(null)
                        }}
                        className={`px-3 text-sm font-medium py-1.5 rounded-lg transition ${
                          cambiarPassId === u.id
                            ? 'bg-amber-500 text-white'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        }`}
                      >
                        🔑
                      </button>
                      <button
                        onClick={() => {
                          setConfirmEliminar(u.id)
                          setCambiarPassId(null)
                          setCambiarRolId(null)
                        }}
                        className="px-3 text-sm font-medium py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-600 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {/* Cambiar rol */}
                {cambiarRolId === u.id && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-4 mt-1">
                    <p className="text-sm text-purple-700 font-medium mb-3">
                      Cambiar rol de <strong>{u.nombre}</strong>
                    </p>
                    <select
                      value={nuevoRol}
                      onChange={(e) => setNuevoRol(e.target.value as 'produccion' | 'ventas' | 'admin')}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 mb-3"
                    >
                      <option value="produccion">Producción</option>
                      <option value="ventas">Ventas</option>
                      <option value="admin">Administrador</option>
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => cambiarRol(u.id)}
                        disabled={guardandoRol || nuevoRol === u.rol}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {guardandoRol ? 'Guardando...' : 'Guardar rol'}
                      </button>
                      <button
                        onClick={() => setCambiarRolId(null)}
                        className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Cambiar contraseña */}
                {cambiarPassId === u.id && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 mt-1">
                    <p className="text-sm text-amber-700 font-medium mb-3">
                      Nueva contraseña para <strong>{u.nombre}</strong>
                    </p>
                    <div className="relative mb-3">
                      <input
                        type={mostrarNuevaPass ? 'text' : 'password'}
                        value={nuevaPassword}
                        onChange={(e) => setNuevaPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-12 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarNuevaPass(!mostrarNuevaPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        {mostrarNuevaPass ? '🙈' : '👁️'}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => cambiarPassword(u.id)}
                        disabled={guardandoPass}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-50"
                      >
                        {guardandoPass ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => { setCambiarPassId(null); setNuevaPassword('') }}
                        className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirmación eliminar */}
                {confirmEliminar === u.id && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 mt-1">
                    <p className="text-sm text-red-700 font-medium mb-3">
                      ¿Seguro que querés eliminar a <strong>{u.nombre}</strong>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => eliminarUsuario(u.id)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg transition"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setConfirmEliminar(null)}
                        className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm py-2 rounded-lg hover:bg-gray-50 transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}