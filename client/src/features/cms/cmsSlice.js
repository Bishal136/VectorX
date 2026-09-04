// client/src/features/cms/cmsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';

// ----- 1. Public Storefront Thunks -----
export const fetchHomepageCMS = createAsyncThunk(
  'cms/fetchHomepageCMS',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/banners/homepage');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch homepage CMS');
    }
  }
);

export const fetchActiveBanners = createAsyncThunk(
  'cms/fetchActiveBanners',
  async (slot, { rejectWithValue }) => {
    try {
      const params = slot ? `?slot=${slot}` : '';
      const response = await axiosInstance.get(`/banners${params}`);
      return { slot, banners: response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch active banners');
    }
  }
);

export const trackBannerClick = createAsyncThunk(
  'cms/trackBannerClick',
  async (bannerId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(`/banners/${bannerId}/click`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to track banner click');
    }
  }
);

// ----- 2. Admin CMS Management Thunks -----
export const fetchAdminBanners = createAsyncThunk(
  'cms/fetchAdminBanners',
  async ({ page = 1, limit = 20, slot, isActive, search } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams({ page, limit });
      if (slot) params.append('slot', slot);
      if (isActive !== undefined && isActive !== '') params.append('isActive', isActive);
      if (search && search.trim()) params.append('search', search.trim());

      const response = await axiosInstance.get(`/banners/admin?${params}`);
      return response.data.data; // { banners, pagination, stats }
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch banners list');
    }
  }
);

export const createBanner = createAsyncThunk(
  'cms/createBanner',
  async (bannerData, { rejectWithValue }) => {
    try {
      const isFormData = bannerData instanceof FormData;
      const response = await axiosInstance.post('/banners/admin', bannerData, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create banner');
    }
  }
);

export const updateBanner = createAsyncThunk(
  'cms/updateBanner',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const isFormData = data instanceof FormData;
      const response = await axiosInstance.put(`/banners/admin/${id}`, data, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update banner');
    }
  }
);

export const deleteBanner = createAsyncThunk(
  'cms/deleteBanner',
  async (bannerId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(`/banners/admin/${bannerId}`);
      return bannerId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete banner');
    }
  }
);

export const toggleBannerStatus = createAsyncThunk(
  'cms/toggleBannerStatus',
  async (bannerId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.patch(`/banners/admin/${bannerId}/toggle`);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to toggle banner status');
    }
  }
);

export const reorderBanners = createAsyncThunk(
  'cms/reorderBanners',
  async (items, { rejectWithValue }) => {
    try {
      await axiosInstance.post('/banners/admin/reorder', { items });
      return items;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reorder banners');
    }
  }
);

export const fetchCMSConfig = createAsyncThunk(
  'cms/fetchCMSConfig',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('/banners/admin/cms');
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch CMS config');
    }
  }
);

export const updateCMSConfig = createAsyncThunk(
  'cms/updateCMSConfig',
  async (configData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put('/banners/admin/cms', configData);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update CMS config');
    }
  }
);

export const uploadCMSLogo = createAsyncThunk(
  'cms/uploadCMSLogo',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post('/banners/admin/cms/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to upload logo');
    }
  }
);

const initialState = {
  homepageData: {
    banners: {
      hero_slider: [],
      promo_top: [],
      promo_middle: [],
      flash_sale: [],
      footer_banner: []
    },
    allActive: [],
    announcement: {
      enabled: true,
      text: '⚡ Special Offer: Free shipping on orders over ৳1,000! Use code DEALPORT',
      link: '/products',
      badge: 'PROMO',
      bgColor: '#124B38',
      textColor: '#ffffff'
    },
    heroSettings: {
      autoPlayInterval: 6000,
      showDots: true,
      showArrows: true
    },
    promoSection: {
      enabled: true,
      title: 'Featured Collections',
      tagline: 'Handpicked best-sellers and top categories'
    },
    logo: {
      type: 'both',
      imageUrl: '/logo.png',
      publicId: '',
      text: 'কাছাকাছি',
      subtext: 'Nearby',
      height: 44,
      adminHeight: 38,
      altText: 'কাছাকাছি Nearby Logo'
    }
  },
  banners: [],
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
  },
  stats: {
    totalBanners: 0,
    activeBanners: 0,
    inactiveBanners: 0,
    totalClicks: 0
  },
  cmsConfig: null,
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  actionLoading: false,
  error: null
};

const cmsSlice = createSlice({
  name: 'cms',
  initialState,
  reducers: {
    clearCMSError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchHomepageCMS
      .addCase(fetchHomepageCMS.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchHomepageCMS.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.homepageData = action.payload;
      })
      .addCase(fetchHomepageCMS.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // fetchAdminBanners
      .addCase(fetchAdminBanners.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAdminBanners.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.banners = action.payload.banners || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.stats = action.payload.stats || state.stats;
      })
      .addCase(fetchAdminBanners.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })

      // createBanner
      .addCase(createBanner.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(createBanner.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.banners.unshift(action.payload);
        state.stats.totalBanners += 1;
        if (action.payload.isActive) state.stats.activeBanners += 1;
      })
      .addCase(createBanner.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // updateBanner
      .addCase(updateBanner.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateBanner.fulfilled, (state, action) => {
        state.actionLoading = false;
        const idx = state.banners.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) {
          state.banners[idx] = action.payload;
        }
      })
      .addCase(updateBanner.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // deleteBanner
      .addCase(deleteBanner.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(deleteBanner.fulfilled, (state, action) => {
        state.actionLoading = false;
        const deletedId = action.payload;
        const target = state.banners.find((b) => b._id === deletedId);
        if (target) {
          state.stats.totalBanners = Math.max(0, state.stats.totalBanners - 1);
          if (target.isActive) {
            state.stats.activeBanners = Math.max(0, state.stats.activeBanners - 1);
          }
        }
        state.banners = state.banners.filter((b) => b._id !== deletedId);
      })
      .addCase(deleteBanner.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // toggleBannerStatus
      .addCase(toggleBannerStatus.fulfilled, (state, action) => {
        const idx = state.banners.findIndex((b) => b._id === action.payload._id);
        if (idx !== -1) {
          const wasActive = state.banners[idx].isActive;
          state.banners[idx] = action.payload;
          if (action.payload.isActive && !wasActive) {
            state.stats.activeBanners += 1;
          } else if (!action.payload.isActive && wasActive) {
            state.stats.activeBanners = Math.max(0, state.stats.activeBanners - 1);
          }
        }
      })

      // reorderBanners
      .addCase(reorderBanners.fulfilled, (state, action) => {
        const orderMap = new Map(action.payload.map((i) => [i.id, i.order]));
        state.banners = state.banners
          .map((b) => (orderMap.has(b._id) ? { ...b, order: orderMap.get(b._id) } : b))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
      })

      // fetchCMSConfig & updateCMSConfig & uploadCMSLogo
      .addCase(fetchCMSConfig.fulfilled, (state, action) => {
        state.cmsConfig = action.payload;
        if (action.payload?.logo) {
          state.homepageData.logo = action.payload.logo;
        }
      })
      .addCase(updateCMSConfig.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(updateCMSConfig.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.cmsConfig = action.payload;
        if (action.payload?.announcement) state.homepageData.announcement = action.payload.announcement;
        if (action.payload?.heroSettings) state.homepageData.heroSettings = action.payload.heroSettings;
        if (action.payload?.promoSection) state.homepageData.promoSection = action.payload.promoSection;
        if (action.payload?.logo) state.homepageData.logo = action.payload.logo;
      })
      .addCase(updateCMSConfig.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })
      .addCase(uploadCMSLogo.pending, (state) => {
        state.actionLoading = true;
      })
      .addCase(uploadCMSLogo.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.cmsConfig = action.payload;
        if (action.payload?.logo) state.homepageData.logo = action.payload.logo;
      })
      .addCase(uploadCMSLogo.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload;
      })

      // trackBannerClick
      .addCase(trackBannerClick.fulfilled, (state, action) => {
        const { id, clicks } = action.payload;
        const banner = state.banners.find((b) => b._id === id);
        if (banner) banner.clicks = clicks;
      });
  }
});

export const { clearCMSError } = cmsSlice.actions;
export default cmsSlice.reducer;
