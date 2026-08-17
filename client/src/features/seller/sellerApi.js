// src/features/seller/sellerApi.js (optional)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const sellerApi = createApi({
  reducerPath: 'sellerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Seller', 'Product', 'Order'],
  endpoints: (builder) => ({
    // Profile
    getSellerProfile: builder.query({
      query: () => '/sellers/profile',
      providesTags: ['Seller'],
    }),
    updateSellerProfile: builder.mutation({
      query: (data) => ({
        url: '/sellers/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Seller'],
    }),
    registerSeller: builder.mutation({
      query: (data) => ({
        url: '/sellers/register',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Seller'],
    }),

    // Dashboard & Earnings
    getDashboard: builder.query({
      query: () => '/sellers/dashboard',
      providesTags: ['Seller'],
    }),
    getEarnings: builder.query({
      query: () => '/sellers/earnings',
      providesTags: ['Seller'],
    }),

    // Products
    getSellerProducts: builder.query({
      query: ({ page = 1, limit = 20, status } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        return `/sellers/products?${params}`;
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ _id }) => ({ type: 'Product', id: _id })), { type: 'Product', id: 'LIST' }]
          : [{ type: 'Product', id: 'LIST' }],
    }),
    createSellerProduct: builder.mutation({
      query: (data) => ({
        url: '/sellers/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }],
    }),
    updateSellerProduct: builder.mutation({
      query: ({ productId, ...data }) => ({
        url: `/sellers/products/${productId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Product', id: productId }],
    }),
    deleteSellerProduct: builder.mutation({
      query: (productId) => ({
        url: `/sellers/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, productId) => [{ type: 'Product', id: productId }],
    }),

    // Orders
    getSellerOrders: builder.query({
      query: ({ status, page = 1, limit = 20 } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        return `/sellers/orders?${params}`;
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ _id }) => ({ type: 'Order', id: _id })), { type: 'Order', id: 'LIST' }]
          : [{ type: 'Order', id: 'LIST' }],
    }),
    updateOrderStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: `/sellers/orders/${orderId}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }],
    }),
  }),
});

export const {
  useGetSellerProfileQuery,
  useUpdateSellerProfileMutation,
  useRegisterSellerMutation,
  useGetDashboardQuery,
  useGetEarningsQuery,
  useGetSellerProductsQuery,
  useCreateSellerProductMutation,
  useUpdateSellerProductMutation,
  useDeleteSellerProductMutation,
  useGetSellerOrdersQuery,
  useUpdateOrderStatusMutation,
} = sellerApi;