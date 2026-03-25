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
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

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
async function syncCountersForOrganization(supabase, organizationId) {
  if (process.env.SEED_COUNTERS === '0') {
    console.log('SEED_COUNTERS=0 — skipping counter creation.')
    return
  }

  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, username')
    .eq('organization_id', organizationId)

  if (uErr) {
    console.error('Could not load public.users:', uErr.message)
    process.exit(1)
  }
  if (!users?.length) {
    console.error(
      `No public.users for organization_id="${organizationId}". Add profiles (auth + public.users), then re-run.`
    )
    process.exit(1)
  }

  const { data: existing, error: cErr } = await supabase
    .from('counters')
    .select('user_id, counter_type')
    .eq('organization_id', organizationId)

  if (cErr) {
    console.error('Could not load counters:', cErr.message)
    process.exit(1)
  }

  const list = existing || []

  const userHas = (userId, type) =>
    list.some((c) => c.user_id === userId && c.counter_type === type)

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

  const hasCommon = list.some((c) => c.counter_type === 'electric_common')
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

  const { error: iErr } = await supabase.from('counters').insert(inserts)
  if (iErr) {
    console.error('Failed to insert counters:', iErr.message)
    process.exit(1)
  }
  console.log(
    `Created ${inserts.length} counter row(s) for org "${organizationId}" (${users.length} profil${users.length === 1 ? 'o' : 'i'}).`
  )
}

async function main() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const organizationId = process.env.SEED_ORGANIZATION_ID || 'default-org'

  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env')
    process.exit(1)
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const currentYear = new Date().getFullYear()
  const endYear = Math.max(currentYear, MIN_YEAR)
  const yearsAsc = []
  for (let y = MIN_YEAR; y <= endYear; y++) yearsAsc.push(y)

  await syncCountersForOrganization(supabase, organizationId)

  const { data: counters, error: cErr } = await supabase
    .from('counters')
    .select('id, name, counter_type, organization_id')
    .eq('organization_id', organizationId)

  if (cErr) {
    console.error('Failed to load counters:', cErr.message)
    process.exit(1)
  }
  if (!counters?.length) {
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

  const { error: uErr } = await supabase.from('counter_values').upsert(rows, {
    onConflict: 'counter_id,year',
    ignoreDuplicates: false,
  })

  if (uErr) {
    console.error('Upsert failed:', uErr.message)
    process.exit(1)
  }

  console.log(
    `Upserted ${rows.length} readings (${counters.length} counters × ${yearsAsc.length} anni ${MIN_YEAR}–${endYear}) per "${organizationId}".`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
