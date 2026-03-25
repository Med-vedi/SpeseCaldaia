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

async function nextSortOrder(organizationId, year) {
  const { data: maxRow } = await supabase
    .from('gasoil_deliveries')
    .select('sort_order')
    .eq('organization_id', organizationId)
    .eq('year', year)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  return maxRow != null ? Number(maxRow.sort_order) + 1 : 0
}

/**
 * GET /api/gasoil-deliveries?organization_id=&year=
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

    const { data, error } = await supabase
      .from('gasoil_deliveries')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('year', year)
      .order('sort_order', { ascending: true })

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

/**
 * POST /api/gasoil-deliveries
 * Body: { organization_id, year, label?, liters, amount_eur, bill_date?, notes? }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { organization_id, year: yearRaw, label, liters, amount_eur, bill_date, notes } =
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

    const litersNum = liters !== undefined && liters !== null ? parseFloat(liters) : 0
    const eurNum = amount_eur !== undefined && amount_eur !== null ? parseFloat(amount_eur) : 0
    if (Number.isNaN(litersNum) || litersNum < 0) {
      return res.status(400).json({ error: 'Invalid liters' })
    }
    if (Number.isNaN(eurNum) || eurNum < 0) {
      return res.status(400).json({ error: 'Invalid amount_eur' })
    }

    const sort_order = await nextSortOrder(organization_id, year)

    const { data, error } = await supabase
      .from('gasoil_deliveries')
      .insert({
        organization_id,
        year,
        sort_order,
        label: label || null,
        liters: litersNum,
        amount_eur: eurNum,
        bill_date: bill_date || null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    res.status(201).json(data)
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

/**
 * PUT /api/gasoil-deliveries/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { label, liters, amount_eur, bill_date, notes, sort_order } = req.body

    const { data: existing, error: fetchErr } = await supabase
      .from('gasoil_deliveries')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Delivery not found' })
    }

    const ok = await userMayAccessOrganization(req.user.id, existing.organization_id)
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const updates = {}
    if (label !== undefined) updates.label = label || null
    if (liters !== undefined && liters !== null) {
      const v = parseFloat(liters)
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ error: 'Invalid liters' })
      }
      updates.liters = v
    }
    if (amount_eur !== undefined && amount_eur !== null) {
      const v = parseFloat(amount_eur)
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ error: 'Invalid amount_eur' })
      }
      updates.amount_eur = v
    }
    if (bill_date !== undefined) updates.bill_date = bill_date || null
    if (notes !== undefined) updates.notes = notes || null
    if (sort_order !== undefined && sort_order !== null) {
      const v = parseInt(sort_order, 10)
      if (Number.isNaN(v) || v < 0) {
        return res.status(400).json({ error: 'Invalid sort_order' })
      }
      updates.sort_order = v
    }

    const { data, error } = await supabase
      .from('gasoil_deliveries')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

/**
 * DELETE /api/gasoil-deliveries/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const { data: existing, error: fetchErr } = await supabase
      .from('gasoil_deliveries')
      .select('id, organization_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Delivery not found' })
    }

    const ok = await userMayAccessOrganization(req.user.id, existing.organization_id)
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const { error } = await supabase.from('gasoil_deliveries').delete().eq('id', id)
    if (error) {
      return res.status(500).json({ error: error.message })
    }
    res.json({ message: 'Deleted' })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

module.exports = router
