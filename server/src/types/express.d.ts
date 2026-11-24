import type { AuthUser } from '../services/authUser.ts'

declare global {
  namespace Express {
    interface Request {
      /** Correlates logs and error responses. Set by the requestId middleware. */
      id: string
      /** The signed-in user, set by `authenticate` when a valid token is sent. */
      auth?: AuthUser
    }
  }
}
