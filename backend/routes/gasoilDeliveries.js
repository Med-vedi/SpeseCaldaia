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

async function nextSortOrder(organizationId, year) {
  const { rows } = await pool.query(
    `SELECT sort_order FROM public.gasoil_deliveries
     WHERE organization_id = $1 AND year = $2
     ORDER BY sort_order DESC LIMIT 1`,
    [organizationId, year]
  )
  return rows[0] ? Number(rows[0].sort_order) + 1 : 0
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

    const { rows } = await pool.query(
      `SELECT * FROM public.gasoil_deliveries
       WHERE organization_id = $1 AND year = $2
       ORDER BY sort_order ASC`,
      [organization_id, year]
    )
    res.json(rows)
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

    const { rows } = await pool.query(
      `INSERT INTO public.gasoil_deliveries
         (organization_id, year, sort_order, label, liters, amount_eur, bill_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        organization_id,
        year,
        sort_order,
        label || null,
        litersNum,
        eurNum,
        bill_date || null,
        notes || null,
      ]
    )
    res.status(201).json(rows[0])
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

    const { rows: existingRows } = await pool.query(
      'SELECT * FROM public.gasoil_deliveries WHERE id = $1',
      [id]
    )
    const existing = existingRows[0]

    if (!existing) {
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

    const setKeys = Object.keys(updates)
    if (setKeys.length === 0) {
      return res.json(existing)
    }

    const setClause = setKeys.map((key, idx) => `${key} = $${idx + 2}`).join(', ')
    const { rows } = await pool.query(
      `UPDATE public.gasoil_deliveries SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...setKeys.map((key) => updates[key])]
    )
    res.json(rows[0])
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

    const { rows: existingRows } = await pool.query(
      'SELECT id, organization_id FROM public.gasoil_deliveries WHERE id = $1',
      [id]
    )
    const existing = existingRows[0]

    if (!existing) {
      return res.status(404).json({ error: 'Delivery not found' })
    }

    const ok = await userMayAccessOrganization(req.user.id, existing.organization_id)
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    await pool.query('DELETE FROM public.gasoil_deliveries WHERE id = $1', [id])
    res.json({ message: 'Deleted' })
  } catch (e) {
    res.status(500).json({ error: e.message || 'Internal server error' })
  }
})

module.exports = router
