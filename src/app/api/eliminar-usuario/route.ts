import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { id } = await request.json()

  if (!id) {
    return NextResponse.json({ error: 'Falta el id' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Eliminar de la tabla usuarios
  await supabaseAdmin.from('usuarios').delete().eq('id', id)

  // 2. Eliminar de Auth
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}