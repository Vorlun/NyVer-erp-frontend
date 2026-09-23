import axios, { type InternalAxiosRequestConfig } from 'axios';

function resolveApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    if (host === '170.168.6.161') {
      return 'http://170.168.6.161:3000/api';
    }
  }

  // Standart VPS Backend manzili (production)
  return 'http://170.168.6.161:3000/api';
}

export const API_BASE_URL = resolveApiBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// JWT Interceptor for Request
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      localStorage.getItem('nyver_auth_token') ||
      localStorage.getItem('nyver_access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for Response
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nyver_auth_token');
      localStorage.removeItem('nyver_access_token');
      localStorage.removeItem('nyver_refresh_token');
      localStorage.removeItem('nyver_auth_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
