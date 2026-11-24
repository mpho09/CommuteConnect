import { createContext, useContext } from 'react'
import type { ApiClient } from './client'
import type { MockApi } from './mock/mockApi'

export const ApiContext = createContext<ApiClient | null>(null)

/** The API client for this app (mock or real). Screens should only use this. */
export function useApi(): ApiClient {
  const api = useContext(ApiContext)
  if (!api) throw new Error('useApi must be used inside <ApiProvider>')
  return api
}

export function isMockApi(api: ApiClient): api is MockApi {
  return 'switchUser' in api
}
