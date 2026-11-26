import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

const thandi = (api: ReturnType<typeof renderRoute>['api']) =>
  api.db.users.find((u) => u.id === 'u-thandi')!

describe('Profile and settings (S20)', () => {
  it('updates personal details, with validation', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/settings', 'u-thandi')
    const form = await screen.findByRole('form', { name: 'Personal details' })
    const save = within(form).getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()

    const phone = within(form).getByLabelText(/Phone number/)
    await user.type(phone, 'not a phone')
    await user.click(save)
    expect(within(form).getByText(/Enter a valid phone number/)).toBeInTheDocument()

    await user.clear(phone)
    await user.type(phone, '+27 82 555 0101')
    await user.click(save)
    expect(await screen.findByText('Changes saved')).toBeInTheDocument()
    expect(thandi(api).phone).toBe('+27 82 555 0101')
    expect(within(form).getByText('Verified')).toBeInTheDocument()
  })

  it('updates the usual commute and email preference', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/settings', 'u-thandi')
    const commute = await screen.findByRole('form', { name: 'Usual commute' })
    expect(within(commute).getByRole('combobox', { name: 'Usual pickup area' })).toHaveValue(
      'Tembisa Plaza',
    )
    await user.click(within(commute).getByRole('checkbox', { name: 'Friday' }))
    await user.click(within(commute).getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(thandi(api).preferences.travelDays).toEqual([1, 2, 3, 4]))

    await user.click(screen.getByRole('checkbox', { name: /Email me about/ }))
    await waitFor(() => expect(thandi(api).preferences.notifyByEmail).toBe(false))
  })

  it('links to the Terms and Privacy Notice and logs out', async () => {
    const user = userEvent.setup()
    renderRoute('/settings', 'u-thandi')
    expect(await screen.findByRole('link', { name: /Terms of Service/ })).toHaveAttribute(
      'href',
      '/terms',
    )
    expect(screen.getByRole('link', { name: /Privacy Notice/ })).toHaveAttribute('href', '/privacy')
    const account = screen.getByRole('region', { name: 'Account' })
    await user.click(within(account).getByRole('button', { name: 'Log out' }))
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })
})

describe('Delete account (M4)', () => {
  it('explains the consequences, then needs explicit confirmation', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/settings', 'u-thandi')
    const lerato = api.db.journeys.find((j) => j.id === 'j-lerato-mwf')!
    const seatsBefore = lerato.seatsAvailable

    await user.click(await screen.findByRole('button', { name: 'Delete my account' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Delete your account?' })
    expect(
      await within(dialog).findByText(/1 journey you publish is cancelled/),
    ).toBeInTheDocument()
    expect(within(dialog).getByText(/Your 2 open requests are cancelled/)).toBeInTheDocument()
    expect(within(dialog).getByText(/What we keep, and why/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /Continue/ }))
    const confirm = screen.getByRole('alertdialog', { name: 'Confirm account deletion' })
    const del = within(confirm).getByRole('button', { name: 'Delete my account' })
    expect(del).toBeDisabled()
    await user.click(within(confirm).getByRole('checkbox', { name: /I understand/ }))
    await user.type(within(confirm).getByLabelText('Type DELETE to confirm'), 'delete')
    expect(del).toBeDisabled()
    await user.clear(within(confirm).getByLabelText('Type DELETE to confirm'))
    await user.type(within(confirm).getByLabelText('Type DELETE to confirm'), 'DELETE')
    await user.click(del)

    expect(await screen.findByText('Your account has been deleted')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument()

    const u = thandi(api)
    expect(u).toMatchObject({ accountStatus: 'deleted', fullName: 'Deleted user', phone: null })
    expect(api.db.journeys.find((j) => j.id === 'j-thandi-evening')?.status).toBe('cancelled')
    // Kabelo's request on Thandi's journey is cancelled, and he's told.
    expect(api.db.requests.find((r) => r.id === 'req-kabelo-thandi')?.status).toBe('cancelled')
    expect(
      api.db.notifications.some(
        (n) => n.recipientId === 'u-kabelo' && n.type === 'journey_changed',
      ),
    ).toBe(true)
    // Thandi's accepted seat on Lerato's journey is released.
    expect(api.db.requests.find((r) => r.id === 'req-thandi-lerato')?.status).toBe('cancelled')
    expect(lerato.seatsAvailable).toBe(seatsBefore + 1)
    expect(api.db.notifications.some((n) => n.recipientId === 'u-thandi')).toBe(false)
  })

  it('can be backed out of', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/settings', 'u-thandi')
    await user.click(await screen.findByRole('button', { name: 'Delete my account' }))
    await user.click(screen.getByRole('button', { name: 'Keep my account' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(thandi(api).accountStatus).toBe('active')
  })
})
