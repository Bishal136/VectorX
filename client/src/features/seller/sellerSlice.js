// src/features/seller/sellerSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Seller Registration -----
export const registerSeller = createAsyncThunk(
  'seller/register',
  async (sellerData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/sellers/register', sellerData);
      return response.data.data; // { _id, shopName, user, isVerified, verificationStatus, ... }
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
      return response.data.data; // seller object
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller profile');
    }
  }
);

export const updateSellerProfile = createAsyncThunk(
  'seller/updateProfile',
  async (updateData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/sellers/profile', updateData);
      return response.data.data; // updated seller object
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
      return response.data.data; // { totalProducts, totalOrders, totalRevenue, pendingOrders, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard');
    }
  }
);

export const fetchEarnings = createAsyncThunk(
  'seller/fetchEarnings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/sellers/earnings');
      return response.data.data; // { totalEarnings, availableBalance, pendingBalance, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch earnings');
    }
  }
);

// ----- Product Management (Seller's own products) -----
export const fetchSellerProducts = createAsyncThunk(
  'seller/fetchProducts',
  async ({ page = 1, limit = 20, status } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);
      const response = await axiosInstance.get(`/sellers/products?${params}`);
      return response.data.data; // array of products
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
      return response.data.data; // created product
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
      return response.data.data; // updated product
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

// ----- Order Management (Seller's incoming orders) -----
export const fetchSellerOrders = createAsyncThunk(
  'seller/fetchOrders',
  async ({ status, page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);
      const response = await axiosInstance.get(`/sellers/orders?${params}`);
      return response.data.data; // array of orders
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'seller/updateOrderStatus',
  async ({ orderId, status }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/sellers/orders/${orderId}/status`, { status });
      return response.data.data; // updated order
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order status');
    }
  }
);

// ----- Initial State -----
const initialState = {
  profile: null,               // seller profile object
  dashboardStats: null,        // { totalProducts, totalOrders, totalRevenue, pendingOrders }
  earnings: null,              // { totalEarnings, availableBalance, pendingBalance }
  products: [],                // list of seller's products
  orders: [],                  // list of seller's orders
  status: 'idle',              // 'idle' | 'loading' | 'succeeded' | 'failed'
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
      state.error = null;
    },
    // Optimistic updates for product list (optional)
    optimisticRemoveProduct: (state, action) => {
      const productId = action.payload;
      state.products = state.products.filter((p) => p._id !== productId);
    },
  },
  extraReducers: (builder) => {
    builder
      // ----- Register -----
      .addCase(registerSeller.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerSeller.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(registerSeller.rejected, (state, action) => {
        state.status = 'failed';
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
      .addCase(updateSellerProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateSellerProfile.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Dashboard -----
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboardStats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
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
      .addCase(fetchSellerProducts.fulfilled, (state, action) => {
        state.products = action.payload;
        state.error = null;
      })
      .addCase(fetchSellerProducts.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(createSellerProduct.fulfilled, (state, action) => {
        // Add new product to the list
        state.products.unshift(action.payload);
        state.error = null;
      })
      .addCase(createSellerProduct.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateSellerProduct.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.products.findIndex((p) => p._id === updated._id);
        if (index !== -1) {
          state.products[index] = updated;
        }
        state.error = null;
      })
      .addCase(updateSellerProduct.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteSellerProduct.fulfilled, (state, action) => {
        const { productId } = action.payload;
        state.products = state.products.filter((p) => p._id !== productId);
        state.error = null;
      })
      .addCase(deleteSellerProduct.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Orders -----
      .addCase(fetchSellerOrders.fulfilled, (state, action) => {
        state.orders = action.payload;
        state.error = null;
      })
      .addCase(fetchSellerOrders.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.orders.findIndex((o) => o._id === updated._id);
        if (index !== -1) {
          state.orders[index] = updated;
        }
        state.error = null;
      })
      .addCase(updateOrderStatus.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { clearSellerData, optimisticRemoveProduct } = sellerSlice.actions;
export default sellerSlice.reducer;