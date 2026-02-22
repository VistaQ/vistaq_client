import { clearAllCache } from './cache';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://stg-api.vistaq.co/api';

export interface ApiError {
  status: number;
  message: string;
}

export const apiCall = async (endpoint: string, options: any = {}): Promise<any> => {
  const token = localStorage.getItem('authToken');

  const headers = {
    'Content-Type': 'application/json',
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    clearAllCache();
    window.location.href = '/login';
    throw { status: 401, message: 'Session expired. Please log in again.' } as ApiError;
  }

  if (response.status === 204) {
    return null;
  }

  let data: any = {};
  try {
    data = await response.json();
  } catch (_e) {
    // non-JSON body — leave data as {}
  }

  if (!response.ok) {
    const apiMessage = data.error || '';
    let message: string;
    switch (response.status) {
      case 403: message = "You don't have permission to do that."; break;
      case 429: message = "Too many attempts. Please try again later."; break;
      case 500: message = "Something went wrong. Please try again."; break;
      default:  message = apiMessage || `Request failed with status ${response.status}`;
    }
    throw { status: response.status, message } as ApiError;
  }

  return data;
};

export const debugConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const text = await response.text();
    return {
      status: response.ok ? 'success' : 'error',
      message: response.ok ? 'Connected to API' : `HTTP Error: ${response.status}`,
      details: text.substring(0, 100),
      curl: `curl -v ${API_BASE_URL}/health`
    };
  } catch (e: any) {
    return {
      status: 'error',
      message: 'Connection Failed',
      details: e.message,
      curl: `curl -v ${API_BASE_URL}/health`
    };
  }
};
