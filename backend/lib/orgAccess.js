const pool = require('./db')

async function getOrganizationIdForUser(userId) {
  const { rows } = await pool.query(
    'SELECT organization_id FROM public.users WHERE id = $1',
    [userId]
  )
  return rows[0]?.organization_id ?? null
}

/**
 * @returns {Promise<boolean>} true if caller may access organization_id
 */
async function userMayAccessOrganization(userId, organizationId) {
  if (!userId || !organizationId) return false
  const org = await getOrganizationIdForUser(userId)
  return org === organizationId
}

module.exports = {
  getOrganizationIdForUser,
  userMayAccessOrganization,
}
