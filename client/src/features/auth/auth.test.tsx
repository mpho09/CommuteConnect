import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SAMPLE_PASSWORD } from '../../lib/api/mock/seed'
import { renderRoute } from '../../test/renderRoute'

const NEW_PASSWORD = 'Commute2026!'

type User = ReturnType<typeof userEvent.setup>

async function fillSignUp(
  user: User,
  { email = 'new.person@example.com', terms = true }: { email?: string; terms?: boolean } = {},
) {
  await user.type(await screen.findByLabelText('Full name'), 'Ayanda Zulu')
  await user.type(screen.getByLabelText('Email address'), email)
  await user.click(screen.getByRole('checkbox', { name: /Commuter/ }))
  await user.type(screen.getByLabelText('Password'), NEW_PASSWORD)
  await user.type(screen.getByLabelText('Confirm password'), NEW_PASSWORD)
  if (terms) await user.click(screen.getByRole('checkbox', { name: /I accept the Terms/ }))
}

async function logIn(user: User, email: string, password: string) {
  await user.type(await screen.findByLabelText('Email address'), email)
  await user.type(screen.getByLabelText('Password'), password)
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

describe('Sign up (S2)', () => {
  it('lists every problem in a focused error summary that links to the fields', async () => {
    const user = userEvent.setup()
    renderRoute('/signup')
    await user.click(await screen.findByRole('button', { name: 'Create account' }))

    const summary = screen.getByRole('alert', { name: 'There is a problem' })
    expect(summary).toHaveFocus()
    const links = within(summary).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual([
      'Enter your full name.',
      'Enter your email address.',
      'Choose how you’ll use CommuteConnect.',
      'Create a password.',
      'Re-enter your password.',
      'You need to accept the Terms of Service and Privacy Notice to create an account.',
    ])

    await user.click(links[1])
    expect(screen.getByLabelText('Email address')).toHaveFocus()
    expect(screen.getByLabelText('Email address')).toHaveAttribute('aria-invalid', 'true')
  })

  it('blocks sign-up without consent to the Terms and Privacy Notice (BR18)', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/signup')
    await fillSignUp(user, { terms: false })
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      within(screen.getByRole('alert')).getByText(/You need to accept the Terms of Service/),
    ).toBeInTheDocument()
    expect(api.db.users.some((u) => u.email === 'new.person@example.com')).toBe(false)
  })

  it('checks password strength and that both passwords match', async () => {
    const user = userEvent.setup()
    renderRoute('/signup')
    await user.type(await screen.findByLabelText('Password'), 'weakpass')
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    const summary = screen.getByRole('alert')
    expect(within(summary).getByText(/with an uppercase letter/)).toBeInTheDocument()
    expect(within(summary).getByText('Passwords don’t match.')).toBeInTheDocument()
  })

  it('creates the account with the chosen roles and asks the user to verify their email', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/signup')
    await fillSignUp(user)
    await user.click(screen.getByRole('checkbox', { name: /Transport operator/ }))
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
    expect(screen.getByText('new.person@example.com')).toBeInTheDocument()
    const created = api.db.users.find((u) => u.email === 'new.person@example.com')
    expect(created).toMatchObject({ roles: ['commuter', 'operator'], emailVerified: false })

    await user.click(screen.getByRole('link', { name: /Continue to profile setup/ }))
    expect(router.state.location.pathname).toBe('/setup')
  })

  it('explains when the email is already registered and offers log in or recovery', async () => {
    const user = userEvent.setup()
    renderRoute('/signup')
    await fillSignUp(user, { email: 'thandi.sample@example.com' })
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByRole('link', { name: 'An account with this email already exists.' }),
    ).toBeInTheDocument()
    const form = screen.getByRole('form', { name: 'Sign up' })
    expect(within(form).getAllByRole('link', { name: 'Log in' })[0]).toHaveAttribute(
      'href',
      '/login',
    )
    expect(within(form).getByRole('link', { name: 'reset your password' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('sends signed-in users to their dashboard', async () => {
    const { router } = renderRoute('/signup', 'u-thandi')
    await waitFor(() => expect(router.state.location.pathname).toBe('/commuter'))
  })
})

describe('Log in (S3)', () => {
  it('shows a generic error for wrong credentials, without saying whether the email exists', async () => {
    const user = userEvent.setup()
    renderRoute('/login')
    await logIn(user, 'thandi.sample@example.com', 'wrong-password')

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('That email and password don’t match.')
    expect(summary).toHaveFocus()
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('validates the form before calling the API', async () => {
    const user = userEvent.setup()
    renderRoute('/login')
    await user.type(await screen.findByLabelText('Email address'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    const summary = screen.getByRole('alert')
    expect(within(summary).getByText(/Enter a valid email address/)).toBeInTheDocument()
    expect(within(summary).getByText('Enter your password.')).toBeInTheDocument()
  })

  it.each([
    ['thandi.sample@example.com', '/commuter'],
    ['sipho.demo@example.com', '/operator'],
    ['admin.test@example.com', '/admin'],
    ['naledi.sample@example.com', '/setup'],
  ])('sends %s to %s', async (email, path) => {
    const user = userEvent.setup()
    const { router } = renderRoute('/login')
    await logIn(user, email, SAMPLE_PASSWORD)
    await waitFor(() => expect(router.state.location.pathname).toBe(path))
  })

  it('returns the user to the page they were trying to reach', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/requests?tab=sent')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))

    await logIn(user, 'thandi.sample@example.com', SAMPLE_PASSWORD)
    await waitFor(() => expect(router.state.location.pathname).toBe('/requests'))
    expect(router.state.location.search).toBe('?tab=sent')
  })

  it('ignores a `next` that points off-site', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/login?next=%2F%2Fevil.example.com')
    await logIn(user, 'thandi.sample@example.com', SAMPLE_PASSWORD)
    await waitFor(() => expect(router.state.location.pathname).toBe('/commuter'))
  })

  it('explains an expired session', async () => {
    renderRoute('/login?reason=expired')
    expect(
      await screen.findByText('Your session has expired. Please sign in again.'),
    ).toBeInTheDocument()
  })
})

describe('Password reset', () => {
  it('confirms the request without revealing whether the account exists', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/forgot-password')
    await user.type(await screen.findByLabelText('Email address'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))

    expect(await screen.findByRole('heading', { name: 'Check your email' })).toBeInTheDocument()
    expect(screen.getByText(/If an account exists for/)).toBeInTheDocument()
    expect(api.db.resetTokens).toHaveLength(0)
  })

  it('resets the password from the emailed link, and the link only works once', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/forgot-password')
    await user.type(await screen.findByLabelText('Email address'), 'thandi.sample@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    await screen.findByRole('heading', { name: 'Check your email' })

    const [{ token }] = api.db.resetTokens
    await router.navigate(`/reset-password?token=${token}`)
    await user.type(await screen.findByLabelText('New password'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Save new password' }))

    expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument()
    await expect(api.signIn('thandi.sample@example.com', NEW_PASSWORD)).resolves.toMatchObject({
      id: 'u-thandi',
    })
    await expect(api.resetPassword(token, 'Another1!')).rejects.toMatchObject({
      code: 'reset_link_invalid',
    })
  })

  it('offers a new link when the reset link is missing or invalid', async () => {
    const user = userEvent.setup()
    renderRoute('/reset-password?token=not-a-real-token')
    await user.type(await screen.findByLabelText('New password'), NEW_PASSWORD)
    await user.type(screen.getByLabelText('Confirm new password'), NEW_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Save new password' }))

    expect(
      await screen.findByRole('heading', { name: 'This reset link doesn’t work' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Request a new link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })
})
