import { z } from 'zod'

const optionalSecret = z
  .string()
  .trim()
  .transform((v) => v || undefined)
  .optional()

const csv = z
  .string()
  .default('')
  .transform((v) =>
    v
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  .pipe(z.array(z.url({ message: 'must be a comma-separated list of URLs' })))

/**
 * Environment variables (PRD §11.3), validated once at startup. Supabase,
 * email and maps keys are optional in development; without SUPABASE_URL and
 * DATABASE_URL the API serves only /api/health. Required in production.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_BASE_URL: z.url().default('http://localhost:5173'),
  CORS_ORIGINS: csv,
  /** Proxy hops to trust for client IPs (rate limiting). 1 behind Render/Vercel. */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),

  SUPABASE_URL: z
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  SUPABASE_SERVICE_ROLE_KEY: optionalSecret,
  /** Only for projects still on the legacy shared JWT secret (HS256). */
  SUPABASE_JWT_SECRET: optionalSecret,
  DATABASE_URL: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  MAPS_API_KEY: optionalSecret,
})

export type Config = z.infer<typeof schema>

export class ConfigError extends Error {
  override name = 'ConfigError'
}

/**
 * Parses env vars into typed config. Throws ConfigError listing the bad
 * variable names and reasons; values are never echoed (they may be secrets).
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  const result = schema.safeParse(env)
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    throw new ConfigError(`Invalid environment configuration:\n${lines.join('\n')}`)
  }
  const config = result.data
  if (config.NODE_ENV === 'production') {
    const missing = [
      config.CORS_ORIGINS.length === 0 && 'CORS_ORIGINS',
      !config.SUPABASE_URL && 'SUPABASE_URL',
      !config.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
      !config.DATABASE_URL && 'DATABASE_URL',
    ].filter(Boolean)
    if (missing.length) {
      const lines = missing.map((name) => `  - ${name}: required in production`)
      throw new ConfigError(`Invalid environment configuration:\n${lines.join('\n')}`)
    }
  }
  return config
}
