import {
  apiRequest,
  apiRequestWithoutResponse,
} from '../../../api/http-client';
import {
  type LoginFormData,
  type PublicUser,
  type RegisterFormData,
  userResponseSchema,
} from '../auth.contracts';

export async function registerUser(
  input: RegisterFormData,
): Promise<PublicUser> {
  const response = await apiRequest('/auth/register', userResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.user;
}

export async function loginUser(input: LoginFormData): Promise<PublicUser> {
  const response = await apiRequest('/auth/login', userResponseSchema, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return response.user;
}

export async function getCurrentUser(): Promise<PublicUser> {
  const response = await apiRequest('/auth/me', userResponseSchema);
  return response.user;
}

export async function logoutUser(): Promise<void> {
  await apiRequestWithoutResponse('/auth/logout', { method: 'POST' });
}
