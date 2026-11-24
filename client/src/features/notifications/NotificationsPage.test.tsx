import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { formatWhen } from '../../lib/schedule'
import { renderRoute } from '../../test/renderRoute'

// Thandi's sample data: 2 unread ("New request to join", "Request accepted"), 2 read.

describe('Notifications (S19)', () => {
  it('lists notifications with unread indicators and a nav badge', async () => {
    renderRoute('/notifications', 'u-thandi')
    expect(await screen.findByText('2 unread')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Unread: New request to join' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Operator replied' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Notifications, 2 unread' })).toBeInTheDocument()
  })

  it('opening a notification marks it read and goes to the related page', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/notifications', 'u-thandi')
    await user.click(await screen.findByRole('link', { name: 'Unread: Request accepted' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/requests'))
    const n = api.db.notifications.find(
      (x) => x.recipientId === 'u-thandi' && x.title === 'Request accepted',
    )
    expect(n?.isRead).toBe(true)
    expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' })).toBeInTheDocument()
  })

  it('marks one, then all, as read', async () => {
    const user = userEvent.setup()
    renderRoute('/notifications', 'u-thandi')
    await user.click(
      await screen.findByRole('button', { name: 'Mark “New request to join” as read' }),
    )
    expect(await screen.findByText('1 unread')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(await screen.findByText('You’re all caught up.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark all as read' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('filters to unread, kept in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/notifications', 'u-thandi')
    await user.click(await screen.findByRole('button', { name: 'Unread (2)' }))
    expect(router.state.location.search).toBe('?filter=unread')
    expect(screen.getAllByRole('article')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Mark all as read' }))
    expect(await screen.findByText('No unread notifications')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getAllByRole('article')).toHaveLength(4)
  })

  it('has an empty state', async () => {
    const { api } = renderRoute('/notifications', 'u-naledi')
    api.db.notifications = api.db.notifications.filter((n) => n.recipientId !== 'u-naledi')
    expect(await screen.findByText('No notifications yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Notifications' })).toBeInTheDocument()
  })
})

describe('formatWhen', () => {
  // 2026-12-01 10:00 SAST
  const now = new Date('2026-12-01T08:00:00Z')
  it.each([
    ['2026-12-01T06:10:00Z', 'Today, 08:10'],
    ['2026-11-30T16:20:00Z', 'Yesterday, 18:20'],
    ['2026-11-21T06:00:00Z', '21 Nov, 08:00'],
    // 23:30 UTC on the 30th is 01:30 SAST on the 1st.
    ['2026-11-30T23:30:00Z', 'Today, 01:30'],
  ])('%s -> %s', (iso, expected) => {
    expect(formatWhen(iso, now)).toBe(expected)
  })
})
