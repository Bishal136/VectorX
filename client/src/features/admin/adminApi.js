// src/features/admin/adminApi.js (optional)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Admin', 'User', 'Seller', 'Category', 'Order', 'Settings'],
  endpoints: (builder) => ({
    // Dashboard
    getDashboardStats: builder.query({
      query: ({ startDate, endDate } = {}) => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return `/admin/dashboard?${params}`;
      },
      providesTags: ['Admin'],
    }),

    // Users
    getUsers: builder.query({
      query: ({ page = 1, limit = 20, role, isVerified, search } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (role) params.append('role', role);
        if (isVerified !== undefined) params.append('isVerified', isVerified);
        if (search) params.append('search', search);
        return `/admin/users?${params}`;
      },
      providesTags: (result) =>
        result && result.data
          ? [...result.data.map(({ _id }) => ({ type: 'User', id: _id })), { type: 'User', id: 'LIST' }]
          : [{ type: 'User', id: 'LIST' }],
    }),
    getUserDetails: builder.query({
      query: (userId) => `/admin/users/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'User', id: userId }],
    }),
    blockUser: builder.mutation({
      query: ({ userId, block, reason }) => ({
        url: `/admin/users/${userId}/block`,
        method: 'PUT',
        body: { block, reason },
      }),
      invalidatesTags: (result, error, { userId }) => [{ type: 'User', id: userId }],
    }),
    deleteUser: builder.mutation({
      query: (userId) => ({
        url: `/admin/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, userId) => [{ type: 'User', id: userId }],
    }),

    // Sellers
    getSellers: builder.query({
      query: ({ page = 1, limit = 20, verificationStatus, search } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (verificationStatus) params.append('verificationStatus', verificationStatus);
        if (search) params.append('search', search);
        return `/admin/sellers?${params}`;
      },
      providesTags: (result) =>
        result && result.data
          ? [...result.data.map(({ _id }) => ({ type: 'Seller', id: _id })), { type: 'Seller', id: 'LIST' }]
          : [{ type: 'Seller', id: 'LIST' }],
    }),
    getSellerDetails: builder.query({
      query: (sellerId) => `/admin/sellers/${sellerId}`,
      providesTags: (result, error, sellerId) => [{ type: 'Seller', id: sellerId }],
    }),
    verifySeller: builder.mutation({
      query: ({ sellerId, status, note, rejectionReason }) => ({
        url: `/admin/sellers/${sellerId}/verify`,
        method: 'PUT',
        body: { status, note, rejectionReason },
      }),
      invalidatesTags: (result, error, { sellerId }) => [{ type: 'Seller', id: sellerId }],
    }),
    suspendSeller: builder.mutation({
      query: ({ sellerId, suspend, reason }) => ({
        url: `/admin/sellers/${sellerId}/suspend`,
        method: 'PUT',
        body: { suspend, reason },
      }),
      invalidatesTags: (result, error, { sellerId }) => [{ type: 'Seller', id: sellerId }],
    }),

    // Categories
    getCategories: builder.query({
      query: () => '/admin/categories',
      providesTags: (result) =>
        result
          ? [...result.map(({ _id }) => ({ type: 'Category', id: _id })), { type: 'Category', id: 'LIST' }]
          : [{ type: 'Category', id: 'LIST' }],
    }),
    createCategory: builder.mutation({
      query: (data) => ({
        url: '/admin/categories',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),
    updateCategory: builder.mutation({
      query: ({ categoryId, ...data }) => ({
        url: `/admin/categories/${categoryId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { categoryId }) => [{ type: 'Category', id: categoryId }],
    }),
    deleteCategory: builder.mutation({
      query: ({ categoryId, force = false }) => ({
        url: `/admin/categories/${categoryId}?force=${force}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { categoryId }) => [{ type: 'Category', id: categoryId }],
    }),

    // Orders (Admin)
    getAdminOrders: builder.query({
      query: ({ page = 1, limit = 20, status, paymentStatus, startDate, endDate } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        if (paymentStatus) params.append('paymentStatus', paymentStatus);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return `/admin/orders?${params}`;
      },
      providesTags: (result) =>
        result && result.data
          ? [...result.data.map(({ _id }) => ({ type: 'Order', id: _id })), { type: 'Order', id: 'LIST' }]
          : [{ type: 'Order', id: 'LIST' }],
    }),
    getAdminOrderDetails: builder.query({
      query: (orderId) => `/admin/orders/${orderId}`,
      providesTags: (result, error, orderId) => [{ type: 'Order', id: orderId }],
    }),

    // Settings
    getSettings: builder.query({
      query: () => '/admin/settings',
      providesTags: ['Settings'],
    }),
    updateSettings: builder.mutation({
      query: (data) => ({
        url: '/admin/settings',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetUsersQuery,
  useGetUserDetailsQuery,
  useBlockUserMutation,
  useDeleteUserMutation,
  useGetSellersQuery,
  useGetSellerDetailsQuery,
  useVerifySellerMutation,
  useSuspendSellerMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetAdminOrdersQuery,
  useGetAdminOrderDetailsQuery,
  useGetSettingsQuery,
  useUpdateSettingsMutation,
} = adminApi;