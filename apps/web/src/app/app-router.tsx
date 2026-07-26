import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { LoginPage } from '../features/auth/login-page';
import { ProtectedRoute } from '../features/auth/protected-route';
import { RegisterPage } from '../features/auth/register-page';
import { HomePage } from '../features/home/home-page';
import { NotFoundPage } from '../features/not-found/not-found-page';
import { CreateOrganizationPage } from '../features/organizations/create-organization-page';
import { MembersPage } from '../features/organizations/members-page';
import { OnboardingPage } from '../features/organizations/onboarding-page';
import { OrganizationProvider } from '../features/organizations/organization-context';
import { OrganizationSettingsPage } from '../features/organizations/organization-settings-page';
import { OrganizationShell } from '../features/organizations/organization-shell';
import { TenantHomePage } from '../features/organizations/tenant-home-page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <OrganizationProvider>
          <OrganizationShell />
        </OrganizationProvider>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <TenantHomePage /> },
      { path: 'onboarding', element: <OnboardingPage /> },
      { path: 'organizations/new', element: <CreateOrganizationPage /> },
      {
        path: 'settings/organization',
        element: <OrganizationSettingsPage />,
      },
      { path: 'settings/members', element: <MembersPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
