// src/features/user/userApi.js (optional)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['User', 'Address', 'Wishlist'],
  endpoints: (builder) => ({
    // Profile
    getProfile: builder.query({
      query: () => '/users/profile',
      providesTags: ['User'],
    }),
    updateProfile: builder.mutation({
      query: (data) => ({
        url: '/users/profile',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    updateLocation: builder.mutation({
      query: (data) => ({
        url: '/users/location',
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),

    // Addresses
    addAddress: builder.mutation({
      query: (data) => ({
        url: '/users/addresses',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Address'],
    }),
    updateAddress: builder.mutation({
      query: ({ addressId, ...data }) => ({
        url: `/users/addresses/${addressId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Address'],
    }),
    deleteAddress: builder.mutation({
      query: (addressId) => ({
        url: `/users/addresses/${addressId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Address'],
    }),
    setDefaultAddress: builder.mutation({
      query: (addressId) => ({
        url: `/users/addresses/${addressId}/default`,
        method: 'PUT',
      }),
      invalidatesTags: ['Address'],
    }),

    // Wishlist
    getWishlist: builder.query({
      query: () => '/users/wishlist',
      providesTags: ['Wishlist'],
    }),
    addToWishlist: builder.mutation({
      query: (productId) => ({
        url: `/users/wishlist/${productId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Wishlist'],
    }),
    removeFromWishlist: builder.mutation({
      query: (productId) => ({
        url: `/users/wishlist/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
    }),
  }),
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUpdateLocationMutation,
  useAddAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} = userApi;