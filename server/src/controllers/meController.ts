import type { RequestHandler } from 'express'
import type { AuthAdmin } from '../lib/authAdmin.ts'
import type { Db } from '../lib/db.ts'
import { acceptTerms, deleteAccount, getMe, updateMe } from '../services/profileService.ts'

/** Handlers for /api/me. Routes guarantee req.auth is set. */
export function meController({ db, authAdmin }: { db: Db; authAdmin: AuthAdmin }) {
  const userId = (req: Parameters<RequestHandler>[0]) => req.auth!.id

  const show: RequestHandler = async (req, res) => {
    res.json(await getMe(db, userId(req)))
  }
  const update: RequestHandler = async (req, res) => {
    res.json(await updateMe(db, userId(req), req.body))
  }
  const terms: RequestHandler = async (req, res) => {
    res.json(await acceptTerms(db, userId(req)))
  }
  const destroy: RequestHandler = async (req, res) => {
    await deleteAccount(db, authAdmin, userId(req))
    res.status(204).end()
  }
  return { show, update, terms, destroy }
}
