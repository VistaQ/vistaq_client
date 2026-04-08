import { apiCall, getTenantSlug } from './apiClient';

export async function forgotPassword(email: string): Promise<void> {
  // Pass the current origin so the backend forwards it to Supabase as redirectTo.
  // This ensures the reset link in the email points to the correct environment
  // (staging, production, or localhost) rather than a hardcoded URL.
  const redirectTo = `${window.location.origin}/login`;
  await apiCall('/auth/forgot-password', {
    method: 'POST',
    data: { email, redirectTo },
    headers: { 'X-Tenant-Slug': getTenantSlug() },
  });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiCall('/auth/reset-password', {
    method: 'POST',
    data: { token, newPassword },
  });
}
