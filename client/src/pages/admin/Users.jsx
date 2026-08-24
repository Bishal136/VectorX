import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchUsers,
  fetchUserDetails,
  blockUser,
  deleteUser,
} from '../../features/admin/adminSlice';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';

const roleToneMap = {
  admin: 'danger',
  seller: 'info',
  user: 'neutral',
};

const Users = () => {
  const dispatch = useDispatch();
  const { users, status } = useSelector((state) => state.admin);

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [isVerified, setIsVerified] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(
      fetchUsers({
        page: currentPage,
        limit: 15,
        search: search.trim() || undefined,
        role: role || undefined,
        isVerified: isVerified !== '' ? isVerified : undefined,
      })
    );
  }, [dispatch, currentPage, role, isVerified]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    dispatch(
      fetchUsers({
        page: 1,
        limit: 15,
        search: search.trim() || undefined,
        role: role || undefined,
        isVerified: isVerified !== '' ? isVerified : undefined,
      })
    );
  };

  const handleOpenViewDetails = async (user) => {
    setSelectedUser(user);
    setViewDetailsOpen(true);
    try {
      const res = await dispatch(fetchUserDetails(user._id)).unwrap();
      if (res) setSelectedUser(res);
    } catch {
      // Keep basic user data if detail fetch fails
    }
  };

  const handleOpenBlockModal = (user) => {
    setSelectedUser(user);
    setBlockReason('');
    setBlockModalOpen(true);
  };

  const handleConfirmBlockToggle = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    const willBlock = !selectedUser.isBlocked;
    try {
      await dispatch(
        blockUser({
          userId: selectedUser._id,
          block: willBlock,
          reason: blockReason.trim() || undefined,
        })
      ).unwrap();
      toast.success(
        `User ${selectedUser.name} has been ${willBlock ? 'blocked' : 'unblocked'}.`
      );
      setBlockModalOpen(false);
    } catch (err) {
      toast.error(err || 'Failed to update user block status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDeleteModal = (user) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await dispatch(deleteUser(selectedUser._id)).unwrap();
      toast.success(`User ${selectedUser.name} deleted successfully.`);
      setDeleteModalOpen(false);
    } catch (err) {
      toast.error(err || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const pagination = users?.pagination || { page: 1, totalPages: 1, total: 0 };
  const userList = users?.data || [];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            User Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View, search, block, and manage registered platform accounts.
          </p>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs font-medium self-start sm:self-auto">
          Total Users:{' '}
          <span className="font-bold text-gray-900">
            {pagination.total || pagination.totalResults || userList.length}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-2.5 sm:gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Roles</option>
              <option value="user">Buyer (User)</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={isVerified}
              onChange={(e) => {
                setIsVerified(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto rounded-lg border border-gray-300 px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Verification</option>
              <option value="true">Verified (Email)</option>
              <option value="false">Unverified</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto justify-center text-xs sm:text-sm"
            >
              Search
            </Button>
            {(search || role || isVerified !== '') && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => {
                  setSearch('');
                  setRole('');
                  setIsVerified('');
                  setCurrentPage(1);
                  dispatch(fetchUsers({ page: 1, limit: 15 }));
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {userList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-[11px] sm:text-xs">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">User</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Contact</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Role</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Email Status</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Account Status</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Joined Date</th>
                  <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {userList.map((u) => (
                  <tr key={u._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs sm:text-sm shrink-0">
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-xs sm:text-sm">{u.name}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500 font-mono">
                            ID: {u._id.substring(u._id.length - 6)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="text-gray-900 text-xs sm:text-sm">{u.email}</div>
                      <div className="text-[11px] text-gray-500">{u.phone || 'No phone'}</div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <Badge tone={roleToneMap[u.role] || 'neutral'}>
                        {u.role ? u.role.toUpperCase() : 'USER'}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {u.isVerified ? (
                        <Badge tone="success">Verified ✓</Badge>
                      ) : (
                        <Badge tone="warning">Unverified</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {u.isBlocked ? (
                        <Badge tone="danger">🚫 Blocked</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-xs text-gray-500 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs px-2 sm:px-2.5 py-1"
                          onClick={() => handleOpenViewDetails(u)}
                        >
                          View
                        </Button>
                        <Button
                          variant={u.isBlocked ? 'secondary' : 'danger'}
                          size="sm"
                          className="text-xs px-2 sm:px-2.5 py-1"
                          onClick={() => handleOpenBlockModal(u)}
                        >
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-1.5 py-1"
                          onClick={() => handleOpenDeleteModal(u)}
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center text-gray-500 text-xs sm:text-sm">
            {status === 'loading' ? 'Loading users...' : 'No users found matching your criteria.'}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
            <div className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                disabled={pagination.page <= 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              >
                ← Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pagination.totalPages))}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* View User Details Modal */}
      <Modal
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        title="User Account Details"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-base sm:text-lg shrink-0">
                {selectedUser.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{selectedUser.name}</h3>
                <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">User Role</span>
                <span className="font-semibold text-gray-800 capitalize">{selectedUser.role}</span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">Phone</span>
                <span className="font-semibold text-gray-800">{selectedUser.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">Email Verified</span>
                <span className="font-semibold text-gray-800">
                  {selectedUser.isVerified ? 'Yes ✓' : 'No'}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">Account Status</span>
                <span className="font-semibold text-gray-800">
                  {selectedUser.isBlocked ? '🚫 Blocked' : 'Active'}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">Joined</span>
                <span className="font-semibold text-gray-800">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">Saved Addresses</span>
                <span className="font-semibold text-gray-800">
                  {selectedUser.addresses?.length || 0}
                </span>
              </div>
            </div>

            {selectedUser.addresses && selectedUser.addresses.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-[11px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Saved Delivery Addresses
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedUser.addresses.map((addr, i) => (
                    <div key={i} className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-700 border border-gray-200">
                      <div className="font-semibold text-gray-900">
                        {addr.label || `Address ${i + 1}`} {addr.isDefault && ' (Default)'}
                      </div>
                      <div>{addr.street || addr.line1}, {addr.city}, {addr.state} {addr.pincode}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setViewDetailsOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Block / Unblock Modal */}
      <Modal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title={selectedUser?.isBlocked ? 'Unblock User Account' : 'Block User Account'}
      >
        {selectedUser && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-600">
              {selectedUser.isBlocked
                ? `Are you sure you want to unblock ${selectedUser.name}? They will regain full access to their account.`
                : `Are you sure you want to block ${selectedUser.name}? They will immediately lose access to their account and active sessions.`}
            </p>

            {!selectedUser.isBlocked && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason for blocking (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Violation of terms, fraudulent activity..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setBlockModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={selectedUser.isBlocked ? 'primary' : 'danger'}
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                loading={actionLoading}
                onClick={handleConfirmBlockToggle}
              >
                {selectedUser.isBlocked ? 'Confirm Unblock' : 'Confirm Block'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete User Account"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs sm:text-sm border border-red-200">
              ⚠️ <strong>Warning:</strong> Deleting user <strong>{selectedUser.name}</strong> is permanent and will remove their profile and associated credentials.
            </div>

            <p className="text-xs sm:text-sm text-gray-600">
              Please confirm if you want to permanently delete this user.
            </p>

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
                Permanently Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Users;

