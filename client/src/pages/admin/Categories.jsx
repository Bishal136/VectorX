import React, { useEffect, useState } from 'react';
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

  // Form state - simple category schema
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent: '',
    isActive: true,
  });

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      parent: '',
      isActive: true,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (cat) => {
    setIsEditing(true);
    setSelectedCategory(cat);
    setFormData({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      parent: cat.parent?._id || cat.parent || '',
      isActive: cat.isActive !== false,
    });
    setModalOpen(true);
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

    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() ? slugify(formData.slug) : slugify(formData.name),
      description: formData.description.trim() || undefined,
      parent: formData.parent ? formData.parent : null,
      isActive: formData.isActive,
    };

    setActionLoading(true);
    try {
      if (isEditing) {
        await dispatch(
          updateCategory({ categoryId: selectedCategory._id, categoryData: payload })
        ).unwrap();
        toast.success(`Category "${payload.name}" updated successfully!`);
      } else {
        await dispatch(createCategory(payload)).unwrap();
        toast.success(`Category "${payload.name}" created successfully!`);
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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Category Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, edit, organize category hierarchies, and manage product catalog taxonomy.
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleOpenAddModal}>
          <span className="mr-1.5">+</span> Add New Category
        </Button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search categories by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="text-sm text-gray-500 font-medium">
          Total: <span className="font-bold text-gray-900">{filteredCategories.length}</span> categories
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filteredCategories.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-xs">
                  <th className="py-3.5 px-4">Category Name</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Parent Level</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCategories.map((cat) => {
                  const parentId = cat.parent?._id || cat.parent;
                  const parentName = parentId ? categoryMap[parentId] || 'Parent' : null;

                  return (
                    <tr key={cat._id} className="hover:bg-gray-50/75 transition-colors">
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-semibold text-gray-900">{cat.name}</div>
                          {cat.description && (
                            <div className="text-xs text-gray-400 line-clamp-1 max-w-sm mt-0.5">
                              {cat.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-600">
                        /{cat.slug}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        {parentName ? (
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                            ↳ {parentName}
                          </span>
                        ) : (
                          <span className="text-gray-400 font-semibold">Root Level</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {cat.isActive !== false ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="neutral">Disabled</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEditModal(cat)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
          <div className="p-12 text-center text-gray-500 text-sm">
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
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
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
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Parent Category
            </label>
            <select
              value={formData.parent}
              onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
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

          <div className="flex justify-end gap-3 pt-3">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              type="submit"
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
            <div className="p-3 bg-red-50 text-red-800 rounded-lg text-sm border border-red-200">
              ⚠️ Are you sure you want to delete category <strong>{selectedCategory.name}</strong>?
            </div>

            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                id="forceDeleteCategory"
                checked={forceDelete}
                onChange={(e) => setForceDelete(e.target.checked)}
                className="rounded text-red-600 focus:ring-red-500 h-4 w-4 mt-0.5"
              />
              <label htmlFor="forceDeleteCategory" className="text-xs text-gray-700">
                <strong>Force delete:</strong> Delete subcategories if any exist under this category.
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setDeleteModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
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
