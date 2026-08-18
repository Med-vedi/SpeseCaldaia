const express = require('express')
const router = express.Router()
const pool = require('../lib/db')
const authenticate = require('../middleware/authenticate')
const { userMayAccessOrganization } = require('../lib/orgAccess')

function parseYear(y) {
  const n = parseInt(y, 10)
  if (Number.isNaN(n) || n < 2000 || n > 2100) return null
  return n
}

async function buildYearlyPayload(organizationId, year) {
  const { rows: settingsRows } = await pool.query(
    'SELECT * FROM public.yearly_organization_settings WHERE organization_id = $1 AND year = $2',
    [organizationId, year]
  )
  const settings = settingsRows[0] || null

  const { rows: deliveries } = await pool.query(
    `SELECT * FROM public.gasoil_deliveries
     WHERE organization_id = $1 AND year = $2
     ORDER BY sort_order ASC`,
    [organizationId, year]
  )

  const totalLiters = deliveries.reduce((s, d) => s + Number(d.liters || 0), 0)
  const totalEur = deliveries.reduce((s, d) => s + Number(d.amount_eur || 0), 0)
  const fallback =
    settings?.gasolio_fallback != null && settings.gasolio_fallback !== ''
      ? Number(settings.gasolio_fallback)
      : null
  const gasolioPerLiter =
    totalLiters > 0 ? totalEur / totalLiters : fallback != null && !Number.isNaN(fallback) ? fallback : 0

  return {
    year,
    acqua: settings ? Number(settings.acqua) : 2,
    corrente: settings ? Number(settings.corrente) : 0.14,
    manutenzione: settings ? Number(settings.manutenzione) : 120,
    funzionamento_servizio_pct: settings ? Number(settings.funzionamento_servizio_pct) : 20,
    gasolio_fallback: fallback,
    gasoil_deliveries: deliveries,
    computed: {
      gasolio_per_liter: gasolioPerLiter,
      fattura_gasolio_total: totalEur,
      total_liters: totalLiters,
    },
  }
}

/**
 * GET /api/yearly-financials?organization_id=&year=
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { organization_id, year: yearRaw } = req.query
    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id is required' })
    }
    const year = parseYear(yearRaw || new Date().getFullYear())
    if (!year) {
      return res.status(400).json({ error: 'Invalid year' })
    }
    const ok = await userMayAccessOrganization(req.user.id, organization_id)
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const payload = await buildYearlyPayload(organization_id, year)
    res.json(payload)
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

/**
 * GET /api/yearly-financials/years?organization_id=
 * Returns available years from DB + current year + next year.
 */
router.get('/years', authenticate, async (req, res) => {
  try {
    const { organization_id } = req.query
    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id is required' })
    }
    const ok = await userMayAccessOrganization(req.user.id, organization_id)
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { rows: settingsRows } = await pool.query(
      'SELECT year FROM public.yearly_organization_settings WHERE organization_id = $1',
      [organization_id]
    )
    const { rows: deliveriesRows } = await pool.query(
      'SELECT year FROM public.gasoil_deliveries WHERE organization_id = $1',
      [organization_id]
    )

    const nowYear = new Date().getFullYear()
    const set = new Set([nowYear, nowYear + 1])
    settingsRows.forEach((r) => set.add(Number(r.year)))
    deliveriesRows.forEach((r) => set.add(Number(r.year)))

    const years = Array.from(set)
      .filter((y) => Number.isFinite(y))
      .sort((a, b) => b - a)

    return res.json({ years })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

/**
 * PUT /api/yearly-financials
 * Upsert yearly_organization_settings for one org/year
 * Body: { organization_id, year, acqua?, corrente?, manutenzione?, funzionamento_servizio_pct?, gasolio_fallback? } (null clears fallback)
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const {
      organization_id,
      year: yearRaw,
      acqua,
      corrente,
      manutenzione,
      funzionamento_servizio_pct,
      gasolio_fallback,
    } =
      req.body

    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id is required' })
    }
    const year = parseYear(yearRaw)
    if (!year) {
      return res.status(400).json({ error: 'Invalid year' })
    }
    const ok = await userMayAccessOrganization(req.user.id, organization_id)
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { rows: existingRows } = await pool.query(
      'SELECT * FROM public.yearly_organization_settings WHERE organization_id = $1 AND year = $2',
      [organization_id, year]
    )
    const existing = existingRows[0] || null

    const row = {
      organization_id,
      year,
      acqua: existing ? Number(existing.acqua) : 2,
      corrente: existing ? Number(existing.corrente) : 0.14,
      manutenzione: existing ? Number(existing.manutenzione) : 120,
      funzionamento_servizio_pct: existing ? Number(existing.funzionamento_servizio_pct) : 20,
      gasolio_fallback: existing?.gasolio_fallback != null ? Number(existing.gasolio_fallback) : null,
    }

    if (acqua !== undefined && acqua !== null) {
      const v = parseFloat(acqua)
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ error: 'Invalid acqua' })
      }
      row.acqua = v
    }
    if (corrente !== undefined && corrente !== null) {
      const v = parseFloat(corrente)
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ error: 'Invalid corrente' })
      }
      row.corrente = v
    }
    if (manutenzione !== undefined && manutenzione !== null) {
      const v = parseFloat(manutenzione)
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ error: 'Invalid manutenzione' })
      }
      row.manutenzione = v
    }
    if (funzionamento_servizio_pct !== undefined && funzionamento_servizio_pct !== null) {
      const v = parseFloat(funzionamento_servizio_pct)
      if (Number.isNaN(v) || v < 0 || v > 100) {
        return res.status(400).json({ error: 'Invalid funzionamento_servizio_pct' })
      }
      row.funzionamento_servizio_pct = v
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'gasolio_fallback')) {
      if (gasolio_fallback === null || gasolio_fallback === '') {
        row.gasolio_fallback = null
      } else {
        const v = parseFloat(gasolio_fallback)
        if (Number.isNaN(v) || v < 0) {
          return res.status(400).json({ error: 'Invalid gasolio_fallback' })
        }
        row.gasolio_fallback = v
      }
    }

    await pool.query(
      `INSERT INTO public.yearly_organization_settings
         (organization_id, year, acqua, corrente, manutenzione, funzionamento_servizio_pct, gasolio_fallback)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (organization_id, year) DO UPDATE SET
         acqua = EXCLUDED.acqua,
         corrente = EXCLUDED.corrente,
         manutenzione = EXCLUDED.manutenzione,
         funzionamento_servizio_pct = EXCLUDED.funzionamento_servizio_pct,
         gasolio_fallback = EXCLUDED.gasolio_fallback,
         updated_at = NOW()`,
      [
        row.organization_id,
        row.year,
        row.acqua,
        row.corrente,
        row.manutenzione,
        row.funzionamento_servizio_pct,
        row.gasolio_fallback,
      ]
    )

    const payload = await buildYearlyPayload(organization_id, year)
    res.json(payload)
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

module.exports = router
