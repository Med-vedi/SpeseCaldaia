const supabase = require('./supabase')

async function getOrganizationIdForUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data?.organization_id) {
    return null
  }
  return data.organization_id
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
