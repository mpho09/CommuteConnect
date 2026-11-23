import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusChip, VerificationChip } from './Chip'

describe('VerificationChip', () => {
  it.each([
    ['pending', 'Verification pending'],
    ['under_review', 'Under review'],
    ['verified', 'Verified'],
    ['rejected', 'Not verified'],
    ['suspended', 'Suspended'],
  ] as const)('shows %s as text, not colour alone', (status, label) => {
    const { container } = render(<VerificationChip status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
    // Icon is decorative; the text carries the meaning.
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('StatusChip', () => {
  it.each([
    ['pending', 'Pending'],
    ['accepted', 'Accepted'],
    ['rejected', 'Declined'],
    ['cancelled', 'Cancelled'],
    ['closed', 'Closed'],
  ] as const)('labels %s', (status, label) => {
    render(<StatusChip status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
