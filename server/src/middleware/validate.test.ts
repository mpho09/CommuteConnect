import express from 'express'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { silentLogger } from '../lib/logger.ts'
import { idParams } from '../validators/common.ts'
import { errorHandler } from './errorHandler.ts'
import { requestId } from './requestId.ts'
import { validate } from './validate.ts'

function testApp() {
  const app = express()
  app.use(requestId, express.json())
  app.post(
    '/journeys/:id',
    validate({
      params: idParams,
      query: z.object({ notify: z.stringbool().default(false) }),
      body: z.object({ seats: z.number().int().positive(), note: z.string().max(5).optional() }),
    }),
    (req, res) => {
      res.json({ params: req.params, query: req.query, body: req.body })
    },
  )
  app.use(errorHandler(silentLogger))
  return app
}

const ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'

describe('validate middleware', () => {
  it('passes parsed, coerced and stripped values to the handler', async () => {
    const res = await request(testApp())
      .post(`/journeys/${ID}?notify=true`)
      .send({ seats: 2, extra: 'dropped' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ params: { id: ID }, query: { notify: true }, body: { seats: 2 } })
  })

  it('collects field errors from every part into one 400 response', async () => {
    const res = await request(testApp()).post('/journeys/nope').send({ seats: 0, note: 'too long' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatchObject({
      code: 'validation',
      message: 'Some details need fixing.',
      fieldErrors: {
        id: 'Must be a valid id.',
        seats: expect.any(String),
        note: expect.any(String),
      },
    })
    expect(res.body.error.requestId).toBe(res.get('x-request-id'))
  })

  it('reports a missing body as a validation error', async () => {
    const res = await request(testApp()).post(`/journeys/${ID}`)
    expect(res.status).toBe(400)
    expect(res.body.error.fieldErrors).toHaveProperty('seats')
  })
})
