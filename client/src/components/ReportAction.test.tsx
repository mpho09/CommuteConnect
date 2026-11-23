import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReportAction } from './ReportAction'

describe('ReportAction', () => {
  it('requires a reason, then submits it with details', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ReportAction subject="this listing" onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Report' }))
    const dialog = screen.getByRole('dialog', { name: 'Report this listing' })
    expect(dialog).toHaveAccessibleDescription(/won’t see who reported them/)

    await user.click(screen.getByRole('button', { name: 'Send report' }))
    expect(screen.getByText('Choose a reason to continue.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'Scam or fraud' }))
    await user.type(
      screen.getByRole('textbox', { name: /Anything else/ }),
      '  Asked for a deposit  ',
    )
    await user.click(screen.getByRole('button', { name: 'Send report' }))

    expect(onSubmit).toHaveBeenCalledWith({ reason: 'fraud', details: 'Asked for a deposit' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
