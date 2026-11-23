import { Link, Outlet } from 'react-router'

/** Minimal shell. The full top navigation is built in the design-system issue (#3). */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-surface-container-lowest focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="bg-primary-container text-on-primary">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-margin-mobile md:px-margin">
          <Link to="/" className="text-headline-sm font-headline-sm">
            CommuteConnect
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
