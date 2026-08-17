// src/features/user/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- Async Thunks -----

// Fetch user profile
export const fetchUserProfile = createAsyncThunk(
  'user/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/users/profile');
      return response.data.data; // { _id, name, email, role, addresses, wishlist, ... }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

// Update user profile
export const updateUserProfile = createAsyncThunk(
  'user/updateProfile',
  async (updateData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/users/profile', updateData);
      return response.data.data; // updated user object
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Profile update failed');
    }
  }
);

// Update user location
export const updateUserLocation = createAsyncThunk(
  'user/updateLocation',
  async ({ lat, lng, pincode, city }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/users/location', { lat, lng, pincode, city });
      return response.data.data; // updated user with location
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Location update failed');
    }
  }
);

// ----- Addresses -----

// Add new address
export const addAddress = createAsyncThunk(
  'user/addAddress',
  async (addressData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/users/addresses', addressData);
      return response.data.data; // array of addresses
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add address');
    }
  }
);

// Update an address
export const updateAddress = createAsyncThunk(
  'user/updateAddress',
  async ({ addressId, addressData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/users/addresses/${addressId}`, addressData);
      return response.data.data; // updated addresses array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update address');
    }
  }
);

// Delete an address
export const deleteAddress = createAsyncThunk(
  'user/deleteAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/users/addresses/${addressId}`);
      return response.data.data; // updated addresses array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete address');
    }
  }
);

// Set default address
export const setDefaultAddress = createAsyncThunk(
  'user/setDefaultAddress',
  async (addressId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`/users/addresses/${addressId}/default`);
      return response.data.data; // updated addresses array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to set default address');
    }
  }
);

// ----- Wishlist -----

// Get wishlist
export const fetchWishlist = createAsyncThunk(
  'user/fetchWishlist',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/users/wishlist');
      return response.data.data; // array of product objects
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch wishlist');
    }
  }
);

// Toggle wishlist (add/remove)
export const toggleWishlist = createAsyncThunk(
  'user/toggleWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      // We'll try to add; if already exists, the API might return 400,
      // but we can handle by removing. However the API in Postman shows:
      // POST /api/users/wishlist/:productId (add)
      // DELETE /api/users/wishlist/:productId (remove)
      // We need to know if it's already in wishlist. Usually we check local state.
      // We'll attempt to add; if it fails with "already in wishlist", we can remove.
      // But simpler: we can call a generic "toggle" endpoint if exists, but it's not.
      // So we'll check if product is already in wishlist in component and call add or delete accordingly.
      // However, we can still use a single thunk that decides based on current state.
      // We'll implement separate actions for add/remove, but we'll combine into one "toggle" that accepts an action type.
      // To keep it simple, we'll use two separate thunks: addToWishlist and removeFromWishlist.
      // We'll also provide a combined toggle that uses the current state.
      // Let's create addToWishlist and removeFromWishlist.
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Wishlist toggle failed');
    }
  }
);

// Add to wishlist
export const addToWishlist = createAsyncThunk(
  'user/addToWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/users/wishlist/${productId}`);
      return response.data.data; // updated wishlist array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to add to wishlist');
    }
  }
);

// Remove from wishlist
export const removeFromWishlist = createAsyncThunk(
  'user/removeFromWishlist',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`/users/wishlist/${productId}`);
      return response.data.data; // updated wishlist array
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to remove from wishlist');
    }
  }
);

// ----- Initial State -----
const initialState = {
  profile: null,       // full user object
  addresses: [],       // list of address objects
  wishlist: [],        // list of product objects (or IDs)
  status: 'idle',      // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

// ----- Slice -----
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // For manually clearing user data (e.g., on logout)
    clearUserData: (state) => {
      state.profile = null;
      state.addresses = [];
      state.wishlist = [];
      state.status = 'idle';
      state.error = null;
    },
    // Optimistic updates: can be used for wishlist toggle locally
    optimisticToggleWishlist: (state, action) => {
      const productId = action.payload;
      const index = state.wishlist.findIndex((item) => item._id === productId);
      if (index !== -1) {
        state.wishlist.splice(index, 1);
      } else {
        // We don't have the full product object; we could add a placeholder
        // But better to rely on server response after API call.
        // We'll not implement optimistic here; use API response.
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // ----- Fetch Profile -----
      .addCase(fetchUserProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
        state.addresses = action.payload.addresses || [];
        state.wishlist = action.payload.wishlist || [];
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // ----- Update Profile -----
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.addresses = action.payload.addresses || state.addresses;
        state.wishlist = action.payload.wishlist || state.wishlist;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Update Location -----
      .addCase(updateUserLocation.fulfilled, (state, action) => {
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateUserLocation.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Addresses -----
      .addCase(addAddress.fulfilled, (state, action) => {
        state.addresses = action.payload;
        if (state.profile) state.profile.addresses = action.payload;
        state.error = null;
      })
      .addCase(addAddress.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(updateAddress.fulfilled, (state, action) => {
        state.addresses = action.payload;
        if (state.profile) state.profile.addresses = action.payload;
        state.error = null;
      })
      .addCase(updateAddress.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(deleteAddress.fulfilled, (state, action) => {
        state.addresses = action.payload;
        if (state.profile) state.profile.addresses = action.payload;
        state.error = null;
      })
      .addCase(deleteAddress.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(setDefaultAddress.fulfilled, (state, action) => {
        state.addresses = action.payload;
        if (state.profile) state.profile.addresses = action.payload;
        state.error = null;
      })
      .addCase(setDefaultAddress.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ----- Wishlist -----
      .addCase(fetchWishlist.fulfilled, (state, action) => {
        state.wishlist = action.payload;
        state.error = null;
      })
      .addCase(fetchWishlist.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(addToWishlist.fulfilled, (state, action) => {
        state.wishlist = action.payload;
        state.error = null;
      })
      .addCase(addToWishlist.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(removeFromWishlist.fulfilled, (state, action) => {
        state.wishlist = action.payload;
        state.error = null;
      })
      .addCase(removeFromWishlist.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// ----- Export actions & reducer -----
export const { clearUserData, optimisticToggleWishlist } = userSlice.actions;
export default userSlice.reducer;