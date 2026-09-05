import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../../features/admin/adminSlice';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';
import { UploadCloud, Image as ImageIcon, Link as LinkIcon, X, CheckCircle2 } from 'lucide-react';

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

const Categories = () => {
  const dispatch = useDispatch();
  const { categories, status } = useSelector((state) => state.admin);

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Category image upload state
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Form state - simple category schema
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parent: '',
    isActive: true,
  });

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedCategory(null);
    setImageMode('upload');
    setSelectedFile(null);
    setFilePreview('');
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: '',
      parent: '',
      isActive: true,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setIsEditing(true);
    setSelectedCategory(cat);
    const existingUrl = cat.image?.url || (typeof cat.image === 'string' ? cat.image : '') || '';
    setImageMode('upload');
    setSelectedFile(null);
    setFilePreview(existingUrl);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      image: existingUrl,
      parent: cat.parent?._id || cat.parent || '',
      isActive: cat.isActive !== false,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setModalOpen(true);
  };

  const processSelectedFile = (file) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WEBP, GIF, SVG)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }
    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setFilePreview('');
    setFormData((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: val,
      slug: !isEditing ? slugify(val) : prev.slug,
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    let payload;
    if (imageMode === 'upload' && selectedFile) {
      // Admin uploaded a file -> Send FormData. No URL needed!
      payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('slug', formData.slug.trim() ? slugify(formData.slug) : slugify(formData.name));
      if (formData.description.trim()) {
        payload.append('description', formData.description.trim());
      }
      if (formData.parent) {
        payload.append('parent', formData.parent);
      }
      payload.append('isActive', formData.isActive);
      payload.append('image', selectedFile);
    } else {
      // JSON payload
      payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() ? slugify(formData.slug) : slugify(formData.name),
        description: formData.description.trim() || undefined,
        parent: formData.parent ? formData.parent : null,
        isActive: formData.isActive,
      };

      if (imageMode === 'upload') {
        if (filePreview && !selectedFile) {
          // Keep existing image during edit
          payload.image = formData.image?.trim() ? { url: formData.image.trim() } : undefined;
        } else if (!filePreview) {
          // Cleared image
          payload.image = { url: '', publicId: '' };
        }
      } else {
        // Image URL mode
        payload.image = formData.image?.trim() ? { url: formData.image.trim() } : { url: '' };
      }
    }

    setActionLoading(true);
    try {
      if (isEditing) {
        await dispatch(
          updateCategory({ categoryId: selectedCategory._id, categoryData: payload })
        ).unwrap();
        toast.success(`Category "${formData.name.trim()}" updated successfully!`);
      } else {
        await dispatch(createCategory(payload)).unwrap();
        toast.success(`Category "${formData.name.trim()}" created successfully!`);
      }
      setModalOpen(false);
      dispatch(fetchCategories());
    } catch (err) {
      toast.error(err || 'Failed to save category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteModal = (cat) => {
    setSelectedCategory(cat);
    setForceDelete(false);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    setActionLoading(true);
    try {
      await dispatch(
        deleteCategory({ categoryId: selectedCategory._id, force: forceDelete })
      ).unwrap();
      toast.success(`Category "${selectedCategory.name}" deleted successfully.`);
      setDeleteModalOpen(false);
      dispatch(fetchCategories());
    } catch (err) {
      toast.error(err || 'Failed to delete category');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredCategories = (categories || []).filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.slug?.toLowerCase().includes(search.toLowerCase())
  );

  // Map category IDs to names for parent display
  const categoryMap = (categories || []).reduce((acc, cat) => {
    acc[cat._id] = cat.name;
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Category Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Create, edit, organize category hierarchies, and manage product catalog taxonomy.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          className="w-full sm:w-auto justify-center text-xs sm:text-sm"
          onClick={handleOpenAddModal}
        >
          <span className="mr-1.5 font-bold">+</span> Add New Category
        </Button>
      </div>

      {/* Search Bar & Stats */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md w-full">
          <input
            type="text"
            placeholder="Search categories by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="text-xs sm:text-sm text-gray-500 font-medium">
          Total: <span className="font-bold text-gray-900">{filteredCategories.length}</span> categories
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {filteredCategories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-[11px] sm:text-xs">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Image</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Category Name</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Slug</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Parent Level</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCategories.map((cat) => {
                  const parentId = cat.parent?._id || cat.parent;
                  const parentName = parentId ? categoryMap[parentId] || 'Parent' : null;
                  const catImageUrl = cat.image?.url || (typeof cat.image === 'string' ? cat.image : '');

                  return (
                    <tr key={cat._id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4 whitespace-nowrap">
                        {catImageUrl ? (
                          <img
                            src={catImageUrl}
                            alt={cat.name}
                            className="w-10 h-10 object-contain rounded-lg border border-gray-200 bg-gray-50 p-0.5"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium px-2 py-1 rounded bg-gray-100 border border-gray-200 inline-block">
                            No image
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        <div>
                          <div className="font-semibold text-gray-900 text-xs sm:text-sm">{cat.name}</div>
                          {cat.description && (
                            <div className="text-[11px] text-gray-400 line-clamp-1 max-w-xs mt-0.5">
                              {cat.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 sm:px-4 font-mono text-xs text-gray-600 whitespace-nowrap">
                        /{cat.slug}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-xs whitespace-nowrap">
                        {parentName ? (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium text-[11px]">
                            ↳ {parentName}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-semibold text-[11px]">Root Level</span>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                        {cat.isActive !== false ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="neutral">Disabled</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="text-xs px-2 sm:px-2.5 py-1"
                            onClick={() => handleOpenEditModal(cat)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-1.5 py-1"
                            onClick={() => handleOpenDeleteModal(cat)}
                          >
                            🗑️
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center text-gray-500 text-xs sm:text-sm">
            {status === 'loading' ? 'Loading categories...' : 'No categories found.'}
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={isEditing ? 'Edit Category' : 'Create New Category'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Electronics"
              value={formData.name}
              onChange={handleNameChange}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              URL Slug
            </label>
            <input
              type="text"
              placeholder="e.g. electronics"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Electronic products and gadgets"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Category Image Selector (Upload File or URL) */}
          <div className="space-y-2.5 p-3.5 bg-gray-50/80 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                Category Image
              </label>
              <div className="flex bg-gray-200/70 p-0.5 rounded-lg text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                    imageMode === 'upload'
                      ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <UploadCloud className="w-3 h-3" />
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer ${
                    imageMode === 'url'
                      ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LinkIcon className="w-3 h-3" />
                  Image URL
                </button>
              </div>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />

            {imageMode === 'upload' ? (
              <div>
                {filePreview ? (
                  /* Preview Card when file/image is present */
                  <div className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-14 h-14 shrink-0 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden p-0.5">
                        <img
                          src={filePreview}
                          alt="Category Preview"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=100';
                          }}
                        />
                      </div>
                      <div className="min-w-0">
                        {selectedFile ? (
                          <>
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {(selectedFile.size / 1024).toFixed(1)} KB • Image selected
                            </p>
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium mt-1">
                              <CheckCircle2 className="w-2.5 h-2.5" /> No URL needed
                            </span>
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-gray-900">
                              Current Category Image
                            </p>
                            <p className="text-[11px] text-gray-500">
                              Stored category image
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium px-2.5 py-1.5 rounded-lg border border-indigo-200 transition cursor-pointer"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg border border-red-200 transition cursor-pointer"
                        title="Remove image"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dropzone when no image is selected */
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 ${
                      isDragging
                        ? 'border-indigo-500 bg-indigo-50/50'
                        : 'border-gray-300 hover:border-indigo-400 bg-white hover:bg-gray-50/60'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-semibold text-gray-800">
                      Click to browse or drag & drop category image
                    </div>
                    <p className="text-[11px] text-gray-500">
                      PNG, JPG, WEBP, GIF, SVG up to 10MB • <strong className="text-indigo-600">No URL needed</strong>
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Image URL Mode */
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="https://example.com/category-image.png"
                  value={formData.image}
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value });
                    setFilePreview(e.target.value);
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                {formData.image?.trim() && (
                  <div className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200">
                    <img
                      src={formData.image.trim()}
                      alt="Category Preview"
                      className="w-10 h-10 object-contain rounded bg-gray-50 border border-gray-200 p-0.5"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="text-[11px] text-gray-500">Live preview from entered URL</span>
                  </div>
                )}
                <p className="text-[11px] text-gray-400">
                  Direct link to an externally hosted image.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              value={formData.parent}
              onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">None (Top-Level / null)</option>
              {(categories || [])
                .filter((c) => !isEditing || c._id !== selectedCategory?._id)
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCategory"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
            />
            <label htmlFor="isActiveCategory" className="text-xs font-medium text-gray-800 cursor-pointer">
              Active Category (isActive: true)
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
            <Button
              variant="secondary"
              size="md"
              type="button"
              className="w-full sm:w-auto justify-center text-xs sm:text-sm"
              onClick={() => setModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
              className="w-full sm:w-auto justify-center text-xs sm:text-sm"
              loading={actionLoading}
            >
              {isEditing ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Category Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Category"
      >
        {selectedCategory && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs sm:text-sm border border-red-200">
              ⚠️ Are you sure you want to delete category <strong>{selectedCategory.name}</strong>?
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="forceDeleteCategory"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-4 w-4 mt-0.5 cursor-pointer"
              />
              <label htmlFor="forceDeleteCategory" className="text-xs text-gray-700 cursor-pointer">
                <strong>Force delete:</strong> Delete subcategories if any exist under this category.
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                loading={actionLoading}
                onClick={handleConfirmDelete}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Categories;

