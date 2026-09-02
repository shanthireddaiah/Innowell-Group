// API Client Utility
const getDefaultApiBase = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname || 'localhost';
    // Local development and LAN access
    if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.')) {
      return `http://${host}:8000/api`;
    }
    // Production domain with reverse proxy
    if (window.location.origin && !window.location.port) {
      return `${window.location.origin}/api`;
    }
  }
  return 'http://localhost:8000/api';
};

const API_BASE = getDefaultApiBase().replace(/\/$/, '');

export function getAuthToken() {
  return localStorage.getItem('innowell_jwt_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('innowell_jwt_token', token);
  } else {
    localStorage.removeItem('innowell_jwt_token');
  }
}

export async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let targetUrl = API_BASE.startsWith('http') 
    ? (API_BASE.endsWith('/api') ? `${API_BASE}${cleanEndpoint}` : `${API_BASE}/api${cleanEndpoint}`)
    : `/api${cleanEndpoint}`;

  try {
    response = await fetch(targetUrl, {
      ...options,
      headers
    });
  } catch (err) {
    // Local fallback to direct 127.0.0.1:8000
    try {
      const fallbackUrl = `http://127.0.0.1:8000/api${cleanEndpoint}`;
      response = await fetch(fallbackUrl, {
        ...options,
        headers
      });
    } catch (fallbackErr) {
      // Relative proxy fallback
      try {
        const proxyUrl = `/api${cleanEndpoint}`;
        response = await fetch(proxyUrl, {
          ...options,
          headers
        });
      } catch (proxyErr) {
        throw new Error(`Backend server unreachable at ${targetUrl}. Please ensure the backend is running on port 8000.`);
      }
    }
  }

  if (response.status === 401) {
    // Session expired or unauthenticated
    setAuthToken('');
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
      window.location.href = '/login';
    }
  }

  let data = {};
  const text = await response.text();
  try {
    data = JSON.parse(text);
  } catch (e) {
    if (response.status >= 500) {
      data = { detail: `Server Error (${response.status}): Backend service is unavailable.` };
    } else {
      data = { detail: text || `HTTP ${response.status} Error: ${response.statusText}` };
    }
  }

  if (!response.ok) {
    throw new Error(data.detail || `An API error occurred (${response.status})`);
  }
  return data;
}
