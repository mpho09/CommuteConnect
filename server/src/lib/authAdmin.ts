/**
 * Server-side Supabase Auth admin operations (service role key; never sent to
 * the browser).
 */
export interface AuthAdmin {
  /**
   * Soft-deletes the auth user: Supabase scrubs the identity and blocks
   * sign-in but keeps the row, so the profile and retained records are not
   * cascade-deleted (PRD §12.4).
   */
  softDeleteUser(userId: string): Promise<void>
}

export function createAuthAdmin(supabaseUrl: string, serviceRoleKey: string): AuthAdmin {
  const base = supabaseUrl.replace(/\/+$/, '')
  return {
    async softDeleteUser(userId) {
      const res = await fetch(`${base}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ should_soft_delete: true }),
      })
      // 404: already gone; deleting is idempotent from our side.
      if (!res.ok && res.status !== 404) {
        throw new Error(`Supabase admin delete failed with status ${res.status}`)
      }
    },
  }
}
