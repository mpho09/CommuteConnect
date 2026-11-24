import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'
import type { SavedSearch } from '../search/savedSearches'

afterEach(() => localStorage.clear())

const section = (name: string) => screen.getByRole('region', { name })

describe('Commuter dashboard (S5)', () => {
  it('greets the user and prefills quick search with their usual commute', async () => {
    renderRoute('/commuter', 'u-thandi')
    expect(await screen.findByRole('heading', { level: 1, name: /, Thandi$/ })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Pickup area' })).toHaveValue(
      'Tembisa Plaza',
    )
    expect(screen.getByRole('combobox', { name: 'Destination' })).toHaveValue(
      'Midrand Gautrain Station',
    )
  })

  it('shows journeys the user rides and publishes, with status chips', async () => {
    renderRoute('/commuter', 'u-thandi')
    const upcoming = await screen.findByRole('region', { name: 'Upcoming journeys' })
    await waitFor(() => expect(within(upcoming).getAllByRole('article')).toHaveLength(2))
    expect(within(upcoming).getByText('You’re riding')).toBeInTheDocument()
    expect(within(upcoming).getByText('You’re driving')).toBeInTheDocument()
    expect(within(upcoming).getByText('With Lerato M.')).toBeInTheDocument()
  })

  it('lists pending join requests and open enquiries, but not finished ones', async () => {
    renderRoute('/commuter', 'u-thandi')
    const requests = await screen.findByRole('region', { name: 'Active requests' })
    await waitFor(() => expect(within(requests).getAllByRole('listitem')).toHaveLength(3))
    expect(within(requests).getAllByText('Join request')).toHaveLength(1)
    expect(within(requests).getAllByText('Enquiry')).toHaveLength(2)
    expect(within(requests).getByText('Replied')).toBeInTheDocument()
    expect(within(requests).queryByText('Cancelled')).not.toBeInTheDocument()
  })

  it('shows empty states with a next action, and the verify-email reminder', async () => {
    renderRoute('/commuter', 'u-naledi')
    expect(await screen.findByText('Verify your email')).toBeInTheDocument()

    expect(await screen.findByText('No upcoming journeys')).toBeInTheDocument()
    expect(
      within(section('Upcoming journeys')).getByRole('link', { name: /Find transport/ }),
    ).toHaveAttribute('href', '/search')
    expect(await screen.findByText('No active requests')).toBeInTheDocument()
    expect(within(section('Saved searches')).getByText('No saved searches')).toBeInTheDocument()
  })

  it('re-runs and removes saved searches', async () => {
    const saved: SavedSearch[] = [
      {
        id: 's-1',
        query: {
          origin: { id: 'tembisa-plaza', label: 'Tembisa Plaza' },
          destination: { id: 'sandton-gautrain', label: 'Sandton Gautrain Station' },
          time: '06:30',
          frequency: 'recurring',
        },
        savedAt: '2026-11-01T00:00:00.000Z',
      },
    ]
    localStorage.setItem('cc.savedSearches.u-thandi', JSON.stringify(saved))
    const user = userEvent.setup()
    renderRoute('/commuter', 'u-thandi')

    const link = await screen.findByRole('link', {
      name: /Tembisa Plaza to Sandton Gautrain Station/,
    })
    expect(link.getAttribute('href')).toMatch(
      /^\/search\/results\?from=tembisa-plaza&.*to=sandton-gautrain.*&frequency=recurring&date=\d{4}-\d{2}-\d{2}&time=06%3A30$/,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Remove saved search Tembisa Plaza to Sandton Gautrain Station',
      }),
    )
    expect(within(section('Saved searches')).getByText('No saved searches')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('cc.savedSearches.u-thandi')!)).toEqual([])
  })
})
