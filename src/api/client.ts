import axios, { type InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
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
