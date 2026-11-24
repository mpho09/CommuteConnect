import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { Providers } from './app/Providers'
import { routes } from './app/routes'
import { createApi } from './lib/api/createApi'

const router = createBrowserRouter(routes)
const api = createApi()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers api={api}>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>,
)
