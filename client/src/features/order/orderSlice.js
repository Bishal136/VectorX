// src/features/order/orderSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Async Thunks (User-facing) -----

// Create an order from the cart
export const createOrder = createAsyncThunk(
  'order/createOrder',
  async ({ shippingAddress, paymentMethod, couponCode, notes }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/orders', {
        shippingAddress,
        paymentMethod,
        couponCode,
        notes,
      });
      return response.data.data; // { orders: [], checkoutSessionId, totalAmount }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create order');
    }
  }
);

// Fetch user orders (with optional filters)
export const fetchUserOrders = createAsyncThunk(
  'order/fetchUserOrders',
  async ({ status, page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (status) params.append('status', status);
      const response = await axiosInstance.get(`/orders?${params}`);
      return response.data.data; // { orders: [], pagination: { page, totalPages, totalResults } }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

// Fetch a single order by ID
export const fetchOrderById = createAsyncThunk(
  'order/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/orders/${orderId}`);
      return response.data.data; // order object
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch order details');
    }
  }
);

// Cancel an order
export const cancelOrder = createAsyncThunk(
  'order/cancelOrder',
  async ({ orderId, cancellationReason }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/orders/${orderId}/cancel`, { cancellationReason });
      return response.data.data; // updated order (status: 'Cancelled')
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel order');
    }
  }
);

// ----- Initial State -----
const initialState = {
  orders: [],               // list of user orders (from fetchUserOrders)
  currentOrder: null,       // single order detail
  pagination: {
    page: 1,
    totalPages: 1,
    totalResults: 0,
    limit: 10,
  },
  status: 'idle',           // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// ----- Slice -----
const orderSlice = createSlice({
  name: 'order',
  initialState,
  reducers: {
    clearOrderState: (state) => {
      state.orders = [];
      state.currentOrder = null;
      state.pagination = { page: 1, totalPages: 1, totalResults: 0, limit: 10 };
      state.status = 'idle';
      state.error = null;
    },
    resetCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ----- Create Order -----
      .addCase(createOrder.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        // The response might contain multiple orders (split by seller)
        // We can add them to the orders list, but we'll just set currentOrder? 
        // Better to set the first order as current, or store the list in a separate field.
        // We'll store the orders array in a temporary field? Actually we have orders array.
        // We'll prepend the new orders to the list.
        const newOrders = action.payload.orders || [];
        state.orders = [...newOrders, ...state.orders];
        // If there's at least one order, set the first as current for the success page.
        if (newOrders.length > 0) {
          state.currentOrder = newOrders[0];
        }
        state.error = null;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Fetch User Orders -----
      .addCase(fetchUserOrders.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.orders = action.payload.orders || [];
        state.pagination = action.payload.pagination || { page: 1, totalPages: 1, totalResults: 0, limit: 10 };
        state.error = null;
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Fetch Order By ID -----
      .addCase(fetchOrderById.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentOrder = action.payload;
        state.error = null;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Cancel Order -----
      .addCase(cancelOrder.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.status = 'succeeded';
        const updatedOrder = action.payload;
        // Update the order in the orders list
        const index = state.orders.findIndex((o) => o._id === updatedOrder._id);
        if (index !== -1) {
          state.orders[index] = updatedOrder;
        }
        // If it's the current order, update it
        if (state.currentOrder && state.currentOrder._id === updatedOrder._id) {
          state.currentOrder = updatedOrder;
        }
        state.error = null;
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { clearOrderState, resetCurrentOrder } = orderSlice.actions;
export default orderSlice.reducer;