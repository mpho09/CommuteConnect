import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Checkbox, Field, Input } from './Field'

describe('Field', () => {
  it('links label, hint and error to the control', () => {
    render(
      <Field
        label="Origin"
        hint="Choose a suburb."
        error="Choose a location from the list."
        required
      >
        {(c) => <Input {...c} />}
      </Field>,
    )
    const input = screen.getByRole('textbox', { name: 'Origin' })
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Choose a suburb. Choose a location from the list.')
  })

  it('is valid with no error', () => {
    render(<Field label="Origin">{(c) => <Input {...c} />}</Field>)
    expect(screen.getByRole('textbox', { name: 'Origin' })).not.toHaveAttribute('aria-invalid')
  })
})

describe('Checkbox', () => {
  it('toggles via its label', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="I accept the Terms" />)
    await user.click(screen.getByText('I accept the Terms'))
    expect(screen.getByRole('checkbox', { name: 'I accept the Terms' })).toBeChecked()
  })
})

describe('Button', () => {
  it('is disabled and busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })
})
