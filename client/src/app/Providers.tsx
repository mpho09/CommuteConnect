import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ToastProvider } from '../components/ui/toast/ToastProvider'
import { ApiProvider } from '../lib/api/ApiProvider'
import type { ApiClient } from '../lib/api/client'
import { createQueryClient } from '../lib/queryClient'

export function Providers({
  api,
  queryClient: providedClient,
  children,
}: {
  api: ApiClient
  queryClient?: QueryClient
  children: ReactNode
}) {
  const [queryClient] = useState(() => providedClient ?? createQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <ApiProvider api={api}>
        <ToastProvider>{children}</ToastProvider>
      </ApiProvider>
    </QueryClientProvider>
  )
}
