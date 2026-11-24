import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '../app/Providers'
import { routes } from '../app/routes'
import { createMockApi } from '../lib/api/mock/mockApi'
import { createQueryClient } from '../lib/queryClient'

/** Sample persona ids from the mock seed (see lib/api/mock/seed.ts). */
export type PersonaId = 'u-thandi' | 'u-kabelo' | 'u-naledi' | 'u-lerato' | 'u-sipho' | 'u-admin'

/** Render the real route tree at `path`, signed in as `userId` (or as a guest). */
export function renderRoute(path: string, userId: PersonaId | null = null) {
  const api = createMockApi({ userId, config: { latencyMs: 0 } })
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <Providers api={api} queryClient={queryClient}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...utils, router, api, queryClient }
}
