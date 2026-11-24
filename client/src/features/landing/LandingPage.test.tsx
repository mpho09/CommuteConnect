import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute, type PersonaId } from '../../test/renderRoute'

const HERO = 'Your journey. More options. Less hassle.'

async function pickPlace(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  text: string,
  option: RegExp,
) {
  await user.type(screen.getByRole('combobox', { name: label }), text)
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('Landing page', () => {
  it('explains the product with search, operator and trust sections', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: HERO })).toBeInTheDocument()
    expect(screen.getByRole('form', { name: 'Search for transport' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How CommuteConnect works' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Two ways to travel' })).toBeInTheDocument()

    const trust = screen.getByRole('region', { name: 'Trust and safety, stated plainly' })
    expect(within(trust).getAllByText(/Verification pending/).length).toBeGreaterThan(0)
    expect(within(trust).getByText(/“Possible match” means/)).toBeInTheDocument()
  })

  it.each<[PersonaId | null, string]>([
    [null, '/signup?next=%2Foperator%2Fsetup'],
    ['u-thandi', '/operator/setup'],
    ['u-sipho', '/operator'],
  ])('sends "List your service" for %s to %s', async (persona, href) => {
    renderRoute('/', persona)
    // Wait for the session to load before reading where the link points.
    if (persona) await screen.findByRole('button', { name: /account menu/ })
    const cta = await screen.findByRole('region', { name: 'Run a transport service?' })
    expect(within(cta).getByRole('link', { name: 'List your service' })).toHaveAttribute(
      'href',
      href,
    )
  })

  it('shows validation and stays put when the search is incomplete', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: 'Search transport' }))
    expect(screen.getByText('Choose a pickup area from the list.')).toBeInTheDocument()
    expect(screen.getByText('Choose a destination from the list.')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Pickup area' })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(router.state.location.pathname).toBe('/')
  })

  it('does not accept typed text that was not picked from the list', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await pickPlace(user, 'Pickup area', 'Tembisa', /Tembisa Plaza/)
    // Editing after picking clears the selection
    await user.type(screen.getByRole('combobox', { name: 'Pickup area' }), 'x')
    await user.click(screen.getByRole('button', { name: 'Search transport' }))
    expect(screen.getByText('Choose a pickup area from the list.')).toBeInTheDocument()
  })

  it('routes a valid search to Search Results with the criteria in the URL', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await screen.findByRole('heading', { level: 1, name: HERO })

    await pickPlace(user, 'Pickup area', 'Tembisa', /Tembisa Plaza/)
    await pickPlace(user, 'Destination', 'Midrand Gaut', /Midrand Gautrain/)
    await user.click(screen.getByRole('radio', { name: 'Recurring commute' }))
    await user.click(screen.getByRole('button', { name: 'Search transport' }))

    expect(router.state.location.pathname).toBe('/search/results')
    const params = new URLSearchParams(router.state.location.search)
    expect(params.get('from')).toBe('tembisa-plaza')
    expect(params.get('to')).toBe('midrand-gautrain')
    expect(params.get('frequency')).toBe('recurring')
    expect(params.get('date')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('supports keyboard selection in the place picker', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    const input = await screen.findByRole('combobox', { name: 'Pickup area' })
    await user.type(input, 'Tembisa')
    await screen.findByRole('option', { name: /Tembisa Plaza/ })
    await user.keyboard('{ArrowDown}{Enter}')
    expect(input).toHaveValue('Tembisa Plaza')
    expect(input).toHaveAttribute('aria-expanded', 'false')
  })
})
