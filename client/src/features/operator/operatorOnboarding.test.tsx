import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderRoute, type PersonaId } from '../../test/renderRoute'

const pdf = (name = 'proof.pdf') => new File(['%PDF-1.4 sample'], name, { type: 'application/pdf' })

describe('Operator setup (S15)', () => {
  it('validates, saves the business profile and continues to verification', async () => {
    const user = userEvent.setup()
    const { api, router } = renderRoute('/operator/setup', 'u-kabelo')

    const name = await screen.findByLabelText(/Business or association name/)
    await user.click(screen.getByRole('button', { name: /Save and continue/ }))
    const summary = screen.getByRole('alert', { name: 'There is a problem' })
    expect(
      within(summary).getByText('Enter your business or association name.'),
    ).toBeInTheDocument()
    expect(within(summary).getByText('Describe where you operate.')).toBeInTheDocument()

    await user.type(name, 'Kabelo Shuttles')
    await user.type(
      screen.getByLabelText(/About your service/),
      'Weekday shuttle from Kempton Park to Waterfall City.',
    )
    await user.type(screen.getByLabelText(/Service area/), 'Kempton Park and Midrand')
    await user.click(screen.getByRole('button', { name: /Save and continue/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/operator/verification'))
    const op = api.db.operators.find((o) => o.ownerId === 'u-kabelo')
    expect(op).toMatchObject({
      businessName: 'Kabelo Shuttles',
      contactEmail: 'kabelo.sample@example.com',
      verificationStatus: 'pending',
    })
    expect(await screen.findByText('0 of 3 required uploaded')).toBeInTheDocument()
  })

  it('needs a verified email (BR1)', async () => {
    renderRoute('/operator/setup', 'u-naledi')
    expect(
      await screen.findByText('Verify your email to apply as an operator.'),
    ).toBeInTheDocument()
  })

  it('sends existing applicants to verification', async () => {
    const { router } = renderRoute('/operator/setup', 'u-lerato')
    await waitFor(() => expect(router.state.location.pathname).toBe('/operator/verification'))
  })
})

describe('Verification (S16)', () => {
  it('tracks required documents and locks routes until verified (BR9)', async () => {
    renderRoute('/operator/verification', 'u-lerato')
    expect(await screen.findByText('2 of 3 required uploaded')).toBeInTheDocument()
    expect(screen.getAllByText('Verification pending').length).toBeGreaterThan(0)
    expect(screen.getByText(/Upload the required documents below/)).toBeInTheDocument()
    expect(screen.getByText('Publishing routes unlocks once you’re verified.')).toBeInTheDocument()
    expect(screen.getByText('SAMPLE-operating-licence.pdf')).toBeInTheDocument()
  })

  it('rejects the wrong file type or size before uploading', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { api } = renderRoute('/operator/verification', 'u-lerato')
    const card = await screen.findByRole('article', { name: 'Proof of business address' })

    await user.upload(
      within(card).getByLabelText(/Upload Proof of business address/),
      new File(['x'], 'photo.gif', { type: 'image/gif' }),
    )
    expect(within(card).getByRole('alert')).toHaveTextContent('Upload a PDF, JPG or PNG file.')

    await user.upload(
      within(card).getByLabelText(/Upload Proof of business address/),
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' }),
    )
    expect(within(card).getByRole('alert')).toHaveTextContent('Files must be 5 MB or smaller.')
    expect(
      api.db.operators.find((o) => o.id === 'op-midrand')?.documents.map((d) => d.documentType),
    ).not.toContain('proof_of_address')
  })

  it('uploads, then removes a document', async () => {
    const user = userEvent.setup()
    const { api } = renderRoute('/operator/verification', 'u-lerato')
    const card = await screen.findByRole('article', { name: 'Proof of business address' })

    await user.upload(within(card).getByLabelText(/Upload Proof of business address/), pdf())
    expect(await screen.findByText('Proof of business address uploaded')).toBeInTheDocument()
    expect(await screen.findByText('3 of 3 required uploaded')).toBeInTheDocument()
    expect(within(card).getByText('proof.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Your documents are in/)).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: 'Remove Proof of business address' }))
    expect(await screen.findByText('Proof of business address removed')).toBeInTheDocument()
    expect(
      api.db.operators.find((o) => o.id === 'op-midrand')?.documents.map((d) => d.documentType),
    ).not.toContain('proof_of_address')
  })

  it('shows the rejection reason', async () => {
    renderRoute('/operator/verification', 'u-owner3' as PersonaId)
    expect(await screen.findByText(/Operating licence document was unreadable/)).toBeInTheDocument()
    expect(screen.getByText(/Upload corrected documents/)).toBeInTheDocument()
  })

  it('confirms verified operators and locks their documents', async () => {
    renderRoute('/operator/verification', 'u-sipho')
    expect(await screen.findByText(/You’re verified/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to operator dashboard' })).toHaveAttribute(
      'href',
      '/operator',
    )
    expect(screen.queryByText(/^Upload$/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })
})
