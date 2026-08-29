// client/src/pages/admin/CMS.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchAdminBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  toggleBannerStatus,
  reorderBanners,
  fetchCMSConfig,
  updateCMSConfig,
} from '../../features/cms/cmsSlice';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import {
  Layers,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Megaphone,
  Sparkles,
  ExternalLink,
  MousePointerClick,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Search,
  Calendar,
  Tag,
  Palette,
  LayoutTemplate,
  MonitorPlay,
  UploadCloud,
  Link2,
} from 'lucide-react';

const BANNER_SLOTS = [
  { id: 'hero_slider', label: 'Hero Slider Carousel', desc: 'Main full-width slider at the very top of homepage' },
  { id: 'promo_top', label: 'Top Promo Grid', desc: 'Category & deal cards below hero section' },
  { id: 'promo_middle', label: 'Middle Banner Strip', desc: 'Wide atmospheric banner dividing product sections' },
  { id: 'flash_sale', label: 'Flash Sale Highlight', desc: 'Urgent countdown or discount spotlight banner' },
  { id: 'footer_banner', label: 'Footer Promo Banner', desc: 'Promotional callout banner above footer' },
];

const PRESET_LINKS = [
  { label: 'All Products', value: '/products' },
  { label: 'Electronics Category', value: '/products?category=electronics' },
  { label: 'Fashion & Clothing', value: '/products?category=cloth' },
  { label: 'Special Deals', value: '/products?deals=true' },
];

const PRESET_COLORS = [
  { name: 'Emerald Deep', bg: '#124B38', text: '#ffffff' },
  { name: 'Midnight Slate', bg: '#0f172a', text: '#ffffff' },
  { name: 'Indigo Royal', bg: '#3730a3', text: '#ffffff' },
  { name: 'Crimson Bold', bg: '#991b1b', text: '#ffffff' },
  { name: 'Amber Warm', bg: '#78350f', text: '#ffffff' },
];

const CMS = () => {
  const dispatch = useDispatch();
  const { banners, stats, cmsConfig, status, actionLoading } = useSelector(
    (state) => state.cms
  );

  const [activeTab, setActiveTab] = useState('hero_slider'); // 'hero_slider' | 'promo' | 'announcement' | 'simulator'
  const [slotFilter, setSlotFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Modal state
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'file'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    imageUrl: '',
    link: '/products',
    ctaText: 'Shop Now',
    slot: 'hero_slider',
    badgeText: '',
    bgColor: '#0f172a',
    textColor: '#ffffff',
    order: 0,
    isActive: true,
    startDate: '',
    endDate: '',
  });

  // Announcement Bar Form state
  const [announcementData, setAnnouncementData] = useState({
    enabled: true,
    text: '',
    link: '/products',
    badge: 'SPECIAL DEAL',
    bgColor: '#124B38',
    textColor: '#ffffff',
  });

  // Hero Carousel Settings State
  const [heroSettingsData, setHeroSettingsData] = useState({
    autoPlayInterval: 6000,
    showDots: true,
    showArrows: true,
  });

  // Load initial data
  useEffect(() => {
    dispatch(fetchAdminBanners({ limit: 100 }));
    dispatch(fetchCMSConfig());
  }, [dispatch]);

  // Sync CMS config to local state
  useEffect(() => {
    if (cmsConfig) {
      if (cmsConfig.announcement) {
        setAnnouncementData({
          enabled: cmsConfig.announcement.enabled ?? true,
          text: cmsConfig.announcement.text || '',
          link: cmsConfig.announcement.link || '/products',
          badge: cmsConfig.announcement.badge || 'PROMO',
          bgColor: cmsConfig.announcement.bgColor || '#124B38',
          textColor: cmsConfig.announcement.textColor || '#ffffff',
        });
      }
      if (cmsConfig.heroSettings) {
        setHeroSettingsData({
          autoPlayInterval: cmsConfig.heroSettings.autoPlayInterval || 6000,
          showDots: cmsConfig.heroSettings.showDots ?? true,
          showArrows: cmsConfig.heroSettings.showArrows ?? true,
        });
      }
    }
  }, [cmsConfig]);

  // Filtered banners
  const filteredBanners = useMemo(() => {
    if (!Array.isArray(banners)) return [];
    return banners.filter((b) => {
      const matchSlot =
        activeTab === 'hero_slider'
          ? b.slot === 'hero_slider'
          : activeTab === 'promo'
          ? b.slot !== 'hero_slider' && (slotFilter === 'all' || b.slot === slotFilter)
          : true;

      const matchSearch =
        !searchTerm.trim() ||
        b.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.subtitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.badgeText?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchSlot && matchSearch;
    });
  }, [banners, activeTab, slotFilter, searchTerm]);

  // Open Create Modal
  const handleOpenCreateModal = (defaultSlot = 'hero_slider') => {
    setEditingBanner(null);
    setImageMode('url');
    setSelectedFile(null);
    setFilePreview('');
    setFormData({
      title: '',
      subtitle: '',
      description: '',
      imageUrl: '',
      link: '/products',
      ctaText: 'Shop Now',
      slot: activeTab === 'hero_slider' ? 'hero_slider' : defaultSlot,
      badgeText: '',
      bgColor: '#0f172a',
      textColor: '#ffffff',
      order: banners.length,
      isActive: true,
      startDate: '',
      endDate: '',
    });
    setBannerModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (banner) => {
    setEditingBanner(banner);
    setImageMode(banner.image?.publicId ? 'file' : 'url');
    setSelectedFile(null);
    setFilePreview(banner.image?.url || '');
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      imageUrl: banner.image?.url || '',
      link: banner.link || '/products',
      ctaText: banner.ctaText || 'Shop Now',
      slot: banner.slot || 'hero_slider',
      badgeText: banner.badgeText || '',
      bgColor: banner.bgColor || '#0f172a',
      textColor: banner.textColor || '#ffffff',
      order: banner.order || 0,
      isActive: banner.isActive ?? true,
      startDate: banner.startDate ? banner.startDate.split('T')[0] : '',
      endDate: banner.endDate ? banner.endDate.split('T')[0] : '',
    });
    setBannerModalOpen(true);
  };

  // File change handler
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
    }
  };

  // Submit Banner Create / Edit
  const handleSubmitBanner = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Banner title is required');
      return;
    }

    if (imageMode === 'url' && !formData.imageUrl.trim()) {
      toast.error('Please provide a valid image URL');
      return;
    }

    if (imageMode === 'file' && !selectedFile && !editingBanner?.image?.url) {
      toast.error('Please upload a banner image');
      return;
    }

    try {
      let payload;
      if (imageMode === 'file' && selectedFile) {
        payload = new FormData();
        payload.append('image', selectedFile);
        payload.append('title', formData.title.trim());
        payload.append('subtitle', formData.subtitle.trim());
        payload.append('description', formData.description.trim());
        payload.append('link', formData.link.trim());
        payload.append('ctaText', formData.ctaText.trim());
        payload.append('slot', formData.slot);
        payload.append('badgeText', formData.badgeText.trim());
        payload.append('bgColor', formData.bgColor);
        payload.append('textColor', formData.textColor);
        payload.append('order', formData.order);
        payload.append('isActive', formData.isActive);
        if (formData.startDate) payload.append('startDate', formData.startDate);
        if (formData.endDate) payload.append('endDate', formData.endDate);
      } else {
        payload = {
          ...formData,
          imageUrl: formData.imageUrl.trim(),
        };
      }

      if (editingBanner) {
        await dispatch(updateBanner({ id: editingBanner._id, data: payload })).unwrap();
        toast.success('Banner updated successfully!');
      } else {
        await dispatch(createBanner(payload)).unwrap();
        toast.success('Banner created successfully!');
      }

      setBannerModalOpen(false);
      dispatch(fetchAdminBanners({ limit: 100 }));
    } catch (err) {
      toast.error(typeof err === 'string' ? err : err?.message || 'Failed to save banner');
    }
  };

  // Toggle Active Status
  const handleToggleStatus = async (bannerId) => {
    try {
      await dispatch(toggleBannerStatus(bannerId)).unwrap();
      toast.success('Banner visibility updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  // Delete Banner
  const handleDeleteBanner = async (bannerId, title) => {
    if (!window.confirm(`Are you sure you want to delete banner "${title}"?`)) return;
    try {
      await dispatch(deleteBanner(bannerId)).unwrap();
      toast.success('Banner deleted');
    } catch (err) {
      toast.error('Failed to delete banner');
    }
  };

  // Reorder Item (Move up / down)
  const handleMoveOrder = async (index, direction) => {
    const list = [...filteredBanners];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    // Swap order values
    const currentItem = list[index];
    const targetItem = list[targetIndex];

    const updatedItems = [
      { id: currentItem._id, order: targetItem.order || targetIndex },
      { id: targetItem._id, order: currentItem.order || index },
    ];

    try {
      await dispatch(reorderBanners(updatedItems)).unwrap();
      toast.success('Order rearranged');
      dispatch(fetchAdminBanners({ limit: 100 }));
    } catch (err) {
      toast.error('Failed to reorder');
    }
  };

  // Save Announcement Settings
  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await dispatch(
        updateCMSConfig({
          announcement: announcementData,
          heroSettings: heroSettingsData,
        })
      ).unwrap();
      toast.success('Homepage CMS settings saved!');
    } catch (err) {
      toast.error('Failed to update CMS config');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ──────────────── Top Header & Overview ──────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Homepage CMS & Banner Management
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Control storefront hero sliders, promotional cards, and live announcement tickers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              dispatch(fetchAdminBanners({ limit: 100 }));
              dispatch(fetchCMSConfig());
              toast.info('Refreshed CMS data');
            }}
            className="rounded-xl"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenCreateModal()}
            className="bg-purple-600 hover:bg-purple-700 rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" /> Add New Banner
          </Button>
        </div>
      </div>

      {/* ──────────────── Key Stats Metrics ──────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Total Banners</span>
            <ImageIcon className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.totalBanners || 0}</p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            {stats.activeBanners || 0} active live on store
          </span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Hero Slider Slides</span>
            <Sliders className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-indigo-700 mt-2">
            {banners.filter((b) => b.slot === 'hero_slider' && b.isActive).length}
          </p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Rotating carousel slides
          </span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Announcement Ticker</span>
            <Megaphone className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-sm font-black text-slate-900 mt-2 truncate">
            {announcementData.enabled ? '🟢 Live Active' : '⚪ Disabled'}
          </p>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block truncate">
            {announcementData.text || 'No ticker text'}
          </span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Customer Clicks</span>
            <MousePointerClick className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700 mt-2">{stats.totalClicks || 0}</p>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Storefront CTA interactions
          </span>
        </div>
      </div>

      {/* ──────────────── Main Tabs Navigation ──────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="flex border-b border-slate-100 px-4 pt-3 bg-slate-50/50 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('hero_slider')}
            className={`px-4 py-3 text-xs font-bold rounded-t-2xl flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'hero_slider'
                ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4" /> Hero Carousel Slides (
            {banners.filter((b) => b.slot === 'hero_slider').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('promo')}
            className={`px-4 py-3 text-xs font-bold rounded-t-2xl flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'promo'
                ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutTemplate className="w-4 h-4" /> Promotional Slots & Strips (
            {banners.filter((b) => b.slot !== 'hero_slider').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('announcement')}
            className={`px-4 py-3 text-xs font-bold rounded-t-2xl flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'announcement'
                ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-4 h-4" /> Top Announcement Ticker
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-4 py-3 text-xs font-bold rounded-t-2xl flex items-center gap-2 border-b-2 transition cursor-pointer shrink-0 ${
              activeTab === 'simulator'
                ? 'border-purple-600 text-purple-700 bg-white shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <MonitorPlay className="w-4 h-4" /> Live Storefront Simulator
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* ========================================================================= */}
          {/* TAB 1: HERO SLIDER CAROUSEL                                               */}
          {/* ========================================================================= */}
          {activeTab === 'hero_slider' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                <div>
                  <h3 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" /> Rotating Hero Banner Slider
                  </h3>
                  <p className="text-xs text-purple-800 mt-0.5">
                    Slides are shown in order at the top of the homepage. Use the up/down controls to reorder.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenCreateModal('hero_slider')}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Slide
                </Button>
              </div>

              {/* Banners Grid */}
              {filteredBanners.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">No Hero Slider Banners Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Add your first hero banner slide to showcase seasonal discounts or featured promotions on the storefront.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleOpenCreateModal('hero_slider')}
                    className="mt-4 bg-purple-600 rounded-xl text-xs"
                  >
                    + Create First Slide
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredBanners.map((banner, index) => (
                    <div
                      key={banner._id}
                      className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all ${
                        banner.isActive
                          ? 'border-slate-200 hover:border-purple-300'
                          : 'border-slate-200/60 opacity-60 bg-slate-50/50'
                      }`}
                    >
                      {/* Banner Image Preview */}
                      <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-900 group">
                        <img
                          src={banner.image?.url}
                          alt={banner.title}
                          className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent p-3.5 flex flex-col justify-between text-white">
                          <div className="flex items-center justify-between">
                            {banner.badgeText && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider">
                                {banner.badgeText}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-bold text-slate-300 ml-auto">
                              Slide #{index + 1}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-extrabold text-sm text-white line-clamp-1">
                              {banner.title}
                            </h4>
                            {banner.subtitle && (
                              <p className="text-xs text-emerald-300 font-serif italic line-clamp-1">
                                {banner.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Banner Meta Info */}
                      <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                        <div className="flex items-center gap-2 truncate">
                          <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-mono text-[11px] text-slate-500 truncate max-w-[180px]">
                            {banner.link}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-[11px] text-emerald-700 shrink-0">
                          <MousePointerClick className="w-3 h-3" />
                          <span>{banner.clicks || 0} clicks</span>
                        </div>
                      </div>

                      {/* Action Toolbar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveOrder(index, 'up')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Move Slide Up"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === filteredBanners.length - 1}
                            onClick={() => handleMoveOrder(index, 'down')}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                            title="Move Slide Down"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(banner._id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                              banner.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {banner.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{banner.isActive ? 'Active' : 'Hidden'}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenEditModal(banner)}
                            className="p-1.5 rounded-lg text-slate-700"
                            title="Edit Banner"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteBanner(banner._id, banner.title)}
                            className="p-1.5 rounded-lg"
                            title="Delete Banner"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: PROMOTIONAL & STRIP BANNERS                                        */}
          {/* ========================================================================= */}
          {activeTab === 'promo' && (
            <div className="space-y-6">
              {/* Slot Filter Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Filter Placement:</span>
                  <select
                    value={slotFilter}
                    onChange={(e) => setSlotFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Promo Slots</option>
                    {BANNER_SLOTS.filter((s) => s.id !== 'hero_slider').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleOpenCreateModal(slotFilter !== 'all' ? slotFilter : 'promo_middle')}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Promo Banner
                </Button>
              </div>

              {filteredBanners.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="font-bold text-slate-700 text-sm">No Promotional Banners in this slot</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Create middle atmospheric strips or flash sale banners to engage shoppers navigating the homepage.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBanners.map((banner) => (
                    <div
                      key={banner._id}
                      className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 font-bold text-[10px] uppercase">
                          {BANNER_SLOTS.find((s) => s.id === banner.slot)?.label || banner.slot}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            banner.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {banner.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="w-full h-32 rounded-xl bg-slate-100 overflow-hidden border border-slate-100">
                        <img
                          src={banner.image?.url}
                          alt={banner.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{banner.title}</h4>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {banner.subtitle || banner.link}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="text-[11px] text-slate-400 font-medium">
                          {banner.clicks || 0} clicks
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleOpenEditModal(banner)}
                            className="p-1 rounded-lg"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteBanner(banner._id, banner.title)}
                            className="p-1 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: TOP ANNOUNCEMENT TICKER (CMS)                                     */}
          {/* ========================================================================= */}
          {activeTab === 'announcement' && (
            <form onSubmit={handleSaveAnnouncement} className="space-y-6 max-w-2xl">
              {/* Live Preview Box */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Live Top Bar Preview
                </label>
                <div
                  style={{
                    backgroundColor: announcementData.bgColor || '#124B38',
                    color: announcementData.textColor || '#ffffff',
                  }}
                  className="p-2.5 sm:p-3 rounded-2xl flex items-center justify-between px-4 text-xs font-semibold shadow-2xs transition-all"
                >
                  <div className="flex items-center gap-2 truncate">
                    {announcementData.badge && (
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase">
                        {announcementData.badge}
                      </span>
                    )}
                    <span className="truncate">{announcementData.text || 'Your announcement message goes here...'}</span>
                  </div>
                  {announcementData.link && (
                    <span className="text-[11px] underline font-bold shrink-0 ml-2">Shop Now →</span>
                  )}
                </div>
              </div>

              {/* Toggle Enable */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Enable Top Announcement Bar</h4>
                  <p className="text-[11px] text-slate-500">Show this announcement at the very top of all buyer pages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={announcementData.enabled}
                    onChange={(e) => setAnnouncementData({ ...announcementData, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              {/* Ticker Text */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Message</label>
                <input
                  type="text"
                  value={announcementData.text}
                  onChange={(e) => setAnnouncementData({ ...announcementData, text: e.target.value })}
                  placeholder="e.g. ⚡ Flash Sale: Enjoy free shipping & up to 40% OFF today only!"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={announcementData.badge}
                    onChange={(e) => setAnnouncementData({ ...announcementData, badge: e.target.value })}
                    placeholder="e.g. PROMO / FLASH DEAL"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Click URL</label>
                  <input
                    type="text"
                    value={announcementData.link}
                    onChange={(e) => setAnnouncementData({ ...announcementData, link: e.target.value })}
                    placeholder="e.g. /products?deals=true"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>
              </div>

              {/* Color Theme Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Color Theme Presets</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setAnnouncementData({ ...announcementData, bgColor: preset.bg, textColor: preset.text })}
                      style={{ backgroundColor: preset.bg, color: preset.text }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                        announcementData.bgColor === preset.bg ? 'ring-2 ring-purple-600 shadow-sm' : 'border-transparent opacity-80'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero Slider Timing */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <h4 className="font-bold text-xs text-slate-900">Hero Slider Rotation Speed</h4>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="3000"
                    max="15000"
                    step="1000"
                    value={heroSettingsData.autoPlayInterval}
                    onChange={(e) => setHeroSettingsData({ ...heroSettingsData, autoPlayInterval: parseInt(e.target.value) })}
                    className="w-full accent-purple-600"
                  />
                  <span className="text-xs font-bold text-slate-800 shrink-0">
                    {heroSettingsData.autoPlayInterval / 1000}s per slide
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={actionLoading}
                  className="bg-purple-600 hover:bg-purple-700 rounded-xl text-xs font-bold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" /> Save CMS Announcement Settings
                </Button>
              </div>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: LIVE STOREFRONT SIMULATOR                                         */}
          {/* ========================================================================= */}
          {activeTab === 'simulator' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl text-xs text-slate-600 font-semibold">
                <span className="flex items-center gap-1.5">
                  <MonitorPlay className="w-4 h-4 text-purple-600" /> Interactive Storefront Live Preview
                </span>
                <span className="text-[11px] text-slate-500">Scale: 100% Desktop Viewport</span>
              </div>

              {/* Mock Browser Container */}
              <div className="border border-slate-300 rounded-3xl overflow-hidden shadow-lg bg-white">
                {/* Mock Browser Bar */}
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="mx-auto bg-white px-6 py-1 rounded-lg text-[10px] font-mono text-slate-500 border border-slate-200">
                    https://vectorx.com
                  </div>
                </div>

                {/* Simulated Announcement Bar */}
                {announcementData.enabled && (
                  <div
                    style={{
                      backgroundColor: announcementData.bgColor,
                      color: announcementData.textColor,
                    }}
                    className="py-2 px-4 text-xs flex items-center justify-between font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      {announcementData.badge && (
                        <span className="px-1.5 py-0.2 rounded bg-white/20 text-[9px] font-bold">
                          {announcementData.badge}
                        </span>
                      )}
                      <span>{announcementData.text}</span>
                    </div>
                    <span className="text-[10px] underline font-bold">Shop Now →</span>
                  </div>
                )}

                {/* Simulated Hero Banner */}
                <div className="relative h-64 sm:h-80 bg-slate-900 overflow-hidden flex items-center px-8 text-white">
                  {banners.filter((b) => b.slot === 'hero_slider' && b.isActive)[0] ? (
                    <>
                      <img
                        src={banners.filter((b) => b.slot === 'hero_slider' && b.isActive)[0].image?.url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover filter brightness-75"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      <div className="relative z-10 max-w-md space-y-2">
                        <h2 className="text-2xl sm:text-3xl font-black">
                          {banners.filter((b) => b.slot === 'hero_slider' && b.isActive)[0].title}
                        </h2>
                        <p className="text-emerald-300 font-serif italic text-sm">
                          {banners.filter((b) => b.slot === 'hero_slider' && b.isActive)[0].subtitle}
                        </p>
                        <button className="bg-white text-slate-900 px-5 py-2 rounded-full font-bold text-xs shadow-md mt-2">
                          {banners.filter((b) => b.slot === 'hero_slider' && b.isActive)[0].ctaText || 'Shop Now'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center w-full text-slate-400">
                      <p className="text-xs">No active hero slide configured yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────────────── Add / Edit Banner Modal ──────────────── */}
      <Modal
        open={bannerModalOpen}
        onClose={() => setBannerModalOpen(false)}
        title={editingBanner ? 'Edit Banner Configuration' : 'Create New Banner'}
      >
        <form onSubmit={handleSubmitBanner} className="space-y-4 py-1 text-xs">
          {/* Slot Selection */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Banner Placement Slot</label>
            <select
              value={formData.slot}
              onChange={(e) => setFormData({ ...formData, slot: e.target.value })}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white font-semibold outline-none focus:ring-2 focus:ring-purple-500"
            >
              {BANNER_SLOTS.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label} — ({slot.desc})
                </option>
              ))}
            </select>
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Headline / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Discover the Latest Deals"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Highlight / Subtitle</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g. Up to 50% Off Today!"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              />
            </div>
          </div>

          {/* Image Input (Toggle URL vs Upload) */}
          <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800">Banner Image Source</label>
              <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    imageMode === 'url' ? 'bg-purple-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Image URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('file')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    imageMode === 'file' ? 'bg-purple-600 text-white' : 'text-slate-600'
                  }`}
                >
                  Upload File
                </button>
              </div>
            </div>

            {imageMode === 'url' ? (
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => {
                  setFormData({ ...formData, imageUrl: e.target.value });
                  setFilePreview(e.target.value);
                }}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                />
              </div>
            )}

            {/* Real-time image preview */}
            {(filePreview || formData.imageUrl) && (
              <div className="mt-2 h-28 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 relative">
                <img
                  src={filePreview || formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500';
                  }}
                />
                <span className="absolute bottom-1.5 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                  Image Preview
                </span>
              </div>
            )}
          </div>

          {/* CTA Text & Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Button / CTA Text</label>
              <input
                type="text"
                value={formData.ctaText}
                onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                placeholder="e.g. Shop Now / Explore"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Click URL</label>
              <input
                type="text"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="e.g. /products?category=cloth"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-mono"
              />
            </div>
          </div>

          {/* Quick link presets */}
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-slate-400 font-bold">Presets:</span>
            {PRESET_LINKS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setFormData({ ...formData, link: preset.value })}
                className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-semibold transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Badge & Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Badge Tag Text (Optional)</label>
              <input
                type="text"
                value={formData.badgeText}
                onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                placeholder="e.g. Up to 50% Off / Special"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Priority Order</label>
              <input
                type="number"
                min="0"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs bg-white outline-none focus:ring-2 focus:ring-purple-500 font-bold"
              />
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-bold text-slate-800">Banner Live Status</span>
            <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>{formData.isActive ? 'Active (Visible on Store)' : 'Inactive (Hidden)'}</span>
            </label>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setBannerModalOpen(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={actionLoading}
              className="bg-purple-600 hover:bg-purple-700 rounded-xl font-bold"
            >
              {editingBanner ? 'Update Banner' : 'Create Banner'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CMS;
