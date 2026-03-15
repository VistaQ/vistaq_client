import { apiCall, getTenantSlug } from './apiClient';

export async function forgotPassword(email: string): Promise<void> {
  await apiCall('/auth/forgot-password', {
    method: 'POST',
    data: { email },
    headers: { 'X-Tenant-Slug': getTenantSlug() },
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiCall('/auth/reset-password', {
    method: 'POST',
    data: { token, newPassword },
  });
}
