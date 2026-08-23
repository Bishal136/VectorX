// src/features/auth/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Helper to manage tokens in localStorage -----
const TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
const setTokens = (access, refresh) => {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
};
const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// ----- Async Thunks -----

// 1. Register
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/register', userData);
      return response.data.data; // { id, email, role, isVerified, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

// 2. Verify OTP
export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ email, otp }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/verify-otp', { email, otp });
      return response.data.data; // { isVerified: true, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'OTP verification failed');
    }
  }
);

// 3. Login
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user } = response.data.data;
      setTokens(accessToken, refreshToken);
      return { user, accessToken, refreshToken };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

// 4. Refresh Token
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refresh = getStoredRefreshToken();
      if (!refresh) throw new Error('No refresh token available');
      const response = await axiosInstance.post('/auth/refresh', { refreshToken: refresh });
      const { accessToken } = response.data.data;
      setTokens(accessToken, null); // only update access token, keep refresh
      return accessToken;
    } catch (error) {
      clearTokens();
      return rejectWithValue(error.response?.data?.message || 'Refresh failed');
    }
  }
);

// 5. Logout
export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refresh = getStoredRefreshToken();
      if (refresh) {
        await axiosInstance.post('/auth/logout', { refreshToken: refresh });
      }
      clearTokens();
      return true;
    } catch (error) {
      // Even if server logout fails, clear local tokens
      clearTokens();
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

// 6. Forgot Password
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/forgot-password', { email });
      return response.data.message;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Request failed');
    }
  }
);

// 7. Reset Password
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ email, otp, newPassword }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/auth/reset-password', { email, otp, newPassword });
      return response.data.message;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Password reset failed');
    }
  }
);

// 8. Google OAuth – the redirect happens via window.location, so we need a separate action to handle the callback
export const handleGoogleCallback = createAsyncThunk(
  'auth/googleCallback',
  async (queryParams, { rejectWithValue }) => {
    // queryParams should contain accessToken and refreshToken from URL
    const { accessToken, refreshToken, user } = queryParams;
    if (accessToken && refreshToken && user) {
      setTokens(accessToken, refreshToken);
      return { user, accessToken, refreshToken };
    }
    return rejectWithValue('Invalid OAuth response');
  }
);

// 9. Fetch current user — rehydrates `state.user` on app load using a token that
// survived a page reload (see initialState.token below). Without this, a reload
// leaves you with a valid token but user: null, and isAuthenticated (token && user)
// reads as false even though you're still logged in.
export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/auth/profile');
      return response.data.data; // { name, email, role, isVerified, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to load session');
    }
  }
);

// ----- Initial State -----
const initialState = {
  user: null,               // { id, name, email, role, isVerified, ... }
  token: getStoredToken() || null,
  refreshToken: getStoredRefreshToken() || null,
  location: {
    lat: null,
    lng: null,
    pincode: null,
    source: null,           // 'geo' | 'manual'
  },
  status: 'idle',           // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  // true only when a token survived a reload and we haven't confirmed it's still
  // valid yet. Deliberately separate from `status`/isLoading, which tracks
  // individual form actions (login/register/etc) — conflating the two would make
  // e.g. the Login submit button think it's "loading" during app bootstrap.
  isInitializing: Boolean(getStoredToken()),
};

// ----- Slice -----
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // For manual location updates
    setLocation: (state, action) => {
      state.location = { ...state.location, ...action.payload };
    },
    // For restoring auth from localStorage on app load (optional)
    setAuth: (state, action) => {
      const { user, token, refreshToken } = action.payload;
      state.user = user;
      state.token = token || state.token;
      state.refreshToken = refreshToken || state.refreshToken;
    },
    // Clear auth state manually (used after logout)
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.location = initialState.location;
      state.status = 'idle';
      state.error = null;
      state.isInitializing = false;
      clearTokens();
    },
    // Clear error only
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ----- Register -----
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;  // user is not yet verified
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Verify OTP -----
      .addCase(verifyOtp.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (state.user) {
          state.user.isVerified = action.payload.isVerified;
        }
        state.error = null;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Login -----
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Refresh Token -----
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload; // new access token
        state.error = null;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        // Token refresh failed → clear auth
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.status = 'failed';
        state.error = action.payload;
        clearTokens();
      })

      // ----- Logout -----
      .addCase(logoutUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.location = initialState.location;
        state.status = 'idle';
        state.error = null;
        clearTokens();
      })
      .addCase(logoutUser.rejected, (state, action) => {
        // Still clear local state even on rejection
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.status = 'failed';
        state.error = action.payload;
        clearTokens();
      })

      // ----- Google OAuth Callback -----
      .addCase(handleGoogleCallback.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.status = 'succeeded';
        state.error = null;
      })
      .addCase(handleGoogleCallback.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Fetch Current User (session rehydration on reload) -----
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isInitializing = false;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        // A 401 here is already handled by axiosInstance's response interceptor
        // (clears tokens + redirects). This covers other failures (network error,
        // etc.) so isInitializing never gets stuck true.
        state.user = null;
        state.isInitializing = false;
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { setLocation, setAuth, clearAuth, clearAuthError } = authSlice.actions;
export default authSlice.reducer;