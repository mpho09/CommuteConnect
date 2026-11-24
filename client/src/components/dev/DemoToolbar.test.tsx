import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute } from '../../test/renderRoute'

describe('DemoToolbar', () => {
  it('switches persona, which unlocks that persona’s areas', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: /Demo data/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Act as' }), 'u-admin')
    expect(await screen.findByRole('link', { name: /^Notifications/ })).toBeInTheDocument()

    await router.navigate('/admin')
    expect(await screen.findByRole('heading', { name: 'Admin dashboard' })).toBeInTheDocument()
  })

  it('can make every request fail to test error states', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/')
    await user.click(await screen.findByRole('button', { name: /Demo data/ }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Simulate errors' }), 'all')
    expect(api.getConfig().failureRate).toBe(1)
  })
})
