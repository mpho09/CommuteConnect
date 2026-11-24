import type { ApiClient } from './client'
import { createMockApi, type MockConfig } from './mock/mockApi'

const CONFIG_KEY = 'cc.mock.config'

/**
 * Picks the API implementation. Mocks are on unless VITE_USE_MOCKS=false.
 * The real HTTP client arrives with the integration work (#34).
 */
export function createApi(env: { VITE_USE_MOCKS?: string } = import.meta.env): ApiClient {
  if (env.VITE_USE_MOCKS === 'false') {
    throw new Error(
      'The real API client is not built yet (see issue #34). Set VITE_USE_MOCKS=true.',
    )
  }
  const storage = typeof localStorage === 'undefined' ? undefined : localStorage
  return createMockApi({ storage, config: loadMockConfig(storage) })
}

function loadMockConfig(storage?: Storage): Partial<MockConfig> {
  try {
    return JSON.parse(storage?.getItem(CONFIG_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveMockConfig(config: MockConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
}
