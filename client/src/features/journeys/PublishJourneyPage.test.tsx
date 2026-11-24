import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

type User = ReturnType<typeof userEvent.setup>

async function pickPlace(user: User, label: string, text: string, option: RegExp) {
  await user.type(screen.getByRole('combobox', { name: label }), text)
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('Publish journey (S9)', () => {
  it('lists every problem when submitted empty', async () => {
    const user = userEvent.setup()
    renderRoute('/commuter/journeys/new', 'u-kabelo')
    await user.click(await screen.findByRole('button', { name: 'Preview journey' }))

    const summary = screen.getByRole('alert', { name: 'There is a problem' })
    expect(summary).toHaveFocus()
    expect(within(summary).getByText('Choose a pickup area from the list.')).toBeInTheDocument()
    expect(within(summary).getByText('Choose at least one day.')).toBeInTheDocument()
    expect(
      within(summary).getByText('Offer at least one seat (a whole number).'),
    ).toBeInTheDocument()
    expect(
      within(summary).getByText('Confirm this is a cost-sharing trip you’re making anyway.'),
    ).toBeInTheDocument()
  })

  it('previews, allows editing, then publishes and goes to journey management', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/commuter/journeys/new', 'u-thandi')

    // Thandi's travel days and usual time are prefilled from her profile.
    expect(await screen.findByRole('checkbox', { name: 'Monday' })).toBeChecked()
    await pickPlace(user, 'Pickup area', 'Tembisa', /Tembisa Plaza/)
    await pickPlace(user, 'Destination', 'Midrand Gaut', /Midrand Gautrain/)
    await user.type(screen.getByLabelText('Seats to offer'), '3')
    await user.type(screen.getByLabelText(/Cost-sharing per trip/), '20')
    await user.click(screen.getByRole('checkbox', { name: /won’t charge more than my costs/ }))
    await user.click(screen.getByRole('button', { name: 'Preview journey' }))

    const heading = screen.getByRole('heading', { name: 'Check your journey' })
    expect(heading).toHaveFocus()
    expect(screen.getByText('Tembisa Plaza')).toBeInTheDocument()
    expect(screen.getByText('3 of 4')).toBeInTheDocument()
    expect(screen.getByText('R 20.00 per trip')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit details' }))
    expect(screen.getByLabelText('Seats to offer')).toHaveValue(3)
    await user.click(screen.getByRole('button', { name: 'Preview journey' }))

    const before = api.db.journeys.length
    await user.click(screen.getByRole('button', { name: 'Publish journey' }))
    expect(await screen.findByText('Journey published')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/commuter/journeys'))
    expect(api.db.journeys).toHaveLength(before + 1)
    expect(api.db.journeys.at(-1)).toMatchObject({
      publisherId: 'u-thandi',
      journeyType: 'recurring',
      seatsAvailable: 3,
      costSharingCents: 2000,
      status: 'open',
    })
  })

  it('switches to once-off fields', async () => {
    const user = userEvent.setup()
    renderRoute('/commuter/journeys/new', 'u-kabelo')
    await user.click(await screen.findByRole('radio', { name: /Once-off trip/ }))
    expect(screen.getByLabelText('Date')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Monday' })).not.toBeInTheDocument()
  })

  it('blocks unverified accounts with an explanation (BR1)', async () => {
    renderRoute('/commuter/journeys/new', 'u-naledi')
    expect(await screen.findByText('Verify your email to publish journeys.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Preview journey' })).not.toBeInTheDocument()
  })
})
