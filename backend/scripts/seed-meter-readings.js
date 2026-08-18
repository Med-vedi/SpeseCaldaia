/**
 * Generates yearly meter readings and upserts counter_values.
 * Syncs demo counters: for each row in public.users (same organization_id), ensures
 * heat + water + electric counters exist; ensures one electric_common per org.
 * Re-run after adding new people (e.g. Dino, Cristian) once their profiles exist.
 *
 * Usage:
 *   cd backend && npm run seed-readings
 *   SEED_ORGANIZATION_ID=default-org npm run seed-readings
 *   SEED_COUNTERS=0 npm run seed-readings   # only upsert readings, do not create counters
 *
 * Env: DATABASE_URL
 */

require('dotenv').config()
const pool = require('../lib/db')

const MIN_YEAR = 2024

const randBetween = (a, b) => a + Math.random() * (b - a)

const roundTo = (n, decimals) => {
  const f = 10 ** decimals
  return Math.round(n * f) / f
}

/** Monotonic series per counter type (cumulative meters go up each year) */
function valuesForCounterType(counterType, yearsAsc) {
  const cfg = {
    heat: { base: [14500, 21500], step: [700, 1500], decimals: 1 },
    water: { base: [95, 210], step: [15, 42], decimals: 0 },
    electric: { base: [4200, 9800], step: [180, 620], decimals: 1 },
    electric_common: { base: [18000, 38000], step: [900, 2400], decimals: 1 },
  }
  const c = cfg[counterType] || cfg.heat
  let v = randBetween(c.base[0], c.base[1])
  const out = []
  for (const year of yearsAsc) {
    out.push({ year, value: roundTo(v, c.decimals) })
    v += randBetween(c.step[0], c.step[1])
  }
  return out
}

/** Stored label = profile username only; table section shows heat/water/kW. */
function residentCounterName(username) {
  return (username || '').trim() || 'Utente'
}

/**
 * For every user in the org: create missing heat / water / electric counters.
 * Create electric_common if the org has none.
 */
async function syncCountersForOrganization(organizationId) {
  if (process.env.SEED_COUNTERS === '0') {
    console.log('SEED_COUNTERS=0 — skipping counter creation.')
    return
  }

  const { rows: users } = await pool.query(
    'SELECT id, username FROM public.users WHERE organization_id = $1',
    [organizationId]
  )

  if (!users.length) {
    console.error(
      `No public.users for organization_id="${organizationId}". Add profiles, then re-run.`
    )
    process.exit(1)
  }

  const { rows: existing } = await pool.query(
    'SELECT user_id, counter_type FROM public.counters WHERE organization_id = $1',
    [organizationId]
  )

  const userHas = (userId, type) =>
    existing.some((c) => c.user_id === userId && c.counter_type === type)

  const inserts = []
  for (const u of users) {
    const label = u.username || u.id.slice(0, 8)
    const displayName = residentCounterName(label)
    if (!userHas(u.id, 'heat')) {
      inserts.push({
        organization_id: organizationId,
        user_id: u.id,
        counter_type: 'heat',
        name: displayName,
      })
    }
    if (!userHas(u.id, 'water')) {
      inserts.push({
        organization_id: organizationId,
        user_id: u.id,
        counter_type: 'water',
        name: displayName,
      })
    }
    if (!userHas(u.id, 'electric')) {
      inserts.push({
        organization_id: organizationId,
        user_id: u.id,
        counter_type: 'electric',
        name: displayName,
      })
    }
  }

  const hasCommon = existing.some((c) => c.counter_type === 'electric_common')
  if (!hasCommon) {
    inserts.push({
      organization_id: organizationId,
      user_id: null,
      counter_type: 'electric_common',
      name: 'Totale',
    })
  }

  if (inserts.length === 0) {
    console.log(
      `Counters already synced for ${users.length} user(s) in "${organizationId}" (incl. common).`
    )
    return
  }

  for (const row of inserts) {
    await pool.query(
      `INSERT INTO public.counters (organization_id, user_id, counter_type, name)
       VALUES ($1, $2, $3, $4)`,
      [row.organization_id, row.user_id, row.counter_type, row.name]
    )
  }
  console.log(
    `Created ${inserts.length} counter row(s) for org "${organizationId}" (${users.length} profil${users.length === 1 ? 'o' : 'i'}).`
  )
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL in backend/.env')
    process.exit(1)
  }

  const organizationId = process.env.SEED_ORGANIZATION_ID || 'default-org'

  const currentYear = new Date().getFullYear()
  const endYear = Math.max(currentYear, MIN_YEAR)
  const yearsAsc = []
  for (let y = MIN_YEAR; y <= endYear; y++) yearsAsc.push(y)

  await syncCountersForOrganization(organizationId)

  const { rows: counters } = await pool.query(
    'SELECT id, name, counter_type, organization_id FROM public.counters WHERE organization_id = $1',
    [organizationId]
  )

  if (!counters.length) {
    console.error('No counters for org after sync.')
    process.exit(1)
  }

  const rows = []
  for (const counter of counters) {
    const series = valuesForCounterType(counter.counter_type, yearsAsc)
    for (const { year, value } of series) {
      rows.push({
        counter_id: counter.id,
        year,
        value,
        notes: 'seed-meter-readings.js',
      })
    }
  }

  for (const row of rows) {
    await pool.query(
      `INSERT INTO public.counter_values (counter_id, year, value, notes)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (counter_id, year) DO UPDATE SET
         value = EXCLUDED.value,
         notes = EXCLUDED.notes`,
      [row.counter_id, row.year, row.value, row.notes]
    )
  }

  console.log(
    `Upserted ${rows.length} readings (${counters.length} counters × ${yearsAsc.length} anni ${MIN_YEAR}–${endYear}) per "${organizationId}".`
  )
}

main()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
