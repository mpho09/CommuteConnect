import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

/** The open (cancellable) sent-request card for a journey with this driver. */
const cardWith = async (driver: string) =>
  (await screen.findAllByText(new RegExp(`with ${driver}`)))
    .map((el) => el.closest('article') as HTMLElement)
    .find((a) => within(a).queryByRole('button', { name: 'Cancel request' }))!

describe('My requests (S18)', () => {
  it('lists sent requests and enquiries with status and responses', async () => {
    renderRoute('/requests', 'u-thandi')
    expect(await screen.findByRole('tab', { name: /Sent \(5\)/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const articles = await screen.findAllByRole('article')
    expect(articles).toHaveLength(5)
    // Open items come first.
    expect(within(articles[0]).queryByText('Cancelled')).not.toBeInTheDocument()
    expect(screen.getByText(/Yes, all morning taxis stop at Midrand Gautrain/)).toBeInTheDocument()
    expect(screen.getByText('Waiting for the operator to reply.')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Cancel request' })).toHaveLength(2)
  })

  it('cancels a pending request without a reason (BR14)', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/requests', 'u-thandi')
    const card = await cardWith('Kabelo M.')
    await user.click(within(card).getByRole('button', { name: 'Cancel request' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Cancel your request?' })
    expect(within(dialog).getByText(/won’t need to respond/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel request' }))

    expect(await screen.findByText('Request cancelled')).toBeInTheDocument()
    expect(api.db.requests.find((r) => r.id === 'req-thandi-kabelo')?.status).toBe('cancelled')
  })

  it('needs a reason to cancel an accepted request, and notifies the driver (M1)', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/requests', 'u-thandi')
    const seats = api.db.journeys.find((j) => j.id === 'j-lerato-mwf')!.seatsAvailable
    const card = await cardWith('Lerato M.')
    await user.click(within(card).getByRole('button', { name: 'Cancel request' }))

    const dialog = screen.getByRole('alertdialog')
    expect(within(dialog).getByText(/Lerato M\. will be notified/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel request' }))
    expect(within(dialog).getByText('Tell Lerato M. why you’re cancelling.')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText(/Reason/), 'Changed jobs')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel request' }))
    expect(await screen.findByText('Lerato M. has been notified.')).toBeInTheDocument()

    expect(api.db.requests.find((r) => r.id === 'req-thandi-lerato')).toMatchObject({
      status: 'cancelled',
      cancelReason: 'Changed jobs',
    })
    expect(api.db.journeys.find((j) => j.id === 'j-lerato-mwf')?.seatsAvailable).toBe(seats + 1)
    expect(
      api.db.notifications.some(
        (n) => n.recipientId === 'u-lerato' && n.type === 'request_cancelled',
      ),
    ).toBe(true)
  })

  it('accepts a received request', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/requests', 'u-thandi')
    await user.click(await screen.findByRole('tab', { name: /Received/ }))
    expect(router.state.location.search).toBe('?tab=received')
    await user.click(await screen.findByRole('button', { name: 'Accept Kabelo M.' }))
    expect(await screen.findByText('Request accepted')).toBeInTheDocument()
    expect(api.db.requests.find((r) => r.id === 'req-kabelo-thandi')?.status).toBe('accepted')
    await waitFor(() => expect(screen.getByText('Accepted')).toBeInTheDocument())
  })

  it('has empty states', async () => {
    const user = userEvent.setup()
    renderRoute('/requests', 'u-naledi')
    expect(await screen.findByText('You haven’t sent any requests')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Received/ }))
    expect(screen.getByText('Nothing received yet')).toBeInTheDocument()
  })
})
