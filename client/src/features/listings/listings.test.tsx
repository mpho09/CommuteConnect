import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

const ROUTE = '/listings/routes/r-shuttle-tembisa-midrand'
const JOURNEY = '/listings/journeys/j-lerato-mwf'

describe('Route listing (S8)', () => {
  it('shows operator, verification, route, fare and last-updated date, without contact details', async () => {
    renderRoute(ROUTE)
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.getAllByText('Midrand Shuttle Demo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Verification pending').length).toBeGreaterThan(0)
    expect(screen.getByText('R 25.00')).toBeInTheDocument()
    expect(screen.getByText('Last updated')).toBeInTheDocument()
    expect(screen.getByText(/hasn’t been verified yet/)).toBeInTheDocument()
    expect(screen.queryByText(/@/)).not.toBeInTheDocument() // BR12
    expect(screen.queryByText(/book/i)).not.toBeInTheDocument()
  })

  it('says "Contact for fare" and flags stale listings (BR10, BR11)', async () => {
    renderRoute('/listings/routes/r-taxi-kempton-sandton')
    expect(await screen.findByText('Contact for fare')).toBeInTheDocument()
    expect(
      screen.getByText('This information may be out of date. Confirm details with the provider.'),
    ).toBeInTheDocument()
  })

  it('lists stops in order with "from" fares', async () => {
    renderRoute('/listings/routes/r-bus-tembisa-rosebank')
    expect(await screen.findByText('From R 35.00')).toBeInTheDocument()
    const stops = within(screen.getByRole('region', { name: 'Route and stops' })).getAllByRole(
      'listitem',
    )
    expect(stops).toHaveLength(3)
    expect(stops[1]).toHaveTextContent('About 07:05')
  })

  it('hides suspended listings', async () => {
    renderRoute('/listings/routes/r-coach-pta-jhb')
    expect(await screen.findByText('This listing isn’t available')).toBeInTheDocument()
  })

  it('asks guests to log in and returns them here', async () => {
    renderRoute(ROUTE)
    expect(await screen.findByRole('link', { name: 'Log in to send an enquiry' })).toHaveAttribute(
      'href',
      `/login?next=${encodeURIComponent(ROUTE)}`,
    )
  })

  it('sends a validated enquiry', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(ROUTE, 'u-kabelo')
    await user.click(await screen.findByRole('button', { name: 'Send enquiry' }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }))
    expect(within(dialog).getByText('Write your question for the operator.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/Your question/), 'Do you stop at Allandale?')
    await user.click(within(dialog).getByRole('button', { name: 'Send enquiry' }))
    expect(await screen.findByText('Enquiry sent')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      api.db.enquiries.some(
        (e) => e.commuterId === 'u-kabelo' && e.message === 'Do you stop at Allandale?',
      ),
    ).toBe(true)
  })

  it('lets signed-in users report the listing', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(ROUTE, 'u-thandi')
    const before = api.db.reports.length
    await user.click(await screen.findByRole('button', { name: 'Report' }))
    await user.click(screen.getByRole('radio', { name: 'Inaccurate or outdated information' }))
    await user.click(screen.getByRole('button', { name: 'Send report' }))
    expect(await screen.findByText('Report sent')).toBeInTheDocument()
    expect(api.db.reports).toHaveLength(before + 1)
    expect(api.db.reports.at(-1)).toMatchObject({
      targetType: 'route',
      targetId: 'r-shuttle-tembisa-midrand',
    })
  })
})

describe('Journey listing (S8) and request to join (S17)', () => {
  it('shows approximate areas, schedule, seats and publisher first name only', async () => {
    renderRoute(JOURNEY)
    expect(await screen.findByText('Lerato M.')).toBeInTheDocument()
    expect(screen.getByText('Mon, Wed, Fri')).toBeInTheDocument()
    expect(screen.getByText(/exact meeting point/)).toBeInTheDocument()
    expect(screen.queryByText('Lerato Mokoena')).not.toBeInTheDocument()
  })

  it('requires acknowledging the match caveat before sending (BR13)', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(JOURNEY, 'u-kabelo')
    await user.click(await screen.findByRole('button', { name: 'Request to join' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/not a booking or a safety guarantee/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Send request' }))
    expect(within(dialog).getByText(/Confirm you understand/)).toBeInTheDocument()
    expect(
      api.db.requests.some((r) => r.commuterId === 'u-kabelo' && r.journeyId === 'j-lerato-mwf'),
    ).toBe(false)

    const trips = within(dialog).getByLabelText('Which trips?')
    await user.selectOptions(trips, within(trips).getAllByRole('option')[1])
    await user.type(within(dialog).getByLabelText(/Message/), 'Hi, I work in Midrand.')
    await user.click(within(dialog).getByRole('checkbox', { name: 'I understand' }))
    await user.click(within(dialog).getByRole('button', { name: 'Send request' }))

    expect(await screen.findByText('Request sent')).toBeInTheDocument()
    const sent = api.db.requests.find(
      (r) => r.commuterId === 'u-kabelo' && r.journeyId === 'j-lerato-mwf',
    )
    expect(sent).toMatchObject({ status: 'pending', message: 'Hi, I work in Midrand.' })
    expect(sent?.occurrenceId).toMatch(/^j-lerato-mwf-/)
    // Shows the new request instead of a second "Request to join" (no duplicates).
    expect(await screen.findByText('Your request:')).toBeInTheDocument()
  })

  it('shows an existing request instead of the button', async () => {
    renderRoute('/listings/journeys/j-kabelo-weekdays', 'u-thandi')
    expect(await screen.findByText('Your request:')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request to join' })).not.toBeInTheDocument()
  })

  it('explains why a full journey can’t be requested', async () => {
    renderRoute('/listings/journeys/j-kabelo-full', 'u-thandi')
    expect(await screen.findByText(/no seats available/)).toBeInTheDocument()
  })

  it('points publishers to manage their own journey', async () => {
    renderRoute('/listings/journeys/j-thandi-evening', 'u-thandi')
    expect(await screen.findByText('This is your journey.')).toBeInTheDocument()
  })

  it('blocks unverified accounts with an explanation (BR1)', async () => {
    renderRoute(JOURNEY, 'u-naledi')
    expect(await screen.findByText('Verify your email to request to join.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Request to join' })).not.toBeInTheDocument()
  })

  it('asks guests to log in', async () => {
    renderRoute(JOURNEY)
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Log in to request to join' })).toHaveAttribute(
        'href',
        `/login?next=${encodeURIComponent(JOURNEY)}`,
      ),
    )
  })
})
