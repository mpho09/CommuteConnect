import type { RouteObject } from 'react-router'
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage'
import { LoginPage } from '../features/auth/LoginPage'
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage'
import { SignUpPage } from '../features/auth/SignUpPage'
import { CommuterDashboard } from '../features/commuter/CommuterDashboard'
import { LandingPage } from '../features/landing/LandingPage'
import { JourneyListingPage } from '../features/listings/JourneyListingPage'
import { RouteListingPage } from '../features/listings/RouteListingPage'
import { SearchPage } from '../features/search/SearchPage'
import { SearchResultsPage } from '../features/search/SearchResultsPage'
import { ProfileSetupPage } from '../features/setup/ProfileSetupPage'
import { AppLayout } from './AppLayout'
import { RequireAuth } from './RequireAuth'
import { Placeholder } from './routes/Placeholder'

// Screen IDs refer to PRD §8.1. Each placeholder is replaced by its issue.
const page = (path: string, screen: string, title: string): RouteObject => ({
  path,
  element: <Placeholder screen={screen} title={title} />,
})

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      // Public (guest and all users)
      { index: true, element: <LandingPage /> },
      { path: 'signup', element: <SignUpPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'search/results', element: <SearchResultsPage /> },
      { path: 'listings/routes/:routeId', element: <RouteListingPage /> },
      { path: 'listings/journeys/:journeyId', element: <JourneyListingPage /> },
      page('help', 'Help', 'Help & safety'),
      page('terms', 'Legal', 'Terms of Service'),
      page('privacy', 'Legal', 'Privacy Notice'),
      page('forbidden', '403', "You don't have access to this page"),

      // Dev-only component gallery; excluded from production builds.
      ...(import.meta.env.DEV
        ? [
            {
              path: 'dev/ui',
              lazy: () => import('./routes/UiKit').then((m) => ({ Component: m.UiKit })),
            },
          ]
        : []),

      // Any signed-in user
      {
        element: <RequireAuth />,
        children: [
          { path: 'setup', element: <ProfileSetupPage /> },
          page('requests', 'S18', 'My requests'),
          page('notifications', 'S19', 'Notifications'),
          page('settings', 'S20', 'Profile & settings'),
          page('operator/setup', 'S15', 'Operator setup'),
          page('operator/verification', 'S16', 'Verification submission'),
        ],
      },

      // Commuter
      {
        path: 'commuter',
        element: <RequireAuth roles={['commuter']} />,
        children: [
          { index: true, element: <CommuterDashboard /> },
          page('journeys', 'S10', 'Journey management'),
          page('journeys/new', 'S9', 'Publish journey'),
          page('journeys/:journeyId/occurrences/:occurrenceId', 'S11', 'Journey occurrence'),
          page('matches', 'S12', 'Match suggestions'),
        ],
      },

      // Approved operator
      {
        path: 'operator',
        element: <RequireAuth roles={['operator']} />,
        children: [
          { index: true, element: <Placeholder screen="S13" title="Operator dashboard" /> },
          page('routes/new', 'S14', 'New route'),
          page('routes/:routeId/edit', 'S14', 'Edit route'),
        ],
      },

      // Admin
      {
        path: 'admin',
        element: <RequireAuth roles={['admin']} />,
        children: [
          { index: true, element: <Placeholder screen="S21" title="Admin dashboard" /> },
          page('reports', 'S22', 'Reports & moderation'),
        ],
      },

      page('*', '404', 'Page not found'),
    ],
  },
]
