import { QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ToastProvider } from '../components/ui/toast/ToastProvider'
import { createQueryClient } from '../lib/queryClient'
import type { Session } from '../lib/session/session'
import { SessionProvider } from '../lib/session/SessionProvider'

export function Providers({ session, children }: { session: Session; children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider value={session}>
        <ToastProvider>{children}</ToastProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}
