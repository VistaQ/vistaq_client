export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Derive the tenant slug from the subdomain (e.g. acme.vistaq.co → acme),
 * falling back to the VITE_TENANT_SLUG env var for local dev / staging.
 */
export function getTenantSlug(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  // subdomain exists when there are 3+ parts (e.g. acme.vistaq.co)
  if (parts.length >= 3) {
    return parts[0];
  }
  return import.meta.env.VITE_TENANT_SLUG || '';
}

export interface ApiError {
  status: number;
  message: string;
}

export interface ApiCallOptions {
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
}

export const apiCall = async <T = any>(endpoint: string, options: ApiCallOptions = {}): Promise<T> => {
  const token = localStorage.getItem('authToken');

  const slug = getTenantSlug();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(slug ? { 'X-Tenant-Slug': slug } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = { ...options, headers, cache: 'no-store' as RequestCache };

  if (options.data) {
    config.body = JSON.stringify(options.data);
    delete config.data;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  let response: Response;

  try {
    response = await fetch(url, config);
  } catch (_e) {
    throw { status: 0, message: 'Unable to connect. Check your internet connection.' } as ApiError;
  }

  if (response.status === 401) {
    // Only hard-redirect when a token existed (session expired).
    // Unauthenticated calls (no token) should just throw so the caller handles it.
    if (localStorage.getItem('authToken')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.location.href = '/login';
    }
    throw { status: 401, message: 'Session expired. Please log in again.' } as ApiError;
  }

  if (response.status === 204) {
    return null as T;
  }

  let data: unknown = {};
  try {
    data = await response.json();
  } catch (_e) {
    // non-JSON body — leave data as {}
  }

  if (!response.ok) {
    const apiMessage = (data as Record<string, unknown>).message as string || '';
    let message: string;
    switch (response.status) {
      case 403: message = "You don't have permission to do that."; break;
      case 429: message = "Too many attempts. Please try again later."; break;
      case 500: message = "Something went wrong. Please try again."; break;
      default:  message = apiMessage || `Request failed with status ${response.status}`;
    }
    throw { status: response.status, message } as ApiError;
  }

  return data as T;
};
