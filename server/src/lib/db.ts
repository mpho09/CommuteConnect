import pg from 'pg'

/**
 * Minimal database interface used by services. Production uses a pg Pool on
 * DATABASE_URL (Supabase Postgres, server-side only); tests use PGlite with
 * the real migrations. Always use $1-style parameters, never string building.
 */
export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: T[] }>
}

export interface Db extends Queryable {
  /** Runs `fn` in a transaction; commits on success, rolls back on any error. */
  transaction<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>
}

export function createPgDb(connectionString: string): Db & { close(): Promise<void> } {
  const pool = new pg.Pool({ connectionString, max: 10 })
  return {
    query: async <T>(text: string, params?: unknown[]) =>
      (await pool.query(text, params)) as unknown as { rows: T[] },
    async transaction(fn) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        const tx: Queryable = {
          query: async <T>(text: string, params?: unknown[]) =>
            (await client.query(text, params)) as unknown as { rows: T[] },
        }
        const result = await fn(tx)
        await client.query('commit')
        return result
      } catch (e) {
        await client.query('rollback').catch(() => {})
        throw e
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
}
