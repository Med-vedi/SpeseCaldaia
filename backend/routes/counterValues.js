const express = require('express')
const router = express.Router()
const pool = require('../lib/db')
const authenticate = require('../middleware/authenticate')

const COUNTER_JOIN_SELECT = `
  cv.*,
  c.id AS c_id,
  c.name AS c_name,
  c.counter_type AS c_counter_type,
  c.organization_id AS c_organization_id,
  c.user_id AS c_user_id
`

function shapeWithCounters(row) {
  const { c_id, c_name, c_counter_type, c_organization_id, c_user_id, ...cv } = row
  return {
    ...cv,
    counters: c_id
      ? {
          id: c_id,
          name: c_name,
          counter_type: c_counter_type,
          organization_id: c_organization_id,
          user_id: c_user_id,
        }
      : null,
  }
}

/**
 * @route GET /api/counter-values
 * @desc Get all counter values by organization_id
 * @query { organization_id: string }
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { organization_id } = req.query

    if (!organization_id) {
      return res.status(400).json({ error: 'organization_id is required' })
    }

    const { rows } = await pool.query(
      `SELECT ${COUNTER_JOIN_SELECT}
       FROM public.counter_values cv
       JOIN public.counters c ON c.id = cv.counter_id
       WHERE c.organization_id = $1
       ORDER BY cv.year DESC, cv.counter_id ASC`,
      [organization_id]
    )

    res.json(rows.map(shapeWithCounters))
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route GET /api/counter-values/:id
 * @desc Get counter value by ID
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query(
      `SELECT ${COUNTER_JOIN_SELECT}
       FROM public.counter_values cv
       JOIN public.counters c ON c.id = cv.counter_id
       WHERE cv.id = $1`,
      [id]
    )

    if (!rows[0]) {
      return res.status(404).json({ error: 'Counter value not found' })
    }

    res.json(shapeWithCounters(rows[0]))
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route POST /api/counter-values
 * @desc Create a new counter value
 * @body { counter_id: string, year: number, value: number, reading_date?: string, notes?: string }
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { counter_id, year, value, reading_date, notes } = req.body

    // Validation
    if (!counter_id || !year || value === undefined || value === null) {
      return res.status(400).json({
        error: 'Missing required fields: counter_id, year, value'
      })
    }

    // Validate year
    const yearNum = parseInt(year)
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return res.status(400).json({ error: 'Invalid year. Must be between 2000 and 2100' })
    }

    // Validate value
    const valueNum = parseFloat(value)
    if (isNaN(valueNum) || valueNum < 0) {
      return res.status(400).json({ error: 'Invalid value. Must be a positive number' })
    }

    // Check if counter exists
    const { rows: counterRows } = await pool.query(
      'SELECT id FROM public.counters WHERE id = $1',
      [counter_id]
    )
    if (!counterRows[0]) {
      return res.status(404).json({ error: 'Counter not found' })
    }

    // Check if value already exists for this counter and year
    const { rows: existingRows } = await pool.query(
      'SELECT id FROM public.counter_values WHERE counter_id = $1 AND year = $2',
      [counter_id, yearNum]
    )
    if (existingRows[0]) {
      return res.status(409).json({
        error: `Counter value for year ${yearNum} already exists. Use PUT to update.`
      })
    }

    const { rows } = await pool.query(
      `WITH inserted AS (
         INSERT INTO public.counter_values (counter_id, year, value, reading_date, notes)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *
       )
       SELECT ${COUNTER_JOIN_SELECT}
       FROM inserted cv
       JOIN public.counters c ON c.id = cv.counter_id`,
      [counter_id, yearNum, valueNum, reading_date || null, notes || null]
    )

    res.status(201).json(shapeWithCounters(rows[0]))
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route PUT /api/counter-values/:id
 * @desc Update counter value by ID
 * @body { value?: number, reading_date?: string, notes?: string }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { value, reading_date, notes } = req.body

    // Check if counter value exists
    const { rows: existingRows } = await pool.query(
      'SELECT * FROM public.counter_values WHERE id = $1',
      [id]
    )
    if (!existingRows[0]) {
      return res.status(404).json({ error: 'Counter value not found' })
    }

    // Validate value if provided
    if (value !== undefined && value !== null) {
      const valueNum = parseFloat(value)
      if (isNaN(valueNum) || valueNum < 0) {
        return res.status(400).json({ error: 'Invalid value. Must be a positive number' })
      }
    }

    // Build update object
    const updates = {}
    if (value !== undefined && value !== null) {
      updates.value = parseFloat(value)
    }
    if (reading_date !== undefined) {
      updates.reading_date = reading_date || null
    }
    if (notes !== undefined) {
      updates.notes = notes || null
    }

    const setKeys = Object.keys(updates)
    let updatedId = id
    if (setKeys.length > 0) {
      const setClause = setKeys.map((key, idx) => `${key} = $${idx + 2}`).join(', ')
      const { rows: updateRows } = await pool.query(
        `UPDATE public.counter_values SET ${setClause} WHERE id = $1 RETURNING id`,
        [id, ...setKeys.map((key) => updates[key])]
      )
      updatedId = updateRows[0].id
    }

    const { rows } = await pool.query(
      `SELECT ${COUNTER_JOIN_SELECT}
       FROM public.counter_values cv
       JOIN public.counters c ON c.id = cv.counter_id
       WHERE cv.id = $1`,
      [updatedId]
    )

    res.json(shapeWithCounters(rows[0]))
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * @route DELETE /api/counter-values/:id
 * @desc Delete counter value by ID
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query(
      'DELETE FROM public.counter_values WHERE id = $1 RETURNING id',
      [id]
    )

    if (!rows[0]) {
      return res.status(404).json({ error: 'Counter value not found' })
    }

    res.json({ message: 'Counter value deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
