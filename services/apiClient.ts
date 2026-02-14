
export const API_BASE_URL = 'https://stg-api.vistaq.co/api';

export const apiRequest = async (endpoint: string, options: any = {}) => {
  const token = localStorage.getItem('vistaq_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const config = {
    ...options,
    headers,
  };

  if (options.data) {
      config.body = JSON.stringify(options.data);
      delete config.data;
  }

  // Ensure endpoint starts with / if not provided
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${cleanEndpoint}`;

  try {
      const response = await fetch(url, config);

      if (response.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('vistaq_token');
          // Don't try to parse body, it might be empty or text, and we are unauthorized anyway.
          throw new Error("Request failed with status 401");
      }

      if (response.status === 204) {
          return null;
      }

      const data = await response.json();

      if (!response.ok) {
          throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
  } catch (error: any) {
      // Suppress logging for expected 401s to keep console clean
      if (error.message && error.message.includes('401')) {
          console.warn('Authentication expired or invalid. Redirecting to login.');
      } else {
          console.error('API Request Error:', error);
      }
      throw error;
  }
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
