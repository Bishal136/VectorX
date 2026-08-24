import React, { useEffect, useState } from 'react';
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
  isActive: true,
};

const Products = () => {
  const dispatch = useDispatch();
  const { products, productPagination, status, actionLoading, error } = useSelector(
    (state) => state.seller
  );

  // Filters & Search
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('all'); // all, active, inactive, low_stock, out_of_stock
  const [currentPage, setCurrentPage] = useState(1);

  // Categories list for dropdown
  const [categories, setCategories] = useState([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);

  // Form State
  const [formData, setFormData] = useState(initialFormData);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [formError, setFormError] = useState('');

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
    });
    setNewImageUrl('');
    setFormError('');
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
      images: product.images || [],
      isActive: product.isActive ?? true,
    });
    setNewImageUrl('');
    setFormError('');
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    try {
      new URL(newImageUrl.trim());
      setFormData((prev) => ({
        ...prev,
        images: [
          ...prev.images,
          {
            url: newImageUrl.trim(),
            publicId: `img_${Date.now()}`,
          },
        ],
      }));
      setNewImageUrl('');
    } catch {
      setFormError('Please enter a valid Image URL (http/https)');
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Product title is required');
      return;
    }
    if (!formData.price || Number(formData.price) < 0) {
      setFormError('Valid price is required');
      return;
    }
    if (!formData.category) {
      setFormError('Category is required');
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

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: Number(formData.price),
      category: formData.category,
      stock: Number(formData.stock) || 0,
      lowStockThreshold: Number(formData.lowStockThreshold) || 5,
      images: finalImages,
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

  // Filter products by stock status in frontend memory if applicable
  const filteredProducts = (products || []).filter((p) => {
    if (stockStatusFilter === 'active') return p.isActive;
    if (stockStatusFilter === 'inactive') return !p.isActive;
    if (stockStatusFilter === 'low_stock') return p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
    if (stockStatusFilter === 'out_of_stock') return p.stock === 0;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Product Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your store's inventory, pricing, and product visibility.
          </p>
        </div>
        <Button onClick={handleOpenAdd} variant="primary" size="md">
          <span className="mr-1.5 text-lg">+</span> Add New Product
        </Button>
      </div>

      {/* Global Error Banner if any */}
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
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
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
            className="text-sm rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
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
            className="text-sm rounded-lg border border-gray-300 px-3 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="low_stock">Low Stock (≤ threshold)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Stock</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {status === 'loading' && products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">
                    Loading your catalog...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-500">
                    No products found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLowStock = p.stock > 0 && p.stock <= (p.lowStockThreshold || 5);
                  const isOutOfStock = p.stock === 0;
                  const primaryImg = p.images?.[0]?.url || 'https://placehold.co/100x100?text=Product';

                  return (
                    <tr key={p._id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Product details */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={primaryImg}
                            alt={p.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-50"
                            onError={(e) => {
                              e.target.src = 'https://placehold.co/100x100?text=No+Image';
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-xs sm:max-w-sm">
                              {p.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              ID: {p._id?.slice(-8)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4 text-gray-600">
                        {p.category?.name || 'Uncategorized'}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {formatCurrency(p.price)}
                        </div>
                        {p.comparePrice && p.comparePrice > p.price && (
                          <div className="text-xs text-gray-400 line-through">
                            {formatCurrency(p.comparePrice)}
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{p.stock}</span>
                          {isOutOfStock && (
                            <Badge tone="danger">Out of Stock</Badge>
                          )}
                          {isLowStock && (
                            <Badge tone="warning">Low Stock</Badge>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(p)}
                          className="cursor-pointer focus:outline-none"
                          title="Click to toggle active status"
                        >
                          <Badge tone={p.isActive ? 'success' : 'neutral'}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium text-xs px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingProduct(p)}
                          className="text-red-600 hover:text-red-900 font-medium text-xs px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          Delete
                        </button>
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
            <span className="text-xs text-gray-500">
              Page {productPagination.page} of {productPagination.totalPages} (
              {productPagination.total} items)
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

      {/* Add / Edit Product Modal */}
      <Modal
        open={isAddModalOpen || !!editingProduct}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
        }}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md">
              {formError}
            </div>
          )}

          {/* Product Name */}
          <Input
            label="Product Title"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Premium Noise Cancelling Wireless Headphones"
          />

          {/* Category & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Input
                label="Price (৳)"
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Compare Price & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Input
                label="Compare At (৳)"
                type="number"
                step="0.01"
                min="0"
                value={formData.comparePrice}
                onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value })}
                placeholder="Optional strike price"
              />
            </div>
            <div>
              <Input
                label="Stock Quantity"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Input
                label="Low Stock Alert At"
                type="number"
                min="1"
                value={formData.lowStockThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, lowStockThreshold: e.target.value })
                }
                placeholder="5"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the product details, key specifications, and features..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Images Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Images
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Paste Image URL (e.g. https://...)"
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button type="button" onClick={handleAddImage} variant="secondary" size="sm">
                Add Image
              </Button>
            </div>

            {/* Thumbnail previews */}
            {formData.images.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-md overflow-hidden border">
                    <img
                      src={img.url}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target.src = 'https://placehold.co/80x80?text=Err')}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-red-600/70 text-white font-bold opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <label htmlFor="isActiveToggle" className="text-sm font-medium text-gray-700">
              Publish and make visible in store
            </label>
          </div>

          {/* Modal Actions */}
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
