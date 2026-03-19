/**
 * Migración: agrega columnas para cancelación y múltiples medios de pago
 *
 * Requiere tu token personal de Supabase:
 *   https://supabase.com/dashboard/account/tokens
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=tu-token node scripts/migrar.mjs
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PROJECT_REF = 'ureynmbkizzdbtmtmehk'

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ Falta SUPABASE_ACCESS_TOKEN')
  console.error('   Obtené tu token en: https://supabase.com/dashboard/account/tokens')
  console.error('   Luego ejecutá: SUPABASE_ACCESS_TOKEN=tu-token node scripts/migrar.mjs')
  process.exit(1)
}

const sql = `
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cancelada boolean DEFAULT false;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cancelada_por uuid;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS cancelada_en timestamptz;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS medios_pago jsonb;
`

console.log('🔄 Ejecutando migración...')

const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const data = await res.json()

if (!res.ok) {
  console.error('❌ Error en la migración:')
  console.error(JSON.stringify(data, null, 2))
  process.exit(1)
}

console.log('✅ Migración completada.')
console.log('   Columnas agregadas a ventas: cancelada, cancelada_por, cancelada_en, medios_pago')
