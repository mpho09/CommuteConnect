import type { ReactNode } from 'react'
import { ApiContext } from './apiContext'
import type { ApiClient } from './client'

export function ApiProvider({ api, children }: { api: ApiClient; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>
}
