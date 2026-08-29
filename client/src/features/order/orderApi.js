// src/features/order/orderApi.js (optional)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    // Create order
    createOrder: builder.mutation({
      query: (data) => ({
        url: '/orders',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Order'],
    }),

    // Get user orders
    getUserOrders: builder.query({
      query: ({ status, page = 1, limit = 10 } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        return `/orders?${params}`;
      },
      providesTags: (result) =>
        result && result.orders
          ? [
              ...result.orders.map(({ _id }) => ({ type: 'Order', id: _id })),
              { type: 'Order', id: 'LIST' },
            ]
          : [{ type: 'Order', id: 'LIST' }],
    }),

    // Get single order
    getOrderById: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),

    // Cancel order
    cancelOrder: builder.mutation({
      query: ({ orderId, cancellationReason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'PUT',
        body: { cancellationReason },
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),

    // Request Return
    requestReturn: builder.mutation({
      query: ({ orderId, reason, customerNotes }) => ({
        url: `/orders/${orderId}/return`,
        method: 'POST',
        body: { reason, customerNotes },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetUserOrdersQuery,
  useGetOrderByIdQuery,
  useCancelOrderMutation,
  useRequestReturnMutation,
} = orderApi;