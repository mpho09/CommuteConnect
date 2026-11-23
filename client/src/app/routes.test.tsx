import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('routing', () => {
  it('renders the public landing page for guests', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { name: 'Landing' })).toBeInTheDocument()
  })

  it('sends guests to login and remembers where they were going', async () => {
    const { router } = renderRoute('/commuter/matches?day=mon')
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(router.state.location.search).toBe('?next=%2Fcommuter%2Fmatches%3Fday%3Dmon')
  })

  it.each([
    ['/commuter', 'commuter', 'Commuter dashboard'],
    ['/operator', 'operator', 'Operator dashboard'],
    ['/admin', 'admin', 'Admin dashboard'],
  ] as const)('lets a %s user into %s', async (path, role, heading) => {
    renderRoute(path, [role])
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('blocks signed-in users without the required role', async () => {
    renderRoute('/admin', ['commuter'])
    expect(
      await screen.findByRole('heading', { name: "You don't have access to this page" }),
    ).toBeInTheDocument()
  })

  it('lets any signed-in user start operator setup', async () => {
    renderRoute('/operator/setup', ['commuter'])
    expect(await screen.findByRole('heading', { name: 'Operator setup' })).toBeInTheDocument()
  })

  it('shows not found for unknown paths', async () => {
    renderRoute('/nope')
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
