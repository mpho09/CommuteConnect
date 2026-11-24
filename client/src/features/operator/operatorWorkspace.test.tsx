import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

type User = ReturnType<typeof userEvent.setup>

const STALE = 'Kempton Park – Sandton Gautrain (DEMO)'
const BUS = 'Tembisa – Rosebank express bus (DEMO)'

async function pickPlace(user: User, label: string, text: string, option: RegExp) {
  await user.type(screen.getByRole('combobox', { name: label }), text)
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('Operator dashboard (S13)', () => {
  it('summarises the business, routes, freshness and scheduled services', async () => {
    renderRoute('/operator', 'u-sipho')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Gauteng Commuter Services Demo' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Verified').length).toBeGreaterThan(0)
    const stale = screen.getByRole('article', { name: STALE })
    expect(within(stale).getByText('Needs confirmation')).toBeInTheDocument()
    expect(within(stale).getByText('Contact for fare')).toBeInTheDocument()

    const table = screen.getByRole('table', { name: 'Scheduled services' })
    expect(within(table).getAllByRole('row')).toHaveLength(1 + 3) // header + Sipho's routes
    expect(screen.getByRole('link', { name: /Add a route/ })).toHaveAttribute(
      'href',
      '/operator/routes/new',
    )
  })

  it('reconfirms a stale listing (BR11)', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/operator', 'u-sipho')
    await user.click(await screen.findByRole('button', { name: `Reconfirm listing ${STALE}` }))
    expect(await screen.findByText('Listing confirmed')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        within(screen.getByRole('article', { name: STALE })).queryByText('Needs confirmation'),
      ).not.toBeInTheDocument(),
    )
    const r = api.db.routes.find((x) => x.id === 'r-taxi-kempton-sandton')!
    expect(Date.now() - Date.parse(r.lastConfirmedAt)).toBeLessThan(60_000)
  })

  it('deactivates a route', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/operator', 'u-sipho')
    await user.click(await screen.findByRole('button', { name: `Deactivate ${BUS}` }))
    expect(await screen.findByText('Route deactivated')).toBeInTheDocument()
    expect(api.db.routes.find((x) => x.id === 'r-bus-tembisa-rosebank')?.status).toBe('inactive')
  })

  it('shows replied enquiries', async () => {
    renderRoute('/operator', 'u-sipho')
    expect(
      await screen.findByText(/Yes, all morning taxis stop at Midrand Gautrain/),
    ).toBeInTheDocument()
  })

  it('locks route changes for unverified operators but lets them reply to enquiries', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/operator', 'u-lerato')
    expect(await screen.findByText(/unlocks once an admin verifies/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Add a route/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Edit/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reply' }))
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(screen.getByText('Write a reply.')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/Reply to/), 'Yes, we have space from Monday.')
    await user.click(screen.getByRole('button', { name: 'Send reply' }))
    expect(await screen.findByText('Reply sent')).toBeInTheDocument()
    expect(api.db.enquiries.find((e) => e.id === 'enq-1')).toMatchObject({
      status: 'responded',
      response: 'Yes, we have space from Monday.',
    })
  })
})

describe('Route editor (S14)', () => {
  it('validates, then publishes a route with stops and "Contact for fare" (BR10)', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/operator/routes/new', 'u-sipho')
    await user.click(await screen.findByRole('button', { name: /Publish route/ }))
    const summary = screen.getByRole('alert', { name: 'There is a problem' })
    expect(within(summary).getByText(/Give the route a name/)).toBeInTheDocument()
    expect(within(summary).getByText(/Enter the fare in rands/)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/Route name/), 'Ivory Park – Midrand early taxi')
    await pickPlace(user, 'Starting point', 'Ivory', /Ivory Park/)
    await pickPlace(user, 'Destination', 'Midrand CBD', /Midrand CBD/)
    await user.click(screen.getByRole('button', { name: /Add a stop/ }))
    await pickPlace(user, 'Stop 1', 'Rabie', /Rabie Ridge/)
    await user.type(screen.getByLabelText(/When does it run/), 'Weekdays 05:00–08:00, every 15 min')
    await user.click(screen.getByRole('radio', { name: /Contact for fare/ }))
    expect(screen.queryByLabelText(/Fare \(R\)/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Publish route/ }))

    expect(await screen.findByText('Route published')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/operator'))
    expect(api.db.routes.at(-1)).toMatchObject({
      routeName: 'Ivory Park – Midrand early taxi',
      fareType: 'contact',
      fareCents: null,
      stops: [{ placeId: 'rabie-ridge' }],
      status: 'active',
    })
  })

  it('edits an existing route', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/operator/routes/r-bus-tembisa-rosebank/edit', 'u-sipho')
    expect(await screen.findByLabelText(/Route name/)).toHaveValue(BUS)
    expect(screen.getByRole('combobox', { name: 'Stop 1' })).toHaveValue('Sandton Gautrain Station')
    expect(screen.getByRole('radio', { name: /Starting from/ })).toBeChecked()
    const fare = screen.getByLabelText(/Fare \(R\)/)
    expect(fare).toHaveValue('35.00')

    await user.clear(fare)
    await user.type(fare, '40,50')
    await user.click(screen.getByRole('button', { name: /Save changes/ }))
    expect(await screen.findByText('Route updated')).toBeInTheDocument()
    expect(api.db.routes.find((r) => r.id === 'r-bus-tembisa-rosebank')?.fareCents).toBe(4050)
  })

  it('is locked until the operator is verified (BR9)', async () => {
    renderRoute('/operator/routes/new', 'u-lerato')
    expect(await screen.findByText('Routes unlock once you’re verified')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Check verification status' })).toHaveAttribute(
      'href',
      '/operator/verification',
    )
  })
})
