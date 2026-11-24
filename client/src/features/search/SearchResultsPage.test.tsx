import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

afterEach(() => localStorage.clear())

const BASE =
  '/search/results?from=tembisa-plaza&fromLabel=Tembisa+Plaza' +
  '&to=midrand-gautrain&toLabel=Midrand+Gautrain+Station&frequency=recurring'

const operators = () => screen.getByRole('region', { name: /Operator services/ })
const shared = () => screen.getByRole('region', { name: /Community shared journeys/ })

describe('Search results (S7)', () => {
  it('shows operator services and shared journeys in separate sections', async () => {
    renderRoute(BASE)
    expect(
      await screen.findByRole('heading', { level: 1, name: /Tembisa Plaza to Midrand Gautrain/ }),
    ).toBeInTheDocument()
    const ops = await screen.findByRole('region', { name: /Operator services/ })
    expect(within(ops).getByText('Midrand Shuttle Demo')).toBeInTheDocument()
    expect(within(operators()).getByText('Verification pending')).toBeInTheDocument()
    expect(within(shared()).getByText('Shared by Kabelo M.')).toBeInTheDocument()
    expect(within(shared()).getByText(/not confirmed bookings/)).toBeInTheDocument()
    expect(
      screen.getByText(/operator services? and \d+ shared journeys? found/),
    ).toBeInTheDocument()
  })

  it('filters to verified operators and keeps the filter in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(BASE)
    await within(await screen.findByRole('region', { name: /Operator services/ })).findByText(
      'Midrand Shuttle Demo',
    )

    await user.click(screen.getByRole('checkbox', { name: 'Verified operators only' }))
    expect(router.state.location.search).toContain('verified=1')
    await waitFor(() =>
      expect(within(operators()).queryByText('Midrand Shuttle Demo')).not.toBeInTheDocument(),
    )

    await user.selectOptions(screen.getByLabelText('Sort by'), 'Lowest fare')
    expect(router.state.location.search).toContain('sort=fare')
    expect(screen.getByRole('checkbox', { name: 'Verified operators only' })).toBeChecked()
  })

  it('shows only shared journeys when that type is chosen', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(BASE)
    await screen.findByText('Midrand Shuttle Demo')

    await user.selectOptions(screen.getByLabelText('Transport type'), 'Community shared journeys')
    expect(router.state.location.search).toContain('type=shared')
    expect(await screen.findByText('Shared by Kabelo M.')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Operator services/ })).not.toBeInTheDocument()
  })

  it('explains when nothing matches and offers to clear filters', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(`${BASE}&type=coach`)
    expect(await screen.findByText('No options found for these details.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(router.state.location.search).not.toContain('type=')
    expect(await screen.findByText('Midrand Shuttle Demo')).toBeInTheDocument()
  })

  it('rejects past dates with a way to edit the search (BR4)', async () => {
    renderRoute(`${BASE}&date=2020-01-06`)
    expect(
      await screen.findByRole('heading', { name: 'These search details need changing' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Choose today or a future date.')).toBeInTheDocument()
    const edit = screen.getAllByRole('link', { name: /Edit search/ })[0]
    expect(edit.getAttribute('href')).toMatch(/^\/search\?from=tembisa-plaza/)
  })

  it('shows an error with retry when the search fails', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute(BASE, null, { failureRate: 1 })
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')

    api.setConfig({ failureRate: 0 })
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Midrand Shuttle Demo')).toBeInTheDocument()
  })

  it('lets signed-in users save the search', async () => {
    const user = userEvent.setup()
    renderRoute(BASE, 'u-thandi')
    await user.click(await screen.findByRole('button', { name: 'Save this search' }))
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
    const saved = JSON.parse(localStorage.getItem('cc.savedSearches.u-thandi')!)
    expect(saved[0].query).toMatchObject({
      origin: { id: 'tembisa-plaza' },
      destination: { id: 'midrand-gautrain' },
      frequency: 'recurring',
    })
  })

  it('asks guests to log in to save, returning them to the results', async () => {
    renderRoute(BASE)
    const link = await screen.findByRole('link', { name: 'Log in to save' })
    expect(link.getAttribute('href')).toMatch(/^\/login\?next=%2Fsearch%2Fresults%3Ffrom%3D/)
  })

  it('asks for a search when the URL has none', async () => {
    renderRoute('/search/results')
    expect(await screen.findByText('Start a search')).toBeInTheDocument()
  })
})

describe('Search (S6)', () => {
  it('opens with the current criteria when editing, and searches with the filters', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute(`${BASE.replace('/search/results', '/search')}&type=shuttle`)
    expect(await screen.findByRole('heading', { name: 'Edit your search' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: 'Pickup area' })).toHaveValue(
      'Tembisa Plaza',
    )
    expect(screen.getByLabelText('Transport type')).toHaveValue('shuttle')
    expect(screen.getByLabelText('Departure window')).toBeDisabled()

    await user.type(screen.getByLabelText(/Departure time/), '06:30')
    await user.selectOptions(screen.getByLabelText('Departure window'), '± 30 min')
    await user.click(screen.getByRole('button', { name: 'Search transport' }))

    expect(router.state.location.pathname).toBe('/search/results')
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('type')).toBe('shuttle')
    expect(params.get('time')).toBe('06:30')
    expect(params.get('window')).toBe('30')
  })

  it('prefills a signed-in commuter’s usual commute', async () => {
    renderRoute('/search', 'u-thandi')
    expect(await screen.findByRole('combobox', { name: 'Pickup area' })).toHaveValue(
      'Tembisa Plaza',
    )
    expect(screen.getByRole('heading', { name: 'Find transport' })).toBeInTheDocument()
  })
})
