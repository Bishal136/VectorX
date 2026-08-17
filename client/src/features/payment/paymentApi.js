// src/features/payment/paymentApi.js (optional)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Payment'],
  endpoints: (builder) => ({
    initiatePayment: builder.mutation({
      query: (orderId) => ({
        url: '/payments/initiate',
        method: 'POST',
        body: { orderId },
      }),
      invalidatesTags: ['Payment'],
    }),
    checkPaymentStatus: builder.query({
      query: (orderId) => `/payments/status/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Payment', id: orderId }],
    }),
  }),
});

export const { useInitiatePaymentMutation, useCheckPaymentStatusQuery } = paymentApi;