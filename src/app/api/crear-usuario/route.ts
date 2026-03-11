import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { nombre, email, password, rol } = await request.json()

  if (!nombre || !email || !password || !rol) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
  }

  // Cliente con service role key (solo en el servidor)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Crear en Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || 'Error al crear usuario' }, { status: 400 })
  }

  // 2. Insertar en tabla usuarios
  const { error: dbError } = await supabaseAdmin.from('usuarios').insert({
    id: authData.user.id,
    nombre,
    email,
    rol,
    activo: true,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
```

**3. Agregá la variable de entorno en `.env.local`:**
```
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key