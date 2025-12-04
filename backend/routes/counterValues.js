const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')

// Middleware to verify authentication
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' })
    }

    const token = authHeader.split(' ')[1]
    const { createClient } = require('@supabase/supabase-js')
    const { data: { user }, error } = await createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    ).auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
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

    const { data: orgCounters, error: countersError } = await supabase
      .from('counters')
      .select('id, name, counter_type, user_id, organization_id')
      .eq('organization_id', organization_id)
      .order('counter_type', { ascending: true })
      .order('name', { ascending: true })

    if (countersError) {
      return res.status(500).json({ error: countersError.message })
    }

    if (!orgCounters || orgCounters.length === 0) {
      return res.json([])
    }

    const counterIds = orgCounters.map(c => c.id)

    const { data: counterValues, error: valuesError } = await supabase
      .from('counter_values')
      .select('*')
      .in('counter_id', counterIds)
      .order('year', { ascending: false })
      .order('counter_id', { ascending: true })

    if (valuesError) {
      return res.status(500).json({ error: valuesError.message })
    }

    const structuredData = (counterValues || []).map(cv => {
      const counter = orgCounters.find(c => c.id === cv.counter_id)
      return {
        ...cv,
        counters: counter || null
      }
    })

    res.json(structuredData)
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

    const { data, error } = await supabase
      .from('counter_values')
      .select(`
        *,
        counters (
          id,
          name,
          counter_type,
          organization_id,
          user_id
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Counter value not found' })
      }
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
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
    const { data: counter, error: counterError } = await supabase
      .from('counters')
      .select('id')
      .eq('id', counter_id)
      .single()

    if (counterError || !counter) {
      return res.status(404).json({ error: 'Counter not found' })
    }

    // Check if value already exists for this counter and year
    const { data: existingValue } = await supabase
      .from('counter_values')
      .select('id')
      .eq('counter_id', counter_id)
      .eq('year', yearNum)
      .single()

    if (existingValue) {
      return res.status(409).json({
        error: `Counter value for year ${yearNum} already exists. Use PUT to update.`
      })
    }

    const { data, error } = await supabase
      .from('counter_values')
      .insert({
        counter_id,
        year: yearNum,
        value: valueNum,
        reading_date: reading_date || null,
        notes: notes || null,
      })
      .select(`
        *,
        counters (
          id,
          name,
          counter_type,
          organization_id,
          user_id
        )
      `)
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.status(201).json(data)
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
    const { data: existingValue, error: fetchError } = await supabase
      .from('counter_values')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingValue) {
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

    const { data, error } = await supabase
      .from('counter_values')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        counters (
          id,
          name,
          counter_type,
          organization_id,
          user_id
        )
      `)
      .single()

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
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

    // Check if counter value exists
    const { data: existingValue, error: fetchError } = await supabase
      .from('counter_values')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingValue) {
      return res.status(404).json({ error: 'Counter value not found' })
    }

    const { error } = await supabase
      .from('counter_values')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ message: 'Counter value deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router

