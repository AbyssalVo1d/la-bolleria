'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ParteProduccion, Usuario } from '@/types'

export default function ProduccionPage() {
  const [partes, setPartes] = useState<ParteProduccion[]>([])
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroEmpleado, setFiltroEmpleado] = useState('')
  const [empleados, setEmpleados] = useState<Usuario[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    iniciar()
  }, [])

  const iniciar = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: u } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    setUsuario(u)

    if (u?.rol === 'admin') {
      const { data: emps } = await supabase.from('usuarios').select('*').eq('rol', 'produccion').eq('activo', true)
      setEmpleados(emps || [])
      cargarPartes(u.rol, user.id, '')
    } else {
      cargarPartes(u?.rol, user.id, '')
    }
  }

  const cargarPartes = async (rol: string, userId: string, empId: string) => {
    setLoading(true)
    let query = supabase
      .from('partes_produccion')
      .select('*, usuarios(nombre), detalle_parte(*)')
      .order('fecha', { ascending: false })
      .order('creado_en', { ascending: false })

    if (rol !== 'admin') {
      query = query.eq('empleado_id', userId)
    } else if (empId) {
      query = query.eq('empleado_id', empId)
    }

    const { data } = await query
    setPartes(data || [])
    setLoading(false)
  }

  const handleFiltro = (empId: string) => {
    setFiltroEmpleado(empId)
    if (usuario) cargarPartes(usuario.rol, usuario.id, empId)
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-green-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-green-200 hover:text-white text-sm">
            ← Volver
          </button>
          <span className="text-xl font-bold">🎂 Producción</span>
        </div>
        <button
          onClick={() => router.push('/produccion/nuevo-parte')}
          className="bg-white text-green-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition"
        >
          + Nuevo parte
        </button>
      </header>

      <main className="p-6 max-w-3xl mx-auto">

        {/* Filtro por empleado (solo admin) */}
        {usuario?.rol === 'admin' && empleados.length > 0 && (
          <div className="mb-4">
            <select
              value={filtroEmpleado}
              onChange={(e) => handleFiltro(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="">Todos los empleados</option>
              {empleados.map(e => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <p className="text-center text-amber-800">Cargando...</p>
        ) : partes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-3">📋</p>
            <p>No hay partes registrados todavía</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partes.map((parte) => (
              <div key={parte.id} className="bg-white rounded-xl shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-800">
                      {parte.fecha} — {parte.turno.charAt(0).toUpperCase() + parte.turno.slice(1)}
                    </p>
                    {usuario?.rol === 'admin' && (
                      <p className="text-sm text-gray-500">{(parte as any).usuarios?.nombre}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    parte.turno === 'mañana' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {parte.turno}
                  </span>
                </div>

                {/* Detalle */}
                {parte.detalle_parte && parte.detalle_parte.length > 0 && (
                  <div className="border-t pt-3 space-y-1">
                    {parte.detalle_parte.map((d: any) => (
                      <div key={d.id} className="flex justify-between text-sm">
                        <span className="text-gray-700">{d.producto}</span>
                        <span className="font-medium text-gray-800">{d.cantidad} {d.unidad}</span>
                      </div>
                    ))}
                  </div>
                )}

                {parte.observaciones && (
                  <p className="text-sm text-gray-500 mt-2 italic">📝 {parte.observaciones}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}