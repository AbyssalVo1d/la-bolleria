export type Rol = 'admin' | 'produccion' | 'ventas'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  creado_en: string
}

export interface Insumo {
  id: number
  nombre: string
  unidad: 'kg' | 'g' | 'lt' | 'ml' | 'unidad' | 'docena' | 'atado'
  stock_actual: number
  stock_minimo: number
  activo: boolean
  creado_en: string
}

export interface MovimientoStock {
  id: number
  insumo_id: number
  tipo: 'entrada' | 'salida'
  cantidad: number
  motivo: string
  detalle?: string
  usuario_id: string
  fecha: string
  creado_en: string
  insumos?: Insumo
  usuarios?: Usuario
}

export interface ParteProduccion {
  id: number
  empleado_id: string
  fecha: string
  turno: 'mañana' | 'tarde'
  observaciones?: string
  creado_en: string
  usuarios?: Usuario
  detalle_parte?: DetalleParte[]
}

export interface DetalleParte {
  id: number
  parte_id: number
  producto: string
  cantidad: number
  unidad: string
}

export interface CierreTurno {
  id: number
  vendedora_id: string
  fecha: string
  turno: 'mañana' | 'tarde' | 'noche'
  total_ventas: number
  cantidad_tickets: number
  observaciones?: string
  creado_en: string
  usuarios?: Usuario
}