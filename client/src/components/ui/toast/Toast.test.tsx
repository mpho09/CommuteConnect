import { act, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './ToastProvider'
import { useToast, type ToastApi } from './toastContext'

let api: ToastApi
function Grab({ onApi }: { onApi: (a: ToastApi) => void }) {
  const toast = useToast()
  useEffect(() => onApi(toast), [toast, onApi])
  return null
}
const capture = (a: ToastApi) => {
  api = a
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    render(
      <ToastProvider>
        <Grab onApi={capture} />
      </ToastProvider>,
    )
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('announces in a polite live region and auto-dismisses', () => {
    act(() => api.success('Request sent'))
    const region = screen.getByRole('region', { name: 'Notifications' })
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveTextContent('Request sent')

    act(() => vi.advanceTimersByTime(5000))
    expect(region).not.toHaveTextContent('Request sent')
  })

  it('shows errors as alerts for longer', () => {
    act(() => api.error('Couldn’t send request'))
    expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t send request')
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('keeps at most three on screen', () => {
    act(() => {
      ;['One', 'Two', 'Three', 'Four'].forEach((t) => api.show({ title: t }))
    })
    const region = screen.getByRole('region', { name: 'Notifications' })
    expect(region).not.toHaveTextContent('One')
    expect(region).toHaveTextContent('Four')
  })
})
