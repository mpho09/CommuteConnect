import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createMockApi } from '../../lib/api/mock/mockApi'
import { renderRoute } from '../../test/renderRoute'

const PATH = '/commuter/journeys'

const card = (name: RegExp) =>
  screen.getAllByRole('article').find((a) => within(a).queryByRole('link', { name }))!

describe('Journey management (S10)', () => {
  it('accepts a pending request and takes a seat (BR8)', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(PATH, 'u-thandi')
    const seatsBefore = api.db.journeys.find((j) => j.id === 'j-thandi-evening')!.seatsAvailable

    const panel = await screen.findByRole('region', { name: /Requests waiting for you/ })
    expect(within(panel).getByText('Kabelo M.')).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Accept Kabelo M.' }))

    expect(await screen.findByText('Request accepted')).toBeInTheDocument()
    expect(api.db.requests.find((r) => r.id === 'req-kabelo-thandi')?.status).toBe('accepted')
    expect(api.db.journeys.find((j) => j.id === 'j-thandi-evening')?.seatsAvailable).toBe(
      seatsBefore - 1,
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: /Requests waiting for you/ }),
      ).not.toBeInTheDocument(),
    )
  })

  it('declines a request', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(PATH, 'u-kabelo')
    await user.click(await screen.findByRole('button', { name: 'Decline Thandi N.' }))
    expect(await screen.findByText('Request declined')).toBeInTheDocument()
    expect(api.db.requests.find((r) => r.id === 'req-thandi-kabelo')?.status).toBe('rejected')
  })

  it('groups journeys by status, shows Full, and links recurring trips', async () => {
    const user = userEvent.setup()
    renderRoute(PATH, 'u-kabelo')
    expect(await screen.findByRole('tab', { name: /Active \(2\)/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByText('Full: no seats available')).toBeInTheDocument()
    const nextTrips = await screen.findAllByRole('link', { name: /· \d{2}:\d{2}/ })
    expect(nextTrips[0].getAttribute('href')).toMatch(
      /^\/commuter\/journeys\/j-kabelo-weekdays\/occurrences\//,
    )

    await user.click(screen.getByRole('tab', { name: /Ended/ }))
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
  })

  it('pauses and resumes a journey', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(PATH, 'u-thandi')
    await screen.findByRole('tab', { name: /Active/ })
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(await screen.findByText('Journey paused')).toBeInTheDocument()
    expect(api.db.journeys.find((j) => j.id === 'j-thandi-evening')?.status).toBe('paused')

    await user.click(screen.getByRole('tab', { name: /Paused \(1\)/ }))
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    expect(await screen.findByText('Journey resumed')).toBeInTheDocument()
    expect(api.db.journeys.find((j) => j.id === 'j-thandi-evening')?.status).toBe('open')
  })

  it('edits seats and notes', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(PATH, 'u-thandi')
    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit journey' })
    const seats = within(dialog).getByLabelText(/Seats still available/)
    await user.clear(seats)
    await user.type(seats, '99')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(within(dialog).getByText(/Your vehicle has \d+ passenger seats/)).toBeInTheDocument()

    await user.clear(seats)
    await user.type(seats, '1')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Journey updated')).toBeInTheDocument()
    expect(api.db.journeys.find((j) => j.id === 'j-thandi-evening')?.seatsAvailable).toBe(1)
  })

  it('cancels a journey with a reason, warning about affected riders (M2)', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(PATH, 'u-kabelo')
    await screen.findByRole('tab', { name: /Active/ })
    const weekdays = card(/Tembisa/)
    await user.click(within(weekdays).getByRole('button', { name: 'Cancel journey' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Cancel this journey?' })
    expect(within(dialog).getByText(/1 rider will be notified/)).toBeInTheDocument()
    expect(within(dialog).getByText('Thandi N.')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText(/Reason/), 'Moving offices')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel journey' }))

    expect(await screen.findByText('Journey cancelled')).toBeInTheDocument()
    expect(api.db.journeys.find((j) => j.id === 'j-kabelo-weekdays')?.status).toBe('cancelled')
    expect(api.db.requests.find((r) => r.id === 'req-thandi-kabelo')).toMatchObject({
      status: 'cancelled',
      cancelReason: 'Moving offices',
    })
  })

  it('shows rides the user has joined', async () => {
    const user = userEvent.setup()
    renderRoute(PATH, 'u-thandi')
    await user.click(await screen.findByRole('tab', { name: /Rides I’ve joined \(1\)/ }))
    expect(await screen.findByText(/with Lerato M\./)).toBeInTheDocument()
  })

  it('has empty states with a next step', async () => {
    const user = userEvent.setup()
    renderRoute(PATH, 'u-naledi')
    expect(await screen.findByText('No active journeys')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Rides I’ve joined/ }))
    expect(screen.getByRole('link', { name: /See possible matches/ })).toHaveAttribute(
      'href',
      '/commuter/matches',
    )
  })
})

describe('Journey occurrence (S11)', () => {
  it('skips one trip and leaves the others scheduled', async () => {
    const user = userEvent.setup()
    // Seed ids are deterministic, so look one up without rendering.
    const now = new Date().toISOString()
    const upcoming = (db: ReturnType<typeof createMockApi>['db']) =>
      db.occurrences.filter(
        (o) =>
          o.journeyId === 'j-kabelo-weekdays' && o.status === 'scheduled' && o.departureAt > now,
      )
    const target = upcoming(createMockApi().db)[0]
    const { api } = renderRoute(
      `/commuter/journeys/j-kabelo-weekdays/occurrences/${target.id}`,
      'u-kabelo',
    )

    expect(await screen.findByText('Scheduled')).toBeInTheDocument()
    expect(screen.getByText('Thandi N.')).toBeInTheDocument()
    expect(screen.getByText('Regular rider')).toBeInTheDocument()
    const othersBefore = upcoming(api.db).length - 1

    await user.click(screen.getByRole('button', { name: 'Skip this trip' }))
    const dialog = screen.getByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Skip trip' }))
    expect(await screen.findByText('Trip skipped')).toBeInTheDocument()
    expect(await screen.findByText('Skipped')).toBeInTheDocument()
    expect(api.db.occurrences.find((o) => o.id === target.id)?.status).toBe('cancelled')
    expect(upcoming(api.db)).toHaveLength(othersBefore)
    expect(othersBefore).toBeGreaterThan(0)
  })
})
