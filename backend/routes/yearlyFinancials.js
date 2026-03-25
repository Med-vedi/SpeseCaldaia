const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { getAuthUserFromBearerToken } = require('../lib/authHelpers')
const { userMayAccessOrganization } = require('../lib/orgAccess')

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }
    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await getAuthUserFromBearerToken(token)
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
    req.user = user
    next()
  } catch {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

function parseYear(y) {
  const n = parseInt(y, 10)
  if (Number.isNaN(n) || n < 2000 || n > 2100) return null
  return n
}

async function buildYearlyPayload(organizationId, year) {
  const { data: settings } = await supabase
    .from('yearly_organization_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('year', year)
    .maybeSingle()

  const { data: deliveries, error: delErr } = await supabase
    .from('gasoil_deliveries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('year', year)
    .order('sort_order', { ascending: true })

  if (delErr) {
    throw new Error(delErr.message)
  }

  const totalLiters = (deliveries || []).reduce((s, d) => s + Number(d.liters || 0), 0)
  const totalEur = (deliveries || []).reduce((s, d) => s + Number(d.amount_eur || 0), 0)
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
    gasolio_fallback: fallback,
    gasoil_deliveries: deliveries || [],
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
 * PUT /api/yearly-financials
 * Upsert yearly_organization_settings for one org/year
 * Body: { organization_id, year, acqua?, corrente?, manutenzione?, gasolio_fallback? } (null clears fallback)
 */
router.put('/', authenticate, async (req, res) => {
  try {
    const { organization_id, year: yearRaw, acqua, corrente, manutenzione, gasolio_fallback } =
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

    const { data: existing } = await supabase
      .from('yearly_organization_settings')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('year', year)
      .maybeSingle()

    const row = {
      organization_id,
      year,
      acqua: existing ? Number(existing.acqua) : 2,
      corrente: existing ? Number(existing.corrente) : 0.14,
      manutenzione: existing ? Number(existing.manutenzione) : 120,
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

    const { error: upsertErr } = await supabase.from('yearly_organization_settings').upsert(row, {
      onConflict: 'organization_id,year',
    })
    if (upsertErr) {
      return res.status(500).json({ error: upsertErr.message })
    }

    const payload = await buildYearlyPayload(organization_id, year)
    res.json(payload)
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

module.exports = router
