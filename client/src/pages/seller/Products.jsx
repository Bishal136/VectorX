import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  clearSellerError,
} from '../../features/seller/sellerSlice';
import axiosInstance from '../../services/axiosInstance';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';

const formatCurrency = (amount) => {
  return `৳${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const initialFormData = {
  name: '',
  description: '',
  price: '',
  comparePrice: '',
  category: '',
  stock: 0,
  lowStockThreshold: 5,
  images: [],
  video: { url: '', publicId: '', thumbnail: '' },
  hasVariants: false,
  variants: [],
  isActive: true,
};

// Preset colors and sizes for quick variant creation
const COLOR_PRESETS = ['Black', 'White', 'Red', 'Blue', 'Green', 'Navy', 'Gray', 'Yellow', 'Pink', 'Purple'];
const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SHOE_SIZE_PRESETS = ['38', '39', '40', '41', '42', '43', '44', '45'];
const STORAGE_PRESETS = ['64GB', '128GB', '256GB', '512GB', '1TB'];

const getEmbedVideoUrl = (url = '') => {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }
  const vimeoMatch = url.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|)(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }
  return null;
};

const Products = () => {
  const dispatch = useDispatch();
  const { products, productPagination, status, actionLoading, error } = useSelector(
    (state) => state.seller
  );

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Categories list for dropdown
  const [categories, setCategories] = useState([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  // Active form section in modal
  const [activeFormTab, setActiveFormTab] = useState('basic'); // 'basic' | 'pricing' | 'media' | 'variants'

  // Form State
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState('');

  // Media inputs & upload state
  const [imageInputMode, setImageInputMode] = useState('upload'); // 'upload' | 'url'
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImages, setUploadingImages] = useState(false);
  const imageFileInputRef = useRef(null);

  const [videoInputMode, setVideoInputMode] = useState('upload'); // 'upload' | 'url'
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const videoFileInputRef = useRef(null);

  // Variant helper input state
  const [newOptionValues, setNewOptionValues] = useState({});

  // Fetch categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await axiosInstance.get('/products/categories');
        if (res.data?.data?.categories) {
          setCategories(res.data.data.categories);
        } else if (Array.isArray(res.data?.data)) {
          setCategories(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    loadCategories();
  }, []);

  // Fetch products
  useEffect(() => {
    dispatch(
      fetchSellerProducts({
        page: currentPage,
        limit: 10,
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
      })
    );
  }, [dispatch, currentPage, search, categoryFilter]);

  const handleOpenAdd = () => {
    setFormData({
      ...initialFormData,
      category: categories.length > 0 ? categories[0]._id : '',
      images: [],
      video: { url: '', publicId: '', thumbnail: '' },
      hasVariants: false,
      variants: [],
    });
    setNewImageUrl('');
    setNewVideoUrl('');
    setFormError('');
    setActiveFormTab('basic');
    setNewOptionValues({});
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      comparePrice: product.comparePrice || '',
      category: product.category?._id || product.category || '',
      stock: product.stock ?? 0,
      lowStockThreshold: product.lowStockThreshold ?? 5,
      images: Array.isArray(product.images) ? product.images : [],
      video: product.video || { url: '', publicId: '', thumbnail: '' },
      hasVariants: Boolean(product.hasVariants || product.variants?.length > 0),
      variants: Array.isArray(product.variants) ? product.variants : [],
      isActive: product.isActive ?? true,
    });
    setNewImageUrl('');
    setNewVideoUrl(product.video?.url || '');
    setFormError('');
    setActiveFormTab('basic');
    setNewOptionValues({});
  };

  // ----------------- Image Handlers -----------------
  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    try {
      new URL(newImageUrl.trim());
      const isPrimary = formData.images.length === 0;
      setFormData((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          {
            url: newImageUrl.trim(),
            publicId: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            isPrimary,
          },
        ],
      }));
      setNewImageUrl('');
    } catch {
      setFormError('Please enter a valid Image URL (https://...)');
    }
  };

  const handleImageFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingImages(true);
    setFormError('');

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setFormError(`${file.name} is not a valid image format.`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          setFormError(`${file.name} exceeds 10MB limit.`);
          continue;
        }

        const uploadData = new FormData();
        uploadData.append('image', file);

        const res = await axiosInstance.post('/sellers/upload/image', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.data) {
          setFormData((prev) => {
            const isPrimary = prev.images.length === 0;
            return {
              ...prev,
              images: [
                ...prev.images,
                {
                  url: res.data.data.url,
                  publicId: res.data.data.publicId,
                  isPrimary,
                },
              ],
            };
          });
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to upload image(s) to Cloudinary');
    } finally {
      setUploadingImages(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    }
  };

  const handleSetPrimaryImage = (indexToSet) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.map((img, idx) => ({
        ...img,
        isPrimary: idx === indexToSet,
      })),
    }));
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => {
      const remaining = prev.images.filter((_, idx) => idx !== indexToRemove);
      // If we removed the primary image and others remain, make the first one primary
      if (remaining.length > 0 && !remaining.some((img) => img.isPrimary)) {
        remaining[0].isPrimary = true;
      }
      return {
        ...prev,
        images: remaining,
      };
    });
  };

  // ----------------- Video Handlers -----------------
  const handleAddVideoUrl = () => {
    if (!newVideoUrl.trim()) return;
    try {
      new URL(newVideoUrl.trim());
      setFormData((prev) => ({
        ...prev,
        video: {
          url: newVideoUrl.trim(),
          publicId: `vid_${Date.now()}`,
          thumbnail: '',
        },
      }));
    } catch {
      setFormError('Please enter a valid video URL (YouTube link or MP4 URL)');
    }
  };

  const handleVideoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setFormError('Please select a valid video file (MP4, WebM, MOV)');
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setFormError('Video size must be under 100MB');
      return;
    }

    setUploadingVideo(true);
    setFormError('');

    try {
      const uploadData = new FormData();
      uploadData.append('video', file);

      const res = await axiosInstance.post('/sellers/upload/video', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.data) {
        setFormData((prev) => ({
          ...prev,
          video: {
            url: res.data.data.url,
            publicId: res.data.data.publicId,
            thumbnail: res.data.data.thumbnail || '',
          },
        }));
        setNewVideoUrl('');
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to upload video to Cloudinary');
    } finally {
      setUploadingVideo(false);
      if (videoFileInputRef.current) videoFileInputRef.current.value = '';
    }
  };

  const handleRemoveVideo = () => {
    setFormData((prev) => ({
      ...prev,
      video: { url: '', publicId: '', thumbnail: '' },
    }));
    setNewVideoUrl('');
  };

  // ----------------- Variant Handlers -----------------
  const handleAddVariantGroup = (name = 'Color') => {
    if (formData.variants.some((v) => v.name.toLowerCase() === name.toLowerCase())) {
      setFormError(`Variant '${name}' already exists.`);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      hasVariants: true,
      variants: [
        ...prev.variants,
        {
          name,
          options: [],
        },
      ],
    }));
  };

  const handleRemoveVariantGroup = (groupIndex) => {
    setFormData((prev) => {
      const updated = prev.variants.filter((_, idx) => idx !== groupIndex);
      return {
        ...prev,
        variants: updated,
        hasVariants: updated.length > 0,
      };
    });
  };

  const handleAddOptionTag = (groupIndex, optionValue) => {
    const trimmed = (optionValue || '').trim();
    if (!trimmed) return;

    const group = formData.variants[groupIndex];
    if (group.options.some((opt) => opt.value.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }

    const newOption = {
      value: trimmed,
      price: '',
      stock: Number(formData.stock) || 0,
      sku: '',
    };

    setFormData((prev) => {
      const nextVariants = [...prev.variants];
      nextVariants[groupIndex] = {
        ...nextVariants[groupIndex],
        options: [...nextVariants[groupIndex].options, newOption],
      };
      return { ...prev, variants: nextVariants };
    });

    setNewOptionValues((prev) => ({ ...prev, [groupIndex]: '' }));
  };

  const handleRemoveOptionTag = (groupIndex, optionIndex) => {
    setFormData((prev) => {
      const nextVariants = [...prev.variants];
      nextVariants[groupIndex] = {
        ...nextVariants[groupIndex],
        options: nextVariants[groupIndex].options.filter((_, idx) => idx !== optionIndex),
      };
      return { ...prev, variants: nextVariants };
    });
  };

  const handleUpdateOptionField = (groupIndex, optionIndex, field, value) => {
    setFormData((prev) => {
      const nextVariants = [...prev.variants];
      const nextOptions = [...nextVariants[groupIndex].options];
      nextOptions[optionIndex] = {
        ...nextOptions[optionIndex],
        [field]: value,
      };
      nextVariants[groupIndex] = {
        ...nextVariants[groupIndex],
        options: nextOptions,
      };
      return { ...prev, variants: nextVariants };
    });
  };

  // ----------------- Submit Handler -----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Product title is required');
      setActiveFormTab('basic');
      return;
    }
    if (!formData.price || Number(formData.price) < 0) {
      setFormError('Valid price is required');
      setActiveFormTab('pricing');
      return;
    }
    if (!formData.category) {
      setFormError('Category is required');
      setActiveFormTab('basic');
      return;
    }

    let finalImages = [...formData.images];
    if (newImageUrl.trim()) {
      try {
        new URL(newImageUrl.trim());
        finalImages.push({
          url: newImageUrl.trim(),
          publicId: `img_${Date.now()}`,
          isPrimary: finalImages.length === 0,
        });
      } catch {
        // ignore if invalid
      }
    }

    // Format variants payload
    let cleanVariants = [];
    if (formData.hasVariants && formData.variants.length > 0) {
      cleanVariants = formData.variants
        .map((v) => ({
          name: v.name.trim(),
          options: v.options.map((opt) => ({
            value: opt.value.trim(),
            price: opt.price !== '' && opt.price !== null ? Number(opt.price) : undefined,
            stock: opt.stock !== '' && opt.stock !== null ? Number(opt.stock) : 0,
            sku: opt.sku ? opt.sku.trim() : undefined,
          })),
        }))
        .filter((v) => v.options.length > 0);
    }

    let finalVideo = formData.video;
    if (newVideoUrl.trim()) {
      finalVideo = {
        url: newVideoUrl.trim(),
        publicId: formData.video?.publicId || `vid_${Date.now()}`,
        thumbnail: formData.video?.thumbnail || '',
      };
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      category: formData.category,
      stock: Number(formData.stock) || 0,
      lowStockThreshold: Number(formData.lowStockThreshold) || 5,
      images: finalImages,
      video: finalVideo?.url ? finalVideo : { url: null, publicId: null, thumbnail: null },
      hasVariants: cleanVariants.length > 0,
      variants: cleanVariants.length > 0 ? cleanVariants : undefined,
      isActive: formData.isActive,
    };

    if (formData.comparePrice && Number(formData.comparePrice) > 0) {
      payload.comparePrice = Number(formData.comparePrice);
    }

    if (editingProduct) {
      const res = await dispatch(
        updateSellerProduct({ productId: editingProduct._id, productData: payload })
      );
      if (!res.error) {
        setEditingProduct(null);
      } else {
        setFormError(res.payload || 'Failed to update product');
      }
    } else {
      const res = await dispatch(createSellerProduct(payload));
      if (!res.error) {
        setIsAddModalOpen(false);
      } else {
        setFormError(res.payload || 'Failed to create product');
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const res = await dispatch(deleteSellerProduct(deletingProduct._id));
    if (!res.error) {
      setDeletingProduct(null);
    }
  };

  const handleToggleStatus = async (product) => {
    await dispatch(
      updateSellerProduct({
        productId: product._id,
        productData: { isActive: !product.isActive },
      })
    );
  };

  // Filter products in memory
  const filteredProducts = (products || []).filter((p) => {
    if (stockStatusFilter === 'active') return p.isActive;
    if (stockStatusFilter === 'inactive') return !p.isActive;
    if (stockStatusFilter === 'low_stock') return p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
    if (stockStatusFilter === 'out_of_stock') return p.stock === 0;
    return true;
  });

  const embedVideo = getEmbedVideoUrl(formData.video?.url);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Product Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your store's inventory, rich media, variations, and pricing.
          </p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" size="md">
          <span className="mr-1.5 text-lg">+</span> Add New Product
        </Button>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between text-sm">
          <span>{error}</span>
          <button
            onClick={() => dispatch(clearSellerError())}
            className="text-red-500 hover:text-red-700 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Controls & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col gap-4">
        {/* Search */}
        <div className="relative w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by product name..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 min-w-[140px] text-sm rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="flex-1 min-w-[140px] text-sm rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Stock Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="low_stock">Low Stock Alert</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Product List Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/75 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Media & Variants</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {status === 'loading' && !products?.length ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-gray-400">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
                  const isOutOfStock = p.stock === 0;
                  const primaryImg = p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url;

                  return (
                    <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Product Name & Thumbnail */}
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 border overflow-hidden shrink-0">
                            {primaryImg ? (
                              <img
                                src={primaryImg}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.src = 'https://placehold.co/100x100?text=No+Img';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 font-bold">
                                📦
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 max-w-[200px] lg:max-w-xs">
                            <p className="truncate text-gray-900 font-semibold">{p.name}</p>
                            <span className="text-xs text-gray-400">SKU: {p.sku || 'N/A'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4">
                        <Badge tone="neutral">{p.category?.name || 'Uncategorized'}</Badge>
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{formatCurrency(p.price)}</div>
                        {p.comparePrice && p.comparePrice > p.price && (
                          <div className="text-xs text-gray-400 line-through">
                            {formatCurrency(p.comparePrice)}
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{p.stock}</span>
                          {isOutOfStock && <Badge tone="danger">Out of Stock</Badge>}
                          {isLowStock && <Badge tone="warning">Low Stock</Badge>}
                        </div>
                      </td>

                      {/* Media & Variants summary */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-gray-500">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            📷 {p.images?.length || 0}
                          </span>
                          {p.video?.url && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                              🎬 Video
                            </span>
                          )}
                          {p.variants?.length > 0 && (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">
                              ✨ {p.variants.length} var
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className="cursor-pointer focus:outline-none"
                          title="Click to toggle status"
                        >
                          <Badge tone={p.isActive ? 'success' : 'neutral'}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium text-xs px-2.5 py-1.5 rounded hover:bg-indigo-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeletingProduct(p)}
                            className="text-red-600 hover:text-red-900 font-medium text-xs px-2.5 py-1.5 rounded hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {productPagination?.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing page {productPagination.page} of {productPagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= productPagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Card List */}
      <div className="md:hidden space-y-3">
        {status === 'loading' && !products?.length ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-400">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-400">
            No products found matching your search.
          </div>
        ) : (
          filteredProducts.map((p) => {
            const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
            const isOutOfStock = p.stock === 0;
            const primaryImg = p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url;

            return (
              <div
                key={p._id}
                className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex gap-3.5"
              >
                <div className="w-20 h-20 rounded-lg bg-gray-100 border overflow-hidden shrink-0">
                  {primaryImg ? (
                    <img
                      src={primaryImg}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/100x100?text=No+Img';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl text-gray-400 font-bold">
                      📦
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
                      {p.name}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(p)}
                      className="cursor-pointer focus:outline-none shrink-0"
                    >
                      <Badge tone={p.isActive ? 'success' : 'neutral'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </button>
                  </div>

                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.category?.name || 'Uncategorized'}
                  </p>

                  <div className="mt-2 flex items-center gap-2.5 flex-wrap">
                    <span className="font-bold text-gray-900 text-sm">
                      {formatCurrency(p.price)}
                    </span>
                    {p.comparePrice && p.comparePrice > p.price && (
                      <span className="text-xs text-gray-400 line-through">
                        {formatCurrency(p.comparePrice)}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      Stock: <strong className="text-gray-800">{p.stock}</strong>
                    </span>
                    {isOutOfStock && <Badge tone="danger">Out of Stock</Badge>}
                    {isLowStock && <Badge tone="warning">Low Stock</Badge>}
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 text-center text-indigo-600 font-medium text-xs px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeletingProduct(p)}
                      className="flex-1 text-center text-red-600 font-medium text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Mobile Pagination */}
        {productPagination?.totalPages > 1 && (
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Page {productPagination.page} of {productPagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= productPagination.totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ──────────────── Add / Edit Product Modal ──────────────── */}
      <Modal
        open={isAddModalOpen || !!editingProduct}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        size="2xl"
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {formError && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Modal Tabs Navigation */}
          <div className="flex border-b border-gray-200 gap-2 overflow-x-auto pb-1">
            {[
              { id: 'basic', label: '📝 Basic Info' },
              { id: 'pricing', label: '💰 Pricing & Stock' },
              { id: 'media', label: `📸 Media (${formData.images.length} img${formData.video?.url ? ' + 🎬' : ''})` },
              { id: 'variants', label: `🎨 Variants (${formData.variants.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id)}
                className={`px-3 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  activeFormTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ────── TAB 1: BASIC INFO ────── */}
          {activeFormTab === 'basic' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Product Title */}
              <Input
                label="Product Title"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Wireless Bluetooth Noise-Cancelling Headphones"
              />

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your product, highlight specifications, warranty, and key features..."
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="isActiveToggle" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Publish and make visible to shoppers immediately
                </label>
              </div>
            </div>
          )}

          {/* ────── TAB 2: PRICING & STOCK ────── */}
          {activeFormTab === 'pricing' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Regular Price (৳)"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Input
                    label="Compare-at Price / MRP (৳)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.comparePrice}
                    onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                    placeholder="Optional original price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Base Stock Quantity"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                  />
                  {formData.hasVariants && (
                    <p className="text-xs text-gray-400 mt-1">
                      Note: You can also set specific inventory for each variant in the Variants tab.
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    label="Low Stock Alert Threshold"
                    type="number"
                    min="1"
                    value={formData.lowStockThreshold}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ────── TAB 3: MEDIA (IMAGES & VIDEO) ────── */}
          {activeFormTab === 'media' && (
            <div className="space-y-6 animate-in fade-in duration-100">
              {/* ── 1. Images Section ── */}
              <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Product Images</h3>
                    <p className="text-xs text-gray-500">
                      Upload photos from your computer or paste image links.
                    </p>
                  </div>
                  {/* Image Input Mode Toggle */}
                  <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg text-xs font-semibold self-start">
                    <button
                      type="button"
                      onClick={() => setImageInputMode('upload')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        imageInputMode === 'upload' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      📁 Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode('url')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        imageInputMode === 'url' ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      🔗 Paste URL
                    </button>
                  </div>
                </div>

                {imageInputMode === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      ref={imageFileInputRef}
                      onChange={handleImageFileUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <div
                      onClick={() => imageFileInputRef.current?.click()}
                      className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-xl p-6 text-center cursor-pointer transition-colors"
                    >
                      <div className="text-2xl mb-1">📸</div>
                      <p className="text-sm font-semibold text-indigo-600">
                        {uploadingImages ? 'Uploading images to Cloudinary...' : 'Click to select and upload images'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Supports JPG, PNG, WebP up to 10MB each. Multiple selection allowed.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Paste Image URL (e.g. https://images.unsplash.com/...)"
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                    <Button type="button" onClick={handleAddImageUrl} variant="secondary" size="sm">
                      Add URL
                    </Button>
                  </div>
                )}

                {/* Uploaded Images Gallery */}
                {formData.images.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                    {formData.images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative group rounded-xl overflow-hidden border-2 bg-white ${
                          img.isPrimary ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-gray-200'
                        }`}
                      >
                        <div className="aspect-square">
                          <img
                            src={img.url}
                            alt="Product preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/100x100?text=Err';
                            }}
                          />
                        </div>

                        {/* Primary Badge */}
                        {img.isPrimary && (
                          <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                            ★ Primary
                          </div>
                        )}

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                          {!img.isPrimary && (
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(idx)}
                              className="bg-white/90 hover:bg-white text-indigo-700 text-xs font-bold p-1 rounded shadow-xs"
                              title="Set as Primary cover photo"
                            >
                              ★ Set Primary
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold p-1 rounded shadow-xs"
                            title="Remove image"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No images added yet.</p>
                )}
              </div>

              {/* ── 2. Video Section ── */}
              <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <span>🎬</span> Product Video
                    </h3>
                    <p className="text-xs text-gray-500">
                      Upload a video demo (Cloudinary) or embed a YouTube / Vimeo link.
                    </p>
                  </div>
                  {/* Video Input Mode Toggle */}
                  <div className="flex items-center bg-purple-100 p-0.5 rounded-lg text-xs font-semibold self-start">
                    <button
                      type="button"
                      onClick={() => setVideoInputMode('upload')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        videoInputMode === 'upload' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      📁 Upload Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoInputMode('url')}
                      className={`px-3 py-1 rounded-md transition-colors ${
                        videoInputMode === 'url' ? 'bg-white text-purple-700 shadow-xs' : 'text-gray-600'
                      }`}
                    >
                      🔗 Video Link
                    </button>
                  </div>
                </div>

                {videoInputMode === 'upload' ? (
                  <div>
                    <input
                      type="file"
                      ref={videoFileInputRef}
                      onChange={handleVideoFileUpload}
                      accept="video/mp4,video/webm,video/quicktime"
                      className="hidden"
                    />
                    <div
                      onClick={() => videoFileInputRef.current?.click()}
                      className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white rounded-xl p-5 text-center cursor-pointer transition-colors"
                    >
                      <div className="text-2xl mb-1">📹</div>
                      <p className="text-sm font-semibold text-purple-700">
                        {uploadingVideo ? 'Uploading video to Cloudinary...' : 'Click to select and upload video'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Supports MP4, WebM, MOV up to 100MB.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="Paste YouTube, Vimeo, or MP4 URL (e.g. https://youtube.com/watch?v=...)"
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                    <Button type="button" onClick={handleAddVideoUrl} variant="secondary" size="sm">
                      Set Video
                    </Button>
                  </div>
                )}

                {/* Video Preview Player */}
                {formData.video?.url ? (
                  <div className="bg-black/90 rounded-xl overflow-hidden p-2 relative">
                    <div className="flex items-center justify-between text-white text-xs px-2 pb-2">
                      <span className="truncate max-w-[80%] font-mono text-[11px] text-gray-300">
                        {formData.video.url}
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="text-red-400 hover:text-red-300 font-bold"
                      >
                        ✕ Remove Video
                      </button>
                    </div>
                    {embedVideo ? (
                      <iframe
                        src={embedVideo}
                        title="Video Preview"
                        className="w-full h-48 rounded-lg"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={formData.video.url}
                        controls
                        className="w-full max-h-48 rounded-lg bg-black object-contain"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No video added.</p>
                )}
              </div>
            </div>
          )}

          {/* ────── TAB 4: VARIANTS (COLOR, SIZE, ETC.) ────── */}
          {activeFormTab === 'variants' && (
            <div className="space-y-5 animate-in fade-in duration-100">
              {/* Enable / Disable Variants Switch */}
              <div className="flex items-center justify-between bg-indigo-50/60 border border-indigo-100 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Product Variants</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Enable variations if this item comes in different colors, sizes, materials, or specifications.
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="hasVariantsToggle"
                  checked={formData.hasVariants}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      hasVariants: checked,
                      variants: checked && prev.variants.length === 0 ? [{ name: 'Color', options: [] }] : prev.variants,
                    }));
                  }}
                  className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
                />
              </div>

              {formData.hasVariants ? (
                <div className="space-y-4">
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-semibold text-gray-500">Quick Add:</span>
                    <button
                      type="button"
                      onClick={() => handleAddVariantGroup('Color')}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium"
                    >
                      + Color Option
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddVariantGroup('Size')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium"
                    >
                      + Clothing Size
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddVariantGroup('Shoe Size')}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium"
                    >
                      + Shoe Size
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddVariantGroup('Storage')}
                      className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium"
                    >
                      + Storage
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddVariantGroup(`Option ${formData.variants.length + 1}`)}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium"
                    >
                      + Custom Option
                    </button>
                  </div>

                  {/* Variant Groups List */}
                  {formData.variants.map((variant, groupIdx) => (
                    <div
                      key={groupIdx}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs space-y-3"
                    >
                      {/* Variant Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <label className="text-xs font-bold text-gray-700 uppercase">Option Name:</label>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setFormData((prev) => {
                                const nextV = [...prev.variants];
                                nextV[groupIdx] = { ...nextV[groupIdx], name: val };
                                return { ...prev, variants: nextV };
                              });
                            }}
                            className="text-sm font-semibold text-gray-900 border-b border-gray-300 focus:border-indigo-500 outline-none px-1 py-0.5 bg-transparent"
                            placeholder="e.g. Color or Size"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantGroup(groupIdx)}
                          className="text-xs text-red-600 hover:text-red-800 font-bold"
                        >
                          ✕ Remove Group
                        </button>
                      </div>

                      {/* Quick preset tags */}
                      {variant.name.toLowerCase().includes('color') && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-gray-400">Add preset:</span>
                          {COLOR_PRESETS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => handleAddOptionTag(groupIdx, color)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 border text-gray-600"
                            >
                              + {color}
                            </button>
                          ))}
                        </div>
                      )}

                      {variant.name.toLowerCase().includes('size') && !variant.name.toLowerCase().includes('shoe') && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-gray-400">Add preset:</span>
                          {SIZE_PRESETS.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleAddOptionTag(groupIdx, size)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-emerald-50 hover:text-emerald-600 border text-gray-600"
                            >
                              + {size}
                            </button>
                          ))}
                        </div>
                      )}

                      {variant.name.toLowerCase().includes('shoe') && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] text-gray-400">Add preset:</span>
                          {SHOE_SIZE_PRESETS.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => handleAddOptionTag(groupIdx, size)}
                              className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 border text-gray-600"
                            >
                              + {size}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Add Custom Tag Input */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newOptionValues[groupIdx] || ''}
                          onChange={(e) =>
                            setNewOptionValues((prev) => ({ ...prev, [groupIdx]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddOptionTag(groupIdx, newOptionValues[groupIdx]);
                            }
                          }}
                          placeholder={`Type option value (e.g. ${
                            variant.name.toLowerCase().includes('size') ? 'XL' : 'Midnight Blue'
                          }) and press Add`}
                          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAddOptionTag(groupIdx, newOptionValues[groupIdx])}
                        >
                          Add Value
                        </Button>
                      </div>

                      {/* Options Table for Custom Price, Stock & SKU */}
                      {variant.options.length > 0 ? (
                        <div className="overflow-x-auto pt-2">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                              <tr>
                                <th className="px-3 py-2">Option</th>
                                <th className="px-3 py-2">Specific Price (৳)</th>
                                <th className="px-3 py-2">Stock</th>
                                <th className="px-3 py-2">SKU (Optional)</th>
                                <th className="px-2 py-2 text-right">✕</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {variant.options.map((opt, optIdx) => (
                                <tr key={optIdx} className="hover:bg-gray-50">
                                  <td className="px-3 py-2 font-bold text-gray-900">{opt.value}</td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={opt.price}
                                      onChange={(e) =>
                                        handleUpdateOptionField(groupIdx, optIdx, 'price', e.target.value)
                                      }
                                      placeholder={`Base (৳${formData.price || 0})`}
                                      className="w-28 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={opt.stock}
                                      onChange={(e) =>
                                        handleUpdateOptionField(groupIdx, optIdx, 'stock', e.target.value)
                                      }
                                      className="w-20 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <input
                                      type="text"
                                      value={opt.sku || ''}
                                      onChange={(e) =>
                                        handleUpdateOptionField(groupIdx, optIdx, 'sku', e.target.value)
                                      }
                                      placeholder="SKU-XXX"
                                      className="w-24 rounded border border-gray-300 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="px-2 py-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOptionTag(groupIdx, optIdx)}
                                      className="text-red-500 hover:text-red-700 font-bold px-1"
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No option values added yet.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-gray-500 text-xs">
                  This product has no variations. Switch on the toggle above if you want to configure colors, sizes, etc.
                </div>
              )}
            </div>
          )}

          {/* Modal Bottom Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingProduct(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        title="Delete Product"
      >
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete{' '}
            <strong className="text-gray-900">"{deletingProduct?.name}"</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setDeletingProduct(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={actionLoading} onClick={handleDelete}>
              Delete Product
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Products;
