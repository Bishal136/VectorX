// src/features/seller/sellerApi.js (optional)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const sellerApi = createApi({
  reducerPath: 'sellerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
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
      query: (period = 'month') => `/sellers/earnings?period=${period}`,
      providesTags: ['Seller'],
    }),

    // Products
    getSellerProducts: builder.query({
      query: ({ page = 1, limit = 20, search, category, isActive } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.append('search', search);
        if (category) params.append('category', category);
        if (isActive !== undefined && isActive !== '') params.append('isActive', isActive);
        return `/sellers/products?${params.toString()}`;
      },
      providesTags: (result) => {
        const list = result?.data?.products || (Array.isArray(result) ? result : []);
        return [
          ...list.map(({ _id }) => ({ type: 'Product', id: _id })),
          { type: 'Product', id: 'LIST' },
        ];
      },
    }),
    createSellerProduct: builder.mutation({
      query: (data) => ({
        url: '/sellers/products',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Product', id: 'LIST' }, 'Seller'],
    }),
    updateSellerProduct: builder.mutation({
      query: ({ productId, productData }) => ({
        url: `/sellers/products/${productId}`,
        method: 'PUT',
        body: productData,
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'LIST' },
        'Seller',
      ],
    }),
    deleteSellerProduct: builder.mutation({
      query: (productId) => ({
        url: `/sellers/products/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, productId) => [
        { type: 'Product', id: productId },
        { type: 'Product', id: 'LIST' },
        'Seller',
      ],
    }),

    // Orders
    getSellerOrders: builder.query({
      query: ({ status, page = 1, limit = 20 } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status && status !== 'all') params.append('status', status);
        return `/sellers/orders?${params.toString()}`;
      },
      providesTags: (result) => {
        const list = result?.data?.orders || (Array.isArray(result) ? result : []);
        return [
          ...list.map(({ _id }) => ({ type: 'Order', id: _id })),
          { type: 'Order', id: 'LIST' },
        ];
      },
    }),
    updateOrderStatus: builder.mutation({
      query: ({ orderId, status }) => ({
        url: `/sellers/orders/${orderId}/status`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: 'Order', id: orderId },
        { type: 'Order', id: 'LIST' },
        'Seller',
      ],
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