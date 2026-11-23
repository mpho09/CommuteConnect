import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Providers } from './app/Providers'
import { routes } from './app/routes'
import { devSessionFromEnv } from './lib/session/session'

const router = createBrowserRouter(routes)
const session = devSessionFromEnv(import.meta.env.VITE_DEV_ROLE)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers session={session}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
