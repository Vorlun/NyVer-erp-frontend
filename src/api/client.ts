import axios, { type InternalAxiosRequestConfig } from 'axios';

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // 1. Lokal kompyuterda (localhost)
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }

    // 2. Vercel yoki HTTPS da brauzer HTTP ni block qilmasligi (Mixed Content) uchun
    // vercel.json dagi reverse proxy (/api) ga so'rov yuboriladi
    if (protocol === 'https:' || host.includes('vercel.app')) {
      return '/api';
    }

    // 3. Agar to'g'ridan-to'g'ri VPS IP orqali ochilgan bo'lsa
    if (host === '170.168.6.161') {
      return 'http://170.168.6.161:3000/api';
    }
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  return '/api';
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
