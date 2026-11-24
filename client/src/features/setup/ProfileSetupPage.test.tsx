import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

type User = ReturnType<typeof userEvent.setup>

async function pickPlace(user: User, label: string, text: string, option: RegExp) {
  await user.type(screen.getByRole('combobox', { name: label }), text)
  await user.click(await screen.findByRole('option', { name: option }))
}

const next = (user: User, name: RegExp) => user.click(screen.getByRole('button', { name }))

describe('Profile setup (S4)', () => {
  it('validates step 1 before moving on', async () => {
    const user = userEvent.setup()
    renderRoute('/setup', 'u-naledi')

    const name = await screen.findByLabelText('Full name')
    expect(name).toHaveValue('Naledi Khumalo')
    await user.clear(name)
    await user.type(screen.getByLabelText(/Phone number/), 'call me')
    await next(user, /Continue to preferences/)

    const summary = screen.getByRole('alert')
    expect(summary).toHaveFocus()
    expect(within(summary).getByText('Enter your full name.')).toBeInTheDocument()
    expect(within(summary).getByText(/Enter a valid phone number/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personal information' })).toBeInTheDocument()
  })

  it('walks through all three steps, keeps answers when going back, and saves', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/setup', 'u-naledi')

    await user.type(await screen.findByLabelText(/Phone number/), '+27 82 123 4567')
    await next(user, /Continue to preferences/)

    expect(screen.getByRole('heading', { name: 'Account preferences' })).toHaveFocus()
    expect(screen.getByText('Commuter')).toBeInTheDocument()
    await pickPlace(user, 'Usual pickup area', 'Tembisa', /Tembisa Plaza/)
    await pickPlace(user, 'Usual destination', 'Midrand Gaut', /Midrand Gautrain/)
    await user.type(screen.getByLabelText(/Usual departure time/), '06:30')
    await user.click(screen.getByRole('checkbox', { name: 'Monday' }))
    await user.click(screen.getByRole('checkbox', { name: 'Wednesday' }))
    await next(user, /Review details/)

    const confirm = screen.getByRole('form', { name: 'Confirmation' })
    expect(within(confirm).getByText('+27 82 123 4567')).toBeInTheDocument()
    expect(
      within(confirm).getByText('Tembisa Plaza to Midrand Gautrain Station'),
    ).toBeInTheDocument()
    expect(within(confirm).getByText('06:30 SAST')).toBeInTheDocument()
    expect(within(confirm).getByText('Mon, Wed')).toBeInTheDocument()

    // Editing a step keeps everything already entered.
    await user.click(screen.getByRole('button', { name: 'Edit personal information' }))
    expect(screen.getByLabelText(/Phone number/)).toHaveValue('+27 82 123 4567')
    await next(user, /Continue to preferences/)
    expect(screen.getByRole('combobox', { name: 'Usual pickup area' })).toHaveValue('Tembisa Plaza')
    await next(user, /Review details/)

    await next(user, /Save and go to dashboard/)
    await waitFor(() => expect(router.state.location.pathname).toBe('/commuter'))
    const saved = api.db.users.find((u) => u.id === 'u-naledi')
    expect(saved).toMatchObject({
      phone: '+27 82 123 4567',
      profileComplete: true,
      preferences: {
        usualOriginId: 'tembisa-plaza',
        usualDepartureTime: '06:30',
        travelDays: [1, 3],
      },
    })
  })

  it('rejects the same place as pickup and destination', async () => {
    const user = userEvent.setup()
    renderRoute('/setup', 'u-naledi')
    await screen.findByLabelText('Full name')
    await next(user, /Continue to preferences/)
    await pickPlace(user, 'Usual pickup area', 'Tembisa', /Tembisa Plaza/)
    await pickPlace(user, 'Usual destination', 'Tembisa', /Tembisa Plaza/)
    await next(user, /Review details/)

    expect(
      within(screen.getByRole('alert')).getByText(
        'Choose a destination different from your usual pickup area.',
      ),
    ).toBeInTheDocument()
  })

  it('prefills saved usual places by name', async () => {
    const user = userEvent.setup()
    renderRoute('/setup', 'u-thandi')
    await screen.findByLabelText('Full name')
    await next(user, /Continue to preferences/)
    expect(screen.getByRole('combobox', { name: 'Usual pickup area' })).toHaveValue('Tembisa Plaza')
    expect(screen.getByRole('checkbox', { name: 'Friday' })).toBeChecked()
  })

  it('skips commuter travel preferences for operator-only accounts', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/setup', 'u-sipho')
    await screen.findByLabelText('Full name')
    await next(user, /Continue to preferences/)

    expect(screen.queryByRole('combobox', { name: 'Usual pickup area' })).not.toBeInTheDocument()
    expect(screen.getByText('Transport operator')).toBeInTheDocument()
    await next(user, /Review details/)
    expect(screen.getByText(/your routes go live only after/)).toBeInTheDocument()
    await next(user, /Save and go to dashboard/)
    await waitFor(() => expect(router.state.location.pathname).toBe('/operator'))
  })

  it('requires sign-in', async () => {
    const { router } = renderRoute('/setup')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
