const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { getAuthUserFromBearerToken } = require('../lib/authHelpers')

// Middleware to verify authentication
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
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' })
  }
}

async function userBelongsToOrganization(userId, organizationId) {
  if (!userId || !organizationId) return false
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .eq('organization_id', organizationId)
    .maybeSingle()
  return !error && !!data
}

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

    const { data, error } = await supabase
      .from('counters')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json(data || [])
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

    const { data, error } = await supabase
      .from('counters')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Counter not found' })
      }
      return res.status(500).json({ error: error.message })
    }

    res.json(data)
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
      const belongs = await userBelongsToOrganization(user_id, organization_id)
      if (!belongs) {
        return res.status(400).json({
          error: 'user_id must belong to the provided organization_id'
        })
      }
    }

    const { data, error } = await supabase
      .from('counters')
      .insert({
        organization_id,
        user_id: counter_type === 'electric_common' ? null : user_id,
        counter_type,
        name,
      })
      .select()
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
 * @route PUT /api/counters/:id
 * @desc Update counter by ID
 * @body { name?: string, counter_type?: string, user_id?: string }
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params
    const { name, counter_type, user_id } = req.body

    // Check if counter exists
    const { data: existingCounter, error: fetchError } = await supabase
      .from('counters')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingCounter) {
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
      const belongs = await userBelongsToOrganization(finalUserId, existingCounter.organization_id)
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

    const { data, error } = await supabase
      .from('counters')
      .update(updates)
      .eq('id', id)
      .select()
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
 * @route DELETE /api/counters/:id
 * @desc Delete counter by ID
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params

    // Check if counter exists
    const { data: existingCounter, error: fetchError } = await supabase
      .from('counters')
      .select('id')
      .eq('id', id)
      .single()

    if (fetchError || !existingCounter) {
      return res.status(404).json({ error: 'Counter not found' })
    }

    const { error } = await supabase
      .from('counters')
      .delete()
      .eq('id', id)

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({ message: 'Counter deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router

