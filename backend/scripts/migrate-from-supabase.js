/**
 * One-time data migration: copies rows from the live Supabase Postgres database
 * (SUPABASE_DB_URL) into the new Neon database (DATABASE_URL), preserving UUIDs.
 * public.users.password_hash is carried over directly from auth.users.encrypted_password
 * (both use bcrypt, so hashes are format-compatible — verified separately with
 * scripts/verify-password-migration.js).
 *
 * Usage: node scripts/migrate-from-supabase.js
 */

require('dotenv').config()
const { Pool } = require('pg')

const source = new Pool({ connectionString: process.env.SUPABASE_DB_URL })
const target = new Pool({ connectionString: process.env.DATABASE_URL })

async function migrateUsers() {
  const { rows: profiles } = await source.query('SELECT * FROM public.users ORDER BY created_at')
  const { rows: authUsers } = await source.query('SELECT id, encrypted_password FROM auth.users')
  const passwordById = new Map(authUsers.map((u) => [u.id, u.encrypted_password]))

  for (const p of profiles) {
    await target.query(
      `INSERT INTO public.users
         (id, username, organization_id, role, email, password_hash, user_key, type, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        p.id,
        p.username,
        p.organization_id,
        p.role,
        p.email,
        passwordById.get(p.id) || null,
        p.user_key,
        p.type,
        p.created_at,
        p.updated_at,
      ]
    )
  }
  console.log(`Migrated ${profiles.length} users.`)
}

async function migrateCounters() {
  const { rows } = await source.query('SELECT * FROM public.counters ORDER BY created_at')
  for (const c of rows) {
    await target.query(
      `INSERT INTO public.counters
         (id, organization_id, user_id, counter_type, name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [c.id, c.organization_id, c.user_id, c.counter_type, c.name, c.created_at, c.updated_at]
    )
  }
  console.log(`Migrated ${rows.length} counters.`)
}

async function migrateCounterValues() {
  const { rows } = await source.query('SELECT * FROM public.counter_values ORDER BY created_at')
  for (const cv of rows) {
    await target.query(
      `INSERT INTO public.counter_values
         (id, counter_id, year, value, reading_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        cv.id,
        cv.counter_id,
        cv.year,
        cv.value,
        cv.reading_date,
        cv.notes,
        cv.created_at,
        cv.updated_at,
      ]
    )
  }
  console.log(`Migrated ${rows.length} counter values.`)
}

async function migrateYearlySettings() {
  const { rows } = await source.query('SELECT * FROM public.yearly_organization_settings')
  for (const s of rows) {
    await target.query(
      `INSERT INTO public.yearly_organization_settings
         (organization_id, year, acqua, corrente, manutenzione, gasolio_fallback, funzionamento_servizio_pct, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        s.organization_id,
        s.year,
        s.acqua,
        s.corrente,
        s.manutenzione,
        s.gasolio_fallback,
        s.funzionamento_servizio_pct,
        s.created_at,
        s.updated_at,
      ]
    )
  }
  console.log(`Migrated ${rows.length} yearly settings rows.`)
}

async function migrateGasoilDeliveries() {
  const { rows } = await source.query('SELECT * FROM public.gasoil_deliveries ORDER BY created_at')
  for (const d of rows) {
    await target.query(
      `INSERT INTO public.gasoil_deliveries
         (id, organization_id, year, sort_order, label, liters, amount_eur, bill_date, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        d.id,
        d.organization_id,
        d.year,
        d.sort_order,
        d.label,
        d.liters,
        d.amount_eur,
        d.bill_date,
        d.notes,
        d.created_at,
        d.updated_at,
      ]
    )
  }
  console.log(`Migrated ${rows.length} gasoil deliveries.`)
}

async function main() {
  // Order matters: users before counters (FK), counters before counter_values (FK).
  await migrateUsers()
  await migrateCounters()
  await migrateCounterValues()
  await migrateYearlySettings()
  await migrateGasoilDeliveries()
}

main()
  .then(() => Promise.all([source.end(), target.end()]))
  .catch(async (e) => {
    console.error(e)
    await Promise.all([source.end(), target.end()])
    process.exit(1)
  })
