// src/features/products/productSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Async Thunks -----

// Get products with location, filters, sorting, pagination
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (
    {
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
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (sort) params.append('sort', sort);
      if (category && String(category).trim() !== '') params.append('category', category);
      if (minPrice !== undefined && minPrice !== null && minPrice !== '' && !isNaN(Number(minPrice))) {
        params.append('minPrice', minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '' && !isNaN(Number(maxPrice))) {
        params.append('maxPrice', maxPrice);
      }
      if (search && String(search).trim() !== '') params.append('search', String(search).trim());
      if (minRating !== undefined && minRating !== null && minRating !== '' && !isNaN(Number(minRating))) {
        params.append('minRating', minRating);
      }
      if (isFeatured !== undefined && isFeatured !== null) params.append('isFeatured', isFeatured);
      if (
        lat !== undefined &&
        lat !== null &&
        lng !== undefined &&
        lng !== null &&
        !isNaN(Number(lat)) &&
        !isNaN(Number(lng))
      ) {
        params.append('lat', lat);
        params.append('lng', lng);
      }
      const response = await axiosInstance.get(`/products?${params.toString()}`);
      return {
        ...response.data.data,
        pagination: response.data.pagination || response.data.data?.pagination,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

// Get a single product by ID
export const fetchProductById = createAsyncThunk(
  'products/fetchProductById',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/products/${productId}`);
      return response.data.data; // product object
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
    }
  }
);

// Get products by a specific seller (public)
export const fetchProductsBySeller = createAsyncThunk(
  'products/fetchProductsBySeller',
  async ({ sellerId, page = 1, limit = 20, status = 'active' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit, status });
      const response = await axiosInstance.get(`/products/seller/${sellerId}?${params}`);
      return response.data.data; // array of products
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller products');
    }
  }
);

// Get related products
export const fetchRelatedProducts = createAsyncThunk(
  'products/fetchRelatedProducts',
  async ({ productId, limit = 6 }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/products/${productId}/related?limit=${limit}`);
      return response.data.data; // array of products
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch related products');
    }
  }
);

// Get product reviews
export const fetchProductReviews = createAsyncThunk(
  'products/fetchProductReviews',
  async ({ productId, page = 1, limit = 10, sort = 'newest' }, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit, sort });
      const response = await axiosInstance.get(`/products/${productId}/reviews?${params}`);
      return response.data.data; // array of reviews (might include pagination metadata)
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch reviews');
    }
  }
);

// Submit a review (authenticated)
export const submitReview = createAsyncThunk(
  'products/submitReview',
  async ({ productId, rating, title, comment, orderId, images = [] }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/products/${productId}/reviews`, {
        rating,
        title,
        comment,
        orderId,
        images,
      });
      return response.data.data.review; // the created review object
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit review');
    }
  }
);

// Mark a review as helpful (authenticated)
export const markReviewHelpful = createAsyncThunk(
  'products/markReviewHelpful',
  async ({ productId, reviewId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/products/${productId}/reviews/${reviewId}/helpful`);
      return response.data.data; // updated review or success message
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark review as helpful');
    }
  }
);

// Report a review (authenticated)
export const reportReview = createAsyncThunk(
  'products/reportReview',
  async ({ productId, reviewId }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/products/${productId}/reviews/${reviewId}/report`);
      return response.data.data; // success message
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to report review');
    }
  }
);

// ----- Initial State -----
const initialState = {
  items: [],                // product list for the current search
  currentProduct: null,     // single product detail
  relatedProducts: [],      // related products
  reviews: [],              // reviews for the current product
  filters: {
    category: null,
    minPrice: null,
    maxPrice: null,
    sort: 'distance',
    search: '',
    minRating: null,
    isFeatured: false,
  },
  pagination: {
    page: 1,
    totalPages: 1,
    totalResults: 0,
    limit: 20,
  },
  sortedBy: 'distance',     // 'distance' | 'popularity' | etc.
  fallbackUsed: false,      // true if location was missing and we used popularity
  status: 'idle',           // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// ----- Slice -----
const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearProducts: (state) => {
      state.items = [];
      state.currentProduct = null;
      state.relatedProducts = [];
      state.reviews = [];
      state.pagination = initialState.pagination;
      state.sortedBy = 'distance';
      state.fallbackUsed = false;
      state.status = 'idle';
      state.error = null;
    },
    resetProductState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ----- Fetch Products -----
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.products || [];
        state.sortedBy = action.payload.sortedBy || 'distance';
        state.fallbackUsed = action.payload.fallbackUsed || false;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
        state.error = null;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Fetch Product By ID -----
      .addCase(fetchProductById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentProduct = action.payload;
        state.error = null;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Fetch Products by Seller -----
      .addCase(fetchProductsBySeller.fulfilled, (state, action) => {
        state.items = action.payload?.products || (Array.isArray(action.payload) ? action.payload : []);
        state.error = null;
      })
      .addCase(fetchProductsBySeller.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Fetch Related Products -----
      .addCase(fetchRelatedProducts.fulfilled, (state, action) => {
        state.relatedProducts = action.payload?.products || (Array.isArray(action.payload) ? action.payload : []);
        state.error = null;
      })
      .addCase(fetchRelatedProducts.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Fetch Product Reviews -----
      .addCase(fetchProductReviews.fulfilled, (state, action) => {
        state.reviews = action.payload?.reviews || (Array.isArray(action.payload) ? action.payload : []);
        state.error = null;
      })
      .addCase(fetchProductReviews.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Submit Review -----
      .addCase(submitReview.fulfilled, (state, action) => {
        // Add the new review to the reviews list
        if (Array.isArray(state.reviews)) {
          state.reviews.unshift(action.payload);
        } else {
          state.reviews = [action.payload];
        }
        state.error = null;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Mark Helpful / Report (no state change needed, but we can update the review)
      .addCase(markReviewHelpful.fulfilled, (state) => {
        // If the server returns the updated review, we can update it.
        // For now, just clear error.
        state.error = null;
      })
      .addCase(markReviewHelpful.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(reportReview.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(reportReview.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { setFilters, clearFilters, setPagination, clearProducts, resetProductState } =
  productSlice.actions;
export default productSlice.reducer;