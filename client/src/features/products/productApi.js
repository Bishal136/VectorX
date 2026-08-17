// src/features/products/productApi.js (optional)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Product', 'Review'],
  endpoints: (builder) => ({
    // Public: get products with filters
    getProducts: builder.query({
      query: ({
        lat,
        lng,
        category,
        minPrice,
        maxPrice,
        sort = 'distance',
        search,
        minRating,
        isFeatured,
        page = 1,
        limit = 20,
      } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (sort) params.append('sort', sort);
        if (category) params.append('category', category);
        if (minPrice !== undefined) params.append('minPrice', minPrice);
        if (maxPrice !== undefined) params.append('maxPrice', maxPrice);
        if (search) params.append('search', search);
        if (minRating) params.append('minRating', minRating);
        if (isFeatured !== undefined) params.append('isFeatured', isFeatured);
        if (lat && lng) { params.append('lat', lat); params.append('lng', lng); }
        return `/products?${params}`;
      },
      providesTags: (result) =>
        result && result.products
          ? [
              ...result.products.map(({ _id }) => ({ type: 'Product', id: _id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    // Get single product
    getProductById: builder.query({
      query: (id) => `/products/${id}`,
      providesTags: (result, error, id) => [{ type: 'Product', id }],
    }),

    // Get products by seller
    getProductsBySeller: builder.query({
      query: ({ sellerId, page = 1, limit = 20, status = 'active' }) => {
        const params = new URLSearchParams({ page, limit, status });
        return `/products/seller/${sellerId}?${params}`;
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ _id }) => ({ type: 'Product', id: _id })), { type: 'Product', id: 'LIST' }]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    // Related products
    getRelatedProducts: builder.query({
      query: ({ productId, limit = 6 }) => `/products/${productId}/related?limit=${limit}`,
      providesTags: (result, error, { productId }) => [{ type: 'Product', id: productId }],
    }),

    // Reviews
    getProductReviews: builder.query({
      query: ({ productId, page = 1, limit = 10, sort = 'newest' }) => {
        const params = new URLSearchParams({ page, limit, sort });
        return `/products/${productId}/reviews?${params}`;
      },
      providesTags: (result, error, { productId }) => [{ type: 'Review', id: productId }],
    }),

    // Submit review (mutation)
    submitReview: builder.mutation({
      query: ({ productId, rating, title, comment, orderId, images }) => ({
        url: `/products/${productId}/reviews`,
        method: 'POST',
        body: { rating, title, comment, orderId, images },
      }),
      invalidatesTags: (result, error, { productId }) => [
        { type: 'Product', id: productId },
        { type: 'Review', id: productId },
      ],
    }),

    // Mark review helpful
    markReviewHelpful: builder.mutation({
      query: ({ productId, reviewId }) => ({
        url: `/products/${productId}/reviews/${reviewId}/helpful`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { productId }) => [{ type: 'Review', id: productId }],
    }),

    // Report review
    reportReview: builder.mutation({
      query: ({ productId, reviewId }) => ({
        url: `/products/${productId}/reviews/${reviewId}/report`,
        method: 'POST',
      }),
      // No cache invalidation needed; just a report action
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProductsBySellerQuery,
  useGetRelatedProductsQuery,
  useGetProductReviewsQuery,
  useSubmitReviewMutation,
  useMarkReviewHelpfulMutation,
  useReportReviewMutation,
} = productApi;