import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import { HomePage } from '../features/home/home-page';
import { NotFoundPage } from '../features/not-found/not-found-page';

const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
