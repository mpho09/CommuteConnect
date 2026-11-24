import { describe, expect, it } from 'vitest'
import { ConfigError, loadConfig } from './env.ts'

describe('loadConfig', () => {
  it('applies safe defaults for local development', () => {
    const c = loadConfig({})
    expect(c).toMatchObject({
      NODE_ENV: 'development',
      PORT: 4000,
      CORS_ORIGINS: [],
      TRUST_PROXY: 0,
    })
    expect(c.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
  })

  it('parses numbers, URL lists and treats empty secrets as unset', () => {
    const c = loadConfig({
      PORT: '8080',
      CORS_ORIGINS: 'http://localhost:5173, https://app.example.com',
      SUPABASE_URL: '',
      RESEND_API_KEY: '   ',
    })
    expect(c.PORT).toBe(8080)
    expect(c.CORS_ORIGINS).toEqual(['http://localhost:5173', 'https://app.example.com'])
    expect(c.SUPABASE_URL).toBeUndefined()
    expect(c.RESEND_API_KEY).toBeUndefined()
  })

  it('names the bad variables without echoing their values', () => {
    let message = ''
    try {
      loadConfig({ PORT: 'not-a-port', SUPABASE_URL: 'secret-looking-value', NODE_ENV: 'staging' })
    } catch (e) {
      expect(e).toBeInstanceOf(ConfigError)
      message = (e as Error).message
    }
    expect(message).toContain('PORT')
    expect(message).toContain('SUPABASE_URL')
    expect(message).toContain('NODE_ENV')
    expect(message).not.toContain('secret-looking-value')
  })

  it('requires CORS, Supabase and database settings in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(
      /CORS_ORIGINS[\s\S]*SUPABASE_URL[\s\S]*SUPABASE_SERVICE_ROLE_KEY[\s\S]*DATABASE_URL/,
    )
    const c = loadConfig({
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://app.example.com',
      SUPABASE_URL: 'https://abc.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      DATABASE_URL: 'postgres://user:pass@db.example.com:5432/postgres',
    })
    expect(c.NODE_ENV).toBe('production')
  })
})
