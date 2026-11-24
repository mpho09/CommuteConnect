import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

const PATH = '/commuter/matches'

describe('Match suggestions (S12)', () => {
  it('shows possible matches with plain reasons and the BR13 caveat, never a score', async () => {
    renderRoute(PATH, 'u-thandi')
    expect(
      await screen.findByText('A match is a suggestion, not a booking or a safety guarantee.'),
    ).toBeInTheDocument()

    const cards = await screen.findAllByRole('article')
    expect(cards.length).toBeGreaterThan(0)
    for (const c of cards) {
      expect(within(c).getByText('Possible match')).toBeInTheDocument()
      expect(within(c).getByRole('list', { name: 'Why this may suit you' })).toBeInTheDocument()
      expect(c).not.toHaveTextContent(/%|score|perfect/i)
    }
    expect(screen.getByText(/Tembisa Plaza to Midrand Gautrain Station/)).toBeInTheDocument()
  })

  it('links to the listing to request, and shows an existing request', async () => {
    renderRoute(PATH, 'u-thandi')
    const link = await screen.findByRole('link', { name: /Tembisa.*Midrand/ })
    expect(link).toHaveAttribute('href', '/listings/journeys/j-kabelo-weekdays')
    const card = link.closest('article')!
    expect(await within(card).findByText('Pending')).toBeInTheDocument()
    // No request is created by viewing matches.
    expect(screen.queryByRole('button', { name: /Request/ })).not.toBeInTheDocument()
  })

  it('filters by seats needed, kept in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(PATH, 'u-thandi')
    await screen.findByRole('link', { name: /Tembisa.*Midrand/ })
    await user.selectOptions(screen.getByLabelText('Seats needed'), '3 or more')
    expect(router.state.location.search).toBe('?seats=3')
    expect(screen.queryByRole('link', { name: /Tembisa.*Midrand/ })).not.toBeInTheDocument()
  })

  it('asks for a usual commute when none is set', async () => {
    renderRoute(PATH, 'u-naledi')
    expect(await screen.findByText('Add your usual commute')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Set your usual commute' })).toHaveAttribute(
      'href',
      '/setup',
    )
  })

  it('explains when there are no matches, with next steps', async () => {
    const { api } = renderRoute(PATH, 'u-thandi')
    // Point Thandi's stored commute at a corridor nobody serves.
    const thandi = api.db.users.find((u) => u.id === 'u-thandi')!
    thandi.preferences = {
      ...thandi.preferences,
      usualOriginId: 'pretoria-station',
      usualDestinationId: 'park-station',
    }
    expect(await screen.findByText('No possible matches yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Publish a journey/ })).toHaveAttribute(
      'href',
      '/commuter/journeys/new',
    )
  })
})
