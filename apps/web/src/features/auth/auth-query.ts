import { queryOptions } from '@tanstack/react-query';

import { getCurrentUser } from './api/auth-api';

export const authQueryKey = ['auth', 'me'] as const;

export const currentUserQueryOptions = queryOptions({
  queryKey: authQueryKey,
  queryFn: getCurrentUser,
  retry: false,
  staleTime: 30_000,
});
