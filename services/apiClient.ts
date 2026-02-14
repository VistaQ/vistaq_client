
// Base URL for the Staging Environment
export const API_BASE_URL = "https://stg-api.vistaq.co/api";

// Helper to get token
const getToken = () => localStorage.getItem('vistaq_token');

interface RequestOptions extends RequestInit {
  data?: any;
}

/**
 * Generic API Fetch Wrapper
 * Handles Headers, Auth Tokens, and JSON parsing
 */
export const apiRequest = async <T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers as any,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
    mode: 'cors', // Explicitly set CORS
    ...options,
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;

  try {
    const response = await fetch(`${API_BASE_URL}/${cleanEndpoint}`, config);

    // Handle 401 Unauthorized (Token expired)
    if (response.status === 401) {
      localStorage.removeItem('vistaq_token');
      // Throw specific error to be handled
      throw new Error("Unauthorized");
    }

    // Handle non-200 responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `API Error: ${response.statusText}`);
    }

    // Return JSON or null (for 204 No Content)
    if (response.status === 204) {
      return null as any;
    }

    return await response.json();
  } catch (error) {
    // Downgrade to warn to avoid cluttering console during expected failures (e.g. auth check)
    console.warn(`API Request Failed: ${endpoint}`, error);
    throw error;
  }
};
