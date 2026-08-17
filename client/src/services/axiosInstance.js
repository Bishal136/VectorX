// src/services/axiosInstance.js
import axios from 'axios';
import { clearAuth } from '../features/auth/authSlice';

// Store will be injected after it's created (breaks circular dependency)
let store;

export const injectStore = (_store) => {
  store = _store;
};

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    if (store) {
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

    // A 401 only means "your session expired" if this request actually carried a
    // token in the first place. Public endpoints (login, register, verify-otp,
    // forgot/reset-password) can legitimately return 401 for wrong password, wrong
    // OTP, or an unverified account — those are user-facing validation errors, not
    // session expiry, and must be left alone so the calling thunk's rejectWithValue
    // can show the real message instead of the page silently bouncing to /login.
    const hadAuthHeader = Boolean(originalRequest?.headers?.Authorization);

    if (error.response?.status === 401 && hadAuthHeader && !originalRequest._retry) {
      originalRequest._retry = true;
      if (store) {
        store.dispatch(clearAuth());
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;