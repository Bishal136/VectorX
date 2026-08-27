// src/features/seller/sellerSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Seller Registration -----
export const registerSeller = createAsyncThunk(
  'seller/register',
  async (sellerData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/sellers/register', sellerData);
      return response.data.data?.seller || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Seller registration failed');
    }
  }
);

// ----- Profile -----
export const fetchSellerProfile = createAsyncThunk(
  'seller/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/sellers/profile');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch seller profile'
      );
    }
  }
);

export const updateSellerProfile = createAsyncThunk(
  'seller/updateProfile',
  async (updateData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/sellers/profile', updateData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Profile update failed');
    }
  }
);

// ----- Dashboard & Earnings -----
export const fetchDashboardStats = createAsyncThunk(
  'seller/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/sellers/dashboard');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard');
    }
  }
);

export const fetchEarnings = createAsyncThunk(
  'seller/fetchEarnings',
  async (period = 'month', { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/sellers/earnings?period=${period}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch earnings');
    }
  }
);

// ----- Product Management -----
export const fetchSellerProducts = createAsyncThunk(
  'seller/fetchProducts',
  async ({ page = 1, limit = 20, search, category, isActive } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (isActive !== undefined && isActive !== null && isActive !== '') {
        params.append('isActive', isActive);
      }
      const response = await axiosInstance.get(`/sellers/products?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

export const createSellerProduct = createAsyncThunk(
  'seller/createProduct',
  async (productData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/sellers/products', productData);
      return response.data.data?.product || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create product');
    }
  }
);

export const updateSellerProduct = createAsyncThunk(
  'seller/updateProduct',
  async ({ productId, productData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/sellers/products/${productId}`, productData);
      return response.data.data?.product || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update product');
    }
  }
);

export const deleteSellerProduct = createAsyncThunk(
  'seller/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/sellers/products/${productId}`);
      return { productId, message: response.data.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete product');
    }
  }
);

// ----- Order Management -----
export const fetchSellerOrders = createAsyncThunk(
  'seller/fetchOrders',
  async ({ status, page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (status && status !== 'all') params.append('status', status);
      const response = await axiosInstance.get(`/sellers/orders?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'seller/updateOrderStatus',
  async ({ orderId, status, notes, trackingNumber, cancellationReason }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/sellers/orders/${orderId}/status`, {
        status,
        notes,
        trackingNumber,
        cancellationReason
      });
      return response.data.data?.order || response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order status');
    }
  }
);

// ----- Reviews & Ratings Management -----
export const fetchSellerReviews = createAsyncThunk(
  'seller/fetchReviews',
  async ({ rating, productId, hasReply, search, sort = 'newest', page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (page) params.append('page', page);
      if (limit) params.append('limit', limit);
      if (rating && rating !== 'all') params.append('rating', rating);
      if (productId && productId !== 'all') params.append('productId', productId);
      if (hasReply && hasReply !== 'all') params.append('hasReply', hasReply);
      if (search) params.append('search', search);
      if (sort) params.append('sort', sort);
      const response = await axiosInstance.get(`/sellers/reviews?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller reviews');
    }
  }
);

export const replyToReview = createAsyncThunk(
  'seller/replyToReview',
  async ({ productId, reviewId, comment }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/sellers/products/${productId}/reviews/${reviewId}/reply`, { comment });
      return { productId, reviewId, reply: response.data.data?.reply };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit reply');
    }
  }
);

export const deleteReviewReply = createAsyncThunk(
  'seller/deleteReviewReply',
  async ({ productId, reviewId }, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/sellers/products/${productId}/reviews/${reviewId}/reply`);
      return { productId, reviewId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete reply');
    }
  }
);

// ----- Initial State -----
const initialState = {
  profile: null,
  dashboardStats: null,
  earnings: null,
  products: [],
  productPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
  orders: [],
  orderPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
  reviews: [],
  reviewStats: null,
  sellerProductList: [],
  reviewPagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  actionLoading: false,
  error: null,
};

// ----- Slice -----
const sellerSlice = createSlice({
  name: 'seller',
  initialState,
  reducers: {
    clearSellerData: (state) => {
      state.profile = null;
      state.dashboardStats = null;
      state.earnings = null;
      state.products = [];
      state.orders = [];
      state.status = 'idle';
      state.actionLoading = false;
      state.error = null;
    },
    clearSellerError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ----- Register -----
      .addCase(registerSeller.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(registerSeller.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(registerSeller.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // ----- Fetch Profile -----
      .addCase(fetchSellerProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSellerProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchSellerProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Update Profile -----
      .addCase(updateSellerProfile.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateSellerProfile.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateSellerProfile.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // ----- Dashboard -----
      .addCase(fetchDashboardStats.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.dashboardStats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Earnings -----
      .addCase(fetchEarnings.fulfilled, (state, action) => {
        state.earnings = action.payload;
        state.error = null;
      })
      .addCase(fetchEarnings.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Products -----
      .addCase(fetchSellerProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSellerProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (Array.isArray(action.payload)) {
          state.products = action.payload;
          state.productPagination = {
            page: 1,
            limit: action.payload.length || 20,
            total: action.payload.length,
            totalPages: 1,
          };
        } else if (action.payload?.products) {
          state.products = action.payload.products;
          if (action.payload.pagination) {
            state.productPagination = action.payload.pagination;
          }
        } else {
          state.products = [];
        }
        state.error = null;
      })
      .addCase(fetchSellerProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createSellerProduct.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(createSellerProduct.fulfilled, (state, action) => {
        state.actionLoading = false;
        const newProd = action.payload;
        if (newProd && newProd._id) {
          state.products.unshift(newProd);
          state.productPagination.total = (state.productPagination.total || 0) + 1;
        }
        state.error = null;
      })
      .addCase(createSellerProduct.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(updateSellerProduct.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateSellerProduct.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        if (updated && updated._id) {
          const index = state.products.findIndex((p) => p._id === updated._id);
          if (index !== -1) {
            state.products[index] = updated;
          }
        }
        state.error = null;
      })
      .addCase(updateSellerProduct.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteSellerProduct.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(deleteSellerProduct.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { productId } = action.payload;
        state.products = state.products.filter((p) => p._id !== productId);
        state.productPagination.total = Math.max(0, (state.productPagination.total || 1) - 1);
        state.error = null;
      })
      .addCase(deleteSellerProduct.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // ----- Orders -----
      .addCase(fetchSellerOrders.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSellerOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        if (Array.isArray(action.payload)) {
          state.orders = action.payload;
          state.orderPagination = {
            page: 1,
            limit: action.payload.length || 20,
            total: action.payload.length,
            totalPages: 1,
          };
        } else if (action.payload?.orders) {
          state.orders = action.payload.orders;
          if (action.payload.pagination) {
            state.orderPagination = action.payload.pagination;
          }
        } else {
          state.orders = [];
        }
        state.error = null;
      })
      .addCase(fetchSellerOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(updateOrderStatus.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        state.actionLoading = false;
        const updated = action.payload;
        if (updated && updated._id) {
          const index = state.orders.findIndex((o) => o._id === updated._id);
          if (index !== -1) {
            state.orders[index] = { ...state.orders[index], ...updated };
          }
        }
        state.error = null;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // ----- Reviews & Ratings -----
      .addCase(fetchSellerReviews.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSellerReviews.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.reviews = action.payload?.reviews || [];
        state.reviewStats = action.payload?.stats || null;
        state.sellerProductList = action.payload?.sellerProducts || [];
        if (action.payload?.pagination) {
          state.reviewPagination = action.payload.pagination;
        }
        state.error = null;
      })
      .addCase(fetchSellerReviews.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(replyToReview.pending, (state) => {
        state.actionLoading = true;
        state.error = null;
      })
      .addCase(replyToReview.fulfilled, (state, action) => {
        state.actionLoading = false;
        const { reviewId, reply } = action.payload;
        const review = state.reviews.find((r) => r._id === reviewId);
        if (review) {
          review.reply = reply;
        }
        if (state.reviewStats) {
          state.reviewStats.repliedCount = (state.reviewStats.repliedCount || 0) + 1;
          state.reviewStats.unrepliedCount = Math.max(0, (state.reviewStats.unrepliedCount || 1) - 1);
        }
        state.error = null;
      })
      .addCase(replyToReview.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(deleteReviewReply.fulfilled, (state, action) => {
        const { reviewId } = action.payload;
        const review = state.reviews.find((r) => r._id === reviewId);
        if (review) {
          review.reply = null;
        }
        if (state.reviewStats) {
          state.reviewStats.repliedCount = Math.max(0, (state.reviewStats.repliedCount || 1) - 1);
          state.reviewStats.unrepliedCount = (state.reviewStats.unrepliedCount || 0) + 1;
        }
      });
  },
});

export const { clearSellerData, clearSellerError } = sellerSlice.actions;
export default sellerSlice.reducer;