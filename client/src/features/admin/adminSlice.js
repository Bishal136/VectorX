// src/features/admin/adminSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Dashboard -----
export const fetchDashboardStats = createAsyncThunk(
  'admin/fetchDashboard',
  async ({ startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await axiosInstance.get(`/admin/dashboard?${params}`);
      return response.data.data; // { totalUsers, totalSellers, totalOrders, totalRevenue, totalProducts, recentOrders }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch dashboard');
    }
  }
);

// ----- User Management -----
export const fetchUsers = createAsyncThunk(
  'admin/fetchUsers',
  async ({ page = 1, limit = 20, role, isVerified, search } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (role) params.append('role', role);
      if (isVerified !== undefined) params.append('isVerified', isVerified);
      if (search) params.append('search', search);
      const response = await axiosInstance.get(`/admin/users?${params}`);
      return response.data; // { data: [], pagination: { page, totalPages, totalResults } }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch users');
    }
  }
);

export const fetchUserDetails = createAsyncThunk(
  'admin/fetchUserDetails',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/admin/users/${userId}`);
      return response.data.data; // user object with orders
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user details');
    }
  }
);

export const blockUser = createAsyncThunk(
  'admin/blockUser',
  async ({ userId, block, reason }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/admin/users/${userId}/block`, { block, reason });
      return response.data.data; // updated user
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to block/unblock user');
    }
  }
);

export const deleteUser = createAsyncThunk(
  'admin/deleteUser',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/admin/users/${userId}`);
      return { userId, message: response.data.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete user');
    }
  }
);

// ----- Seller Management -----
export const fetchSellers = createAsyncThunk(
  'admin/fetchSellers',
  async ({ page = 1, limit = 20, verificationStatus, search } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (verificationStatus) params.append('verificationStatus', verificationStatus);
      if (search) params.append('search', search);
      const response = await axiosInstance.get(`/admin/sellers?${params}`);
      return response.data; // { data: [], pagination: { page, totalPages, totalResults } }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch sellers');
    }
  }
);

export const fetchSellerDetails = createAsyncThunk(
  'admin/fetchSellerDetails',
  async (sellerId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/admin/sellers/${sellerId}`);
      return response.data.data; // seller object with products/orders
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch seller details');
    }
  }
);

export const verifySeller = createAsyncThunk(
  'admin/verifySeller',
  async ({ sellerId, status, note, rejectionReason }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/admin/sellers/${sellerId}/verify`, {
        status,
        note,
        rejectionReason,
      });
      return response.data.data; // updated seller
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to verify seller');
    }
  }
);

export const suspendSeller = createAsyncThunk(
  'admin/suspendSeller',
  async ({ sellerId, suspend, reason }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/admin/sellers/${sellerId}/suspend`, {
        suspend,
        reason,
      });
      return response.data.data; // updated seller
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to suspend seller');
    }
  }
);

// ----- Category Management -----
export const createCategory = createAsyncThunk(
  'admin/createCategory',
  async (categoryData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/admin/categories', categoryData);
      return response.data.data; // created category
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create category');
    }
  }
);

export const fetchCategories = createAsyncThunk(
  'admin/fetchCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/admin/categories');
      return response.data.data; // array of categories
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
    }
  }
);

export const updateCategory = createAsyncThunk(
  'admin/updateCategory',
  async ({ categoryId, categoryData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/admin/categories/${categoryId}`, categoryData);
      return response.data.data; // updated category
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update category');
    }
  }
);

export const deleteCategory = createAsyncThunk(
  'admin/deleteCategory',
  async ({ categoryId, force = false }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/admin/categories/${categoryId}?force=${force}`);
      return { categoryId, message: response.data.message };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete category');
    }
  }
);

// ----- Order Management (Admin oversight) -----
export const fetchAdminOrders = createAsyncThunk(
  'admin/fetchOrders',
  async ({ page = 1, limit = 20, status, paymentStatus, startDate, endDate } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);
      if (paymentStatus) params.append('paymentStatus', paymentStatus);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await axiosInstance.get(`/admin/orders?${params}`);
      return response.data; // { data: [], pagination: { page, totalPages, totalResults } }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchAdminOrderDetails = createAsyncThunk(
  'admin/fetchOrderDetails',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/admin/orders/${orderId}`);
      return response.data.data; // order details
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order details');
    }
  }
);

export const updateAdminOrderStatus = createAsyncThunk(
  'admin/updateOrderStatus',
  async ({ orderId, status, notes }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/admin/orders/${orderId}/status`, { status, notes });
      return response.data.data; // updated order
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order status');
    }
  }
);

// ----- Settings -----
export const fetchSettings = createAsyncThunk(
  'admin/fetchSettings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/admin/settings');
      return response.data.data; // settings object
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch settings');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'admin/updateSettings',
  async (settingsData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/admin/settings', settingsData);
      return response.data.data; // updated settings
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update settings');
    }
  }
);

// ----- Initial State -----
const initialState = {
  dashboardStats: null,
  users: {
    data: [],
    pagination: { page: 1, totalPages: 1, totalResults: 0 },
  },
  sellers: {
    data: [],
    pagination: { page: 1, totalPages: 1, totalResults: 0 },
  },
  categories: [],
  orders: {
    data: [],
    pagination: { page: 1, totalPages: 1, totalResults: 0 },
  },
  settings: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  actionLoading: false,
  error: null,
};

// ----- Slice -----
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearAdminError: (state) => {
      state.error = null;
    },
    clearAdminData: (state) => {
      state.dashboardStats = null;
      state.users = { data: [], pagination: { page: 1, totalPages: 1, totalResults: 0 } };
      state.sellers = { data: [], pagination: { page: 1, totalPages: 1, totalResults: 0 } };
      state.categories = [];
      state.orders = { data: [], pagination: { page: 1, totalPages: 1, totalResults: 0 } };
      state.settings = null;
      state.status = 'idle';
      state.actionLoading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ----- Dashboard -----
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.dashboardStats = action.payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Users -----
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.users.data = action.payload.data || [];
        state.users.pagination = action.payload.pagination || { page: 1, totalPages: 1, totalResults: 0 };
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchUserDetails.fulfilled, (state, action) => {
        // Replace the user in the list with the detailed version
        const user = action.payload;
        const index = state.users.data.findIndex((u) => u._id === user._id);
        if (index !== -1) {
          state.users.data[index] = user;
        } else {
          // If not in list, just update nothing (or push, but avoid duplicates)
          // We'll push only if it's not already there
          if (!state.users.data.some((u) => u._id === user._id)) {
            state.users.data.unshift(user);
          }
        }
        state.error = null;
      })
      .addCase(fetchUserDetails.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(blockUser.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.users.data.findIndex((u) => u._id === updated._id);
        if (index !== -1) {
          state.users.data[index] = updated;
        }
        state.error = null;
      })
      .addCase(blockUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        const { userId } = action.payload;
        state.users.data = state.users.data.filter((u) => u._id !== userId);
        state.error = null;
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Sellers -----
      .addCase(fetchSellers.fulfilled, (state, action) => {
        state.sellers.data = action.payload.data || [];
        state.sellers.pagination = action.payload.pagination || { page: 1, totalPages: 1, totalResults: 0 };
        state.error = null;
      })
      .addCase(fetchSellers.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchSellerDetails.fulfilled, (state, action) => {
        const seller = action.payload;
        const index = state.sellers.data.findIndex((s) => s._id === seller._id);
        if (index !== -1) {
          state.sellers.data[index] = seller;
        } else {
          if (!state.sellers.data.some((s) => s._id === seller._id)) {
            state.sellers.data.unshift(seller);
          }
        }
        state.error = null;
      })
      .addCase(fetchSellerDetails.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(verifySeller.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.sellers.data.findIndex((s) => s._id === updated._id);
        if (index !== -1) {
          state.sellers.data[index] = updated;
        }
        state.error = null;
      })
      .addCase(verifySeller.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(suspendSeller.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.sellers.data.findIndex((s) => s._id === updated._id);
        if (index !== -1) {
          state.sellers.data[index] = updated;
        }
        state.error = null;
      })
      .addCase(suspendSeller.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Categories -----
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
        state.error = null;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.categories.push(action.payload);
        state.error = null;
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.categories.findIndex((c) => c._id === updated._id);
        if (index !== -1) {
          state.categories[index] = updated;
        }
        state.error = null;
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        const { categoryId } = action.payload;
        state.categories = state.categories.filter((c) => c._id !== categoryId);
        state.error = null;
      })
      .addCase(deleteCategory.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Orders -----
      .addCase(fetchAdminOrders.fulfilled, (state, action) => {
        state.orders.data = action.payload.data || [];
        state.orders.pagination = action.payload.pagination || { page: 1, totalPages: 1, totalResults: 0 };
        state.error = null;
      })
      .addCase(fetchAdminOrders.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(fetchAdminOrderDetails.fulfilled, (state, action) => {
        const order = action.payload;
        const index = state.orders.data.findIndex((o) => o._id === order._id);
        if (index !== -1) {
          state.orders.data[index] = order;
        } else {
          if (!state.orders.data.some((o) => o._id === order._id)) {
            state.orders.data.unshift(order);
          }
        }
        state.error = null;
      })
      .addCase(fetchAdminOrderDetails.rejected, (state, action) => {
        state.error = action.payload;
      })

      .addCase(updateAdminOrderStatus.fulfilled, (state, action) => {
        const updated = action.payload;
        const index = state.orders.data.findIndex((o) => o._id === updated._id);
        if (index !== -1) {
          state.orders.data[index] = updated;
        }
        state.error = null;
      })
      .addCase(updateAdminOrderStatus.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Settings -----
      .addCase(fetchSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.error = null;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.settings = action.payload;
        state.error = null;
      })
      .addCase(updateSettings.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { clearAdminError, clearAdminData } = adminSlice.actions;
export default adminSlice.reducer;