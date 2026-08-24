// src/services/axiosInstance.js
import axios from 'axios';
import { clearAuth } from '../features/auth/authSlice';

// Store will be injected after it's created (breaks circular dependency)
let store;

export const injectStore = (_store) => {
  store = _store;
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/refresh',
];

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => config.url?.includes(path));
    if (!isPublicAuth && store) {
      const state = store.getState();
      const token = state.auth?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config;
    const isPublicAuth = PUBLIC_AUTH_PATHS.some((path) => originalRequest?.url?.includes(path));

    // Only handle 401 for authenticated endpoints (session expired)
    // Never intercept 401 on login, register, verify-otp, etc.
    if (error.response?.status === 401 && !isPublicAuth && !originalRequest?._retry) {
      originalRequest._retry = true;
      if (store) {
        store.dispatch(clearAuth());
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;