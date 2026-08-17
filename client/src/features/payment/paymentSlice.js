// src/features/payment/paymentSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Async Thunks -----

// Initiate payment for an order
export const initiatePayment = createAsyncThunk(
  'payment/initiatePayment',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/payments/initiate', { orderId });
      return response.data.data; // { orderId, paymentUrl, transactionId }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to initiate payment');
    }
  }
);

// Check payment status for an order
export const checkPaymentStatus = createAsyncThunk(
  'payment/checkPaymentStatus',
  async (orderId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get(`/payments/status/${orderId}`);
      return response.data.data; // { orderId, paymentStatus, status, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to check payment status');
    }
  }
);

// Optional: handle payment success callback (if you want to verify via backend)
// But the backend already does that via redirect and webhook; we can just
// check status on the frontend after redirection.

// ----- Initial State -----
const initialState = {
  currentPayment: {
    orderId: null,
    paymentUrl: null,
    transactionId: null,
    paymentStatus: null, // 'pending' | 'paid' | 'failed' | 'refunded'
    orderStatus: null,   // from the order itself
  },
  status: 'idle',        // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// ----- Slice -----
const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    // Clear payment state (e.g., after successful payment, on logout)
    clearPayment: (state) => {
      state.currentPayment = initialState.currentPayment;
      state.status = 'idle';
      state.error = null;
    },
    // Used after redirect from payment gateway to update status temporarily
    setPaymentStatusFromRedirect: (state, action) => {
      const { orderId, status: paymentStatus, transactionId } = action.payload;
      state.currentPayment.orderId = orderId;
      state.currentPayment.transactionId = transactionId || state.currentPayment.transactionId;
      if (paymentStatus === 'paid') {
        state.currentPayment.paymentStatus = 'paid';
      } else if (paymentStatus === 'failed' || paymentStatus === 'cancel') {
        state.currentPayment.paymentStatus = 'failed';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ----- Initiate Payment -----
      .addCase(initiatePayment.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(initiatePayment.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentPayment = {
          orderId: action.payload.orderId,
          paymentUrl: action.payload.paymentUrl,
          transactionId: action.payload.transactionId,
          paymentStatus: 'pending',
          orderStatus: null,
        };
        state.error = null;
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Check Payment Status -----
      .addCase(checkPaymentStatus.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(checkPaymentStatus.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentPayment = {
          orderId: action.payload.orderId,
          paymentStatus: action.payload.paymentStatus,
          orderStatus: action.payload.status, // might be the order status
          paymentUrl: state.currentPayment.paymentUrl, // keep old
          transactionId: action.payload.transactionId || state.currentPayment.transactionId,
        };
        state.error = null;
      })
      .addCase(checkPaymentStatus.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { clearPayment, setPaymentStatusFromRedirect } = paymentSlice.actions;
export default paymentSlice.reducer;