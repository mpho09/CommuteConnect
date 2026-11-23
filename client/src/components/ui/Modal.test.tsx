import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { ConfirmDialog, Modal } from './Modal'

function Harness({ dismissible = true }: { dismissible?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit route"
        description="Changes are saved when you press Save."
        dismissible={dismissible}
        footer={<Button onClick={() => setOpen(false)}>Save</Button>}
      >
        <input aria-label="Route name" />
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('is labelled by its title and description', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit route' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Changes are saved when you press Save.')
  })

  it('moves focus inside and traps Tab in both directions', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))

    const close = screen.getByRole('button', { name: 'Close' })
    const input = screen.getByRole('textbox', { name: 'Route name' })
    const save = screen.getByRole('button', { name: 'Save' })

    expect(close).toHaveFocus()
    await user.tab()
    expect(input).toHaveFocus()
    await user.tab()
    expect(save).toHaveFocus()
    await user.tab()
    expect(close).toHaveFocus()
    await user.tab({ shift: true })
    expect(save).toHaveFocus()
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('ignores Escape when not dismissible', async () => {
    const user = userEvent.setup()
    render(<Harness dismissible={false} />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument()
  })
})

describe('ConfirmDialog', () => {
  it('renders as an alertdialog and calls onConfirm', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={onConfirm}
        title="Cancel this journey?"
        confirmLabel="Cancel journey"
        confirmVariant="destructive"
      />,
    )
    expect(screen.getByRole('alertdialog', { name: 'Cancel this journey?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel journey' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('locks both buttons while loading', () => {
    render(
      <ConfirmDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete account?"
        confirmLabel="Delete"
        loading
      />,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Keep it' })).toBeDisabled()
  })
})
