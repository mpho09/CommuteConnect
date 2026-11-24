import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../test/renderRoute'

describe('TopNav', () => {
  it('shows main links and sign-in actions to guests', async () => {
    renderRoute('/')
    const main = await screen.findByRole('navigation', { name: 'Main' })
    for (const name of ['Find transport', 'List your service', 'Help']) {
      expect(within(main).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
  })

  it('opens the mobile menu, then closes it on Escape and on navigation', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const toggle = await screen.findByRole('button', { name: 'Open menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()

    await user.click(toggle)
    const mobile = screen.getByRole('navigation', { name: 'Mobile' })
    await user.click(within(mobile).getByRole('link', { name: 'Help' }))
    expect(await screen.findByRole('heading', { name: 'Help & safety' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Mobile' })).not.toBeInTheDocument()
  })

  it('shows an account menu with links for the user’s roles', async () => {
    const user = userEvent.setup()
    renderRoute('/', 'u-lerato')
    // Lerato has one unread notification in the sample data.
    expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()

    const account = screen.getByRole('button', { name: /account menu/ })
    await user.click(account)
    expect(account).toHaveAttribute('aria-expanded', 'true')
    for (const name of [
      'My dashboard',
      'Operator dashboard',
      'My requests',
      'Profile & settings',
    ]) {
      expect(screen.getAllByRole('link', { name }).length).toBeGreaterThan(0)
    }
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument()
  })
})

describe('signing out', () => {
  it('logs out from the account menu and returns to a guest view', async () => {
    const user = userEvent.setup()
    renderRoute('/notifications', 'u-thandi')
    await user.click(await screen.findByRole('button', { name: /account menu/ }))
    await user.click(screen.getByRole('button', { name: 'Log out' }))
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Your journey. More options. Less hassle.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })
})
