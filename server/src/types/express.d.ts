export {}

declare global {
  namespace Express {
    interface Request {
      /** Correlates logs and error responses. Set by the requestId middleware. */
      id: string
    }
  }
}
