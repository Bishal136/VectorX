import React, { useEffect, useState, useCallback } from 'react';
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
import { RefreshCw, Search, User, ShieldCheck, ShieldAlert, Ban, Trash2, CheckCircle2, XCircle } from 'lucide-react';

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
  const [isBlocked, setIsBlocked] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadUsers = useCallback(
    (page = currentPage) => {
      dispatch(
        fetchUsers({
          page,
          limit: 15,
          search: search.trim() || undefined,
          role: role || undefined,
          isVerified: isVerified !== '' ? isVerified : undefined,
          isBlocked: isBlocked !== '' ? isBlocked : undefined,
        })
      );
    },
    [dispatch, currentPage, search, role, isVerified, isBlocked]
  );

  useEffect(() => {
    loadUsers(currentPage);
  }, [loadUsers, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers(1);
  };

  const handleClearFilters = () => {
    setSearch('');
    setRole('');
    setIsVerified('');
    setIsBlocked('');
    setCurrentPage(1);
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
      loadUsers(currentPage);
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
      loadUsers(currentPage);
    } catch (err) {
      toast.error(err || 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const pagination = users?.pagination || { page: 1, totalPages: 1, total: 0 };
  const userList = users?.data || [];
  const hasActiveFilters = Boolean(search || role || isVerified !== '' || isBlocked !== '');

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-100">
              Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            View, search, filter verification status, block, and manage registered platform accounts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadUsers(currentPage)}
            className="text-xs flex items-center gap-1.5"
            title="Refresh user list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </Button>

          <div className="text-xs sm:text-sm text-gray-600 bg-gray-50 px-3.5 py-1.5 rounded-lg border border-gray-200 font-medium">
            Total Users:{' '}
            <span className="font-bold text-indigo-600">
              {pagination.total || pagination.totalResults || userList.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 bg-gray-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {/* Role Filter */}
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">All Roles</option>
              <option value="user">Buyer (User)</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>

            {/* Email Verification Filter */}
            <select
              value={isVerified}
              onChange={(e) => {
                setIsVerified(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">All Verification</option>
              <option value="true">Verified (Email)</option>
              <option value="false">Unverified</option>
            </select>

            {/* Account Status Filter */}
            <select
              value={isBlocked}
              onChange={(e) => {
                setIsBlocked(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-auto rounded-xl border border-gray-300 px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            >
              <option value="">All Account Statuses</option>
              <option value="false">Active Accounts</option>
              <option value="true">Blocked Accounts</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto justify-center text-xs sm:text-sm px-4"
            >
              Search
            </Button>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                onClick={handleClearFilters}
              >
                Clear All
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {status === 'loading' && userList.length === 0 ? (
          <div className="p-12 text-center text-gray-500 space-y-3">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs sm:text-sm font-medium">Fetching platform users...</p>
          </div>
        ) : userList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-200 text-[11px] sm:text-xs">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">User</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Contact</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Role</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Email Status</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Account Status</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Joined Date</th>
                  <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {userList.map((u) => (
                  <tr key={u._id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs sm:text-sm shrink-0">
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-xs sm:text-sm">{u.name}</div>
                          <div className="text-[10px] sm:text-xs text-gray-500 font-mono">
                            ID: #{u._id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <div className="text-gray-900 text-xs sm:text-sm">{u.email}</div>
                      <div className="text-[11px] text-gray-500">{u.phone || 'No phone'}</div>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      <Badge tone={roleToneMap[u.role] || 'neutral'}>
                        {u.role ? u.role.toUpperCase() : 'USER'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      {u.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <XCircle className="w-3 h-3 text-amber-600" /> Unverified
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                      {u.isBlocked ? (
                        <Badge tone="danger">🚫 Blocked</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-xs text-gray-500 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-3.5 px-3 sm:px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          onClick={() => handleOpenViewDetails(u)}
                        >
                          View
                        </Button>
                        <Button
                          variant={u.isBlocked ? 'secondary' : 'danger'}
                          size="sm"
                          className="text-xs px-2.5 py-1"
                          onClick={() => handleOpenBlockModal(u)}
                        >
                          {u.isBlocked ? 'Unblock' : 'Block'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1"
                          onClick={() => handleOpenDeleteModal(u)}
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 sm:p-14 text-center text-gray-500 text-xs sm:text-sm space-y-3">
            <User className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-700">No users found matching your selected filters.</p>
            {hasActiveFilters && (
              <div>
                <Button variant="secondary" size="sm" onClick={handleClearFilters} className="text-xs">
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3.5 sm:p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/60">
            <div className="text-xs text-gray-600 font-medium">
              Showing page <strong className="text-gray-900">{pagination.page}</strong> of{' '}
              <strong className="text-gray-900">{pagination.totalPages}</strong> (Total{' '}
              {pagination.total || pagination.totalResults || userList.length} users)
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

