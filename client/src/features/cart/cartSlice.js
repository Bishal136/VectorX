// src/features/cart/cartSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Async Thunks -----

// Fetch the current cart
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/users/cart');
      return response.data.data; // { items, total, shippingAddress?, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch cart');
    }
  }
);

// Add an item to the cart
export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/users/cart', { productId, quantity });
      return response.data.data; // updated cart
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add to cart');
    }
  }
);

// Update cart item quantity
export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ cartItemId, quantity }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/users/cart/${cartItemId}`, { quantity });
      return response.data.data; // updated cart
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update cart');
    }
  }
);

// Remove an item from cart
export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (cartItemId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/users/cart/${cartItemId}`);
      return response.data.data; // updated cart
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove from cart');
    }
  }
);

// Clear the entire cart
export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete('/users/cart');
      return response.data.data; // { items: [], total: 0, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to clear cart');
    }
  }
);

// ----- Initial State -----
const initialState = {
  items: [],                // array of cart items (each with product details)
  total: 0,                 // total price (might be computed on server)
  shippingAddress: null,    // optional: default shipping address
  status: 'idle',           // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// ----- Slice -----
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Reset cart state (e.g., on logout)
    resetCart: (state) => {
      state.items = [];
      state.total = 0;
      state.shippingAddress = null;
      state.status = 'idle';
      state.error = null;
    },
    // Optimistic update: you can add local updates for better UX,
    // but we'll rely on server responses; still, we can provide helper reducers if needed.
  },
  extraReducers: (builder) => {
    builder
      // ----- Fetch Cart -----
      .addCase(fetchCart.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.shippingAddress = action.payload.shippingAddress || null;
        state.error = null;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
        // If cart not found (404), we can treat as empty cart
        if (action.payload?.includes('404') || action.payload?.includes('not found')) {
          state.items = [];
          state.total = 0;
          state.shippingAddress = null;
        }
      })

      // ----- Add to Cart -----
      .addCase(addToCart.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.shippingAddress = action.payload.shippingAddress || null;
        state.error = null;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Update Cart Item -----
      .addCase(updateCartItem.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.shippingAddress = action.payload.shippingAddress || null;
        state.error = null;
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Remove from Cart -----
      .addCase(removeFromCart.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.items || [];
        state.total = action.payload.total || 0;
        state.shippingAddress = action.payload.shippingAddress || null;
        state.error = null;
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Clear Cart -----
      .addCase(clearCart.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = [];
        state.total = 0;
        state.shippingAddress = null;
        state.error = null;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;