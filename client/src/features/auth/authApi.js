// src/features/auth/authApi.js (optional)
//
// NOT currently wired into the store — app/store.js and app/rootReducer.js
// both have this commented out, so it isn't live yet. Fixed anyway so it
// doesn't break the moment someone uncomments it.
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    // This is a Vite project (see vite.config.js, and Login.jsx/Register.jsx
    // which both read import.meta.env.VITE_API_URL) — there is no `process`
    // global in Vite's browser bundle, so `process.env.REACT_APP_API_URL`
    // (a Create React App convention) would throw
    // "ReferenceError: process is not defined" the instant this baseQuery ran.
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    // ... etc
  }),
});
export const { useLoginMutation } = authApi;