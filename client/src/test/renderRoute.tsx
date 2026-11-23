import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { Providers } from '../app/Providers'
import { routes } from '../app/routes'
import type { Role, Session } from '../lib/session/session'

/** Render the real route tree at `path`, signed in with `roles` (or as a guest). */
export function renderRoute(path: string, roles?: Role[]) {
  const session: Session = roles
    ? { user: { id: 'test-user', displayName: 'Test', roles } }
    : { user: null }
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <Providers session={session}>
      <RouterProvider router={router} />
    </Providers>,
  )
  return { ...utils, router }
}
