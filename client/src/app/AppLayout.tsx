import { Outlet } from 'react-router'
import { DemoToolbar } from '../components/dev/DemoToolbar'
import { TopNav } from '../components/TopNav'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-surface-container-lowest focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <TopNav />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>
      <DemoToolbar />
    </div>
  )
}
