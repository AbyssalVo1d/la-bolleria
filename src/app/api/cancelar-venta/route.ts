import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { ventaId, userId } = await request.json()

  if (!ventaId) {
    return NextResponse.json({ error: 'Falta ventaId' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin
    .from('ventas')
    .update({
      cancelada: true,
      cancelada_por: userId || null,
      cancelada_en: new Date().toISOString(),
    })
    .eq('id', ventaId)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
