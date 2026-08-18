const express = require('express')
const router = express.Router()
const pool = require('../lib/db')
const authenticate = require('../middleware/authenticate')
const { userMayAccessOrganization } = require('../lib/orgAccess')

/**
 * @route GET /api/counters
 * @desc Get all counters by organization_id
 * @query { organization_id: string }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { organization_id } = req.query

    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id is required' })
    }

    const { rows } = await pool.query(
      'SELECT * FROM public.counters WHERE organization_id = $1 ORDER BY created_at DESC',
      [organization_id]
    )

    res.json(rows)
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route GET /api/counters/:id
 * @desc Get counter by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query('SELECT * FROM public.counters WHERE id = $1', [id])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Counter not found' })
    }

    res.json(rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route POST /api/counters
 * @desc Create a new counter
 * @body { organization_id: string, user_id?: string, counter_type: 'heat' | 'water' | 'electric' | 'electric_common', name: string }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { organization_id, user_id, counter_type, name } = req.body

    // Validation
    if (!organization_id || !counter_type || !name) {
      return res.status(400).json({
        error: 'Missing required fields: organization_id, counter_type, name'
      })
    }

    if (!['heat', 'water', 'electric_common'].includes(counter_type)) {
      return res.status(400).json({
        error: 'Invalid counter_type. Must be heat, water, or electric_common'
      })
    }

    // electric_common should not have user_id
    if (counter_type === 'electric_common' && user_id) {
      return res.status(400).json({
        error: 'electric_common counter type cannot have user_id'
      })
    }

    // Non-common counters must always belong to a specific user.
    if (counter_type !== 'electric_common' && !user_id) {
      return res.status(400).json({
        error: 'user_id is required for non-electric_common counters'
      })
    }

    if (counter_type !== 'electric_common') {
      const belongs = await userMayAccessOrganization(user_id, organization_id)
      if (!belongs) {
        return res.status(400).json({
          error: 'user_id must belong to the provided organization_id'
        })
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO public.counters (organization_id, user_id, counter_type, name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [organization_id, counter_type === 'electric_common' ? null : user_id, counter_type, name]
    )

    res.status(201).json(rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route PUT /api/counters/:id
 * @desc Update counter by ID
 * @body { name?: string, counter_type?: string, user_id?: string }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { name, counter_type, user_id } = req.body

    // Check if counter exists
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM public.counters WHERE id = $1',
      [id]
    )
    const existingCounter = existingRows[0]

    if (!existingCounter) {
      return res.status(404).json({ error: 'Counter not found' })
    }

    // Validate counter_type if provided
    if (counter_type && !['heat', 'water', 'electric_common'].includes(counter_type)) {
      return res.status(400).json({
        error: 'Invalid counter_type. Must be heat, water, or electric_common'
      })
    }

    // electric_common should not have user_id
    const finalCounterType = counter_type || existingCounter.counter_type
    if (finalCounterType === 'electric_common' && user_id) {
      return res.status(400).json({
        error: 'electric_common counter type cannot have user_id'
      })
    }

    if (finalCounterType !== 'electric_common') {
      const finalUserId = user_id !== undefined ? user_id : existingCounter.user_id
      if (!finalUserId) {
        return res.status(400).json({
          error: 'user_id is required for non-electric_common counters'
        })
      }
      const belongs = await userMayAccessOrganization(finalUserId, existingCounter.organization_id)
      if (!belongs) {
        return res.status(400).json({
          error: 'user_id must belong to the counter organization'
        })
      }
    }

    // Build update object
    const updates = {}
    if (name) updates.name = name
    if (counter_type) updates.counter_type = counter_type
    if (finalCounterType === 'electric_common') {
      updates.user_id = null
    } else if (user_id !== undefined) {
      updates.user_id = user_id
    }

    const setKeys = Object.keys(updates)
    if (setKeys.length === 0) {
      return res.json(existingCounter)
    }

    const setClause = setKeys.map((key, idx) => `${key} = $${idx + 2}`).join(', ')
    const { rows } = await pool.query(
      `UPDATE public.counters SET ${setClause} WHERE id = $1 RETURNING *`,
      [id, ...setKeys.map((key) => updates[key])]
    )

    res.json(rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route DELETE /api/counters/:id
 * @desc Delete counter by ID
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query('DELETE FROM public.counters WHERE id = $1 RETURNING id', [
      id,
    ])

    if (!rows[0]) {
      return res.status(404).json({ error: 'Counter not found' })
    }

    res.json({ message: 'Counter deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
