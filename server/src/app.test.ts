import { Router } from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { loadConfig } from './config/env.ts'
import { silentLogger, type LogFields, type Logger } from './lib/logger.ts'

const config = (env: Record<string, string> = {}) => loadConfig({ NODE_ENV: 'test', ...env })

function recordingLogger() {
  const lines: Array<{ level: string; msg: string; fields?: LogFields }> = []
  const at = (level: string) => (msg: string, fields?: LogFields) =>
    lines.push({ level, msg, fields })
  const logger: Logger = { info: at('info'), warn: at('warn'), error: at('error') }
  return { logger, lines }
}

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(createApp(config(), { logger: silentLogger })).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', time: expect.any(String) })
    expect(res.get('cache-control')).toBe('no-store')
  })

  it('sets security headers and a request id', async () => {
    const res = await request(createApp(config(), { logger: silentLogger })).get('/api/health')
    expect(res.get('x-content-type-options')).toBe('nosniff')
    expect(res.get('x-powered-by')).toBeUndefined()
    expect(res.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('reuses a well-formed incoming request id and replaces a malformed one', async () => {
    const app = createApp(config(), { logger: silentLogger })
    const ok = await request(app).get('/api/health').set('X-Request-Id', 'abc-12345678')
    expect(ok.get('x-request-id')).toBe('abc-12345678')
    const bad = await request(app).get('/api/health').set('X-Request-Id', '<script>')
    expect(bad.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('errors', () => {
  const app = createApp(config(), { logger: silentLogger })

  it('returns the standard shape for unknown routes', async () => {
    const res = await request(app).get('/api/nope')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      error: {
        code: 'not_found',
        message: 'We couldn’t find that. It may have been removed.',
        requestId: res.get('x-request-id'),
      },
    })
  })

  it('rejects malformed JSON as a validation error', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"bad":')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatchObject({
      code: 'validation',
      message: 'The request body is not valid JSON.',
    })
  })

  it('rejects oversized bodies', async () => {
    const res = await request(app)
      .post('/api/health')
      .send({ big: 'x'.repeat(200_000) })
    expect(res.status).toBe(413)
    expect(res.body.error.code).toBe('payload_too_large')
  })

  it('hides unexpected errors from the client and logs them with the request id', async () => {
    const { logger, lines } = recordingLogger()
    const api = Router()
    api.get('/boom', () => {
      throw new Error('db password=hunter2 exploded')
    })
    const res = await request(createApp(config(), { logger, api })).get('/api/boom')

    expect(res.status).toBe(500)
    expect(res.body.error).toMatchObject({
      code: 'server_error',
      message: 'Something went wrong. Try again.',
    })
    expect(JSON.stringify(res.body)).not.toContain('hunter2')
    const logged = lines.find((l) => l.level === 'error')
    expect(logged?.fields).toMatchObject({ requestId: res.get('x-request-id'), name: 'Error' })
  })
})

describe('CORS', () => {
  const app = createApp(config({ CORS_ORIGINS: 'https://app.example.com' }), {
    logger: silentLogger,
  })

  it('allows configured origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://app.example.com')
    expect(res.get('access-control-allow-origin')).toBe('https://app.example.com')
  })

  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example.com')
    expect(res.get('access-control-allow-origin')).toBeUndefined()
  })
})

describe('rate limiting', () => {
  it('returns 429 with the standard error once the limit is reached', async () => {
    const app = createApp(config({ RATE_LIMIT_MAX: '2' }), { logger: silentLogger })
    await request(app).get('/api/health').expect(200)
    await request(app).get('/api/health').expect(200)
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(429)
    expect(res.body.error).toMatchObject({
      code: 'rate_limited',
      message: 'Too many attempts. Please wait and try again.',
    })
  })
})

describe('request logging', () => {
  it('logs method, route, status and timing but not the query string', async () => {
    const { logger, lines } = recordingLogger()
    await request(createApp(config(), { logger })).get('/api/health?from=12+Main+Road')
    const line = lines.find((l) => l.msg === 'request')
    expect(line?.fields).toMatchObject({ method: 'GET', route: '/api/health', status: 200 })
    expect(line?.fields?.durationMs).toEqual(expect.any(Number))
    expect(JSON.stringify(line)).not.toContain('Main')
  })
})
