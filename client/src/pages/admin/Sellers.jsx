import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchSellers,
  fetchSellerDetails,
  verifySeller,
  suspendSeller,
} from '../../features/admin/adminSlice';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { toast } from 'react-toastify';

const statusToneMap = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

const Sellers = () => {
  const dispatch = useDispatch();
  const { sellers, status } = useSelector((state) => state.admin);

  const [activeTab, setActiveTab] = useState('all'); // all | pending | approved | rejected
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState('approved'); // approved | rejected
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationNote, setVerificationNote] = useState('');

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let verificationStatusParam = undefined;
    if (activeTab === 'pending') verificationStatusParam = 'pending';
    else if (activeTab === 'approved') verificationStatusParam = 'approved';
    else if (activeTab === 'rejected') verificationStatusParam = 'rejected';

    dispatch(
      fetchSellers({
        page: currentPage,
        limit: 15,
        verificationStatus: verificationStatusParam,
        search: search.trim() || undefined,
      })
    );
  }, [dispatch, activeTab, currentPage]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    let verificationStatusParam = undefined;
    if (activeTab === 'pending') verificationStatusParam = 'pending';
    else if (activeTab === 'approved') verificationStatusParam = 'approved';
    else if (activeTab === 'rejected') verificationStatusParam = 'rejected';

    dispatch(
      fetchSellers({
        page: 1,
        limit: 15,
        verificationStatus: verificationStatusParam,
        search: search.trim() || undefined,
      })
    );
  };

  const handleOpenViewDetails = async (seller) => {
    setSelectedSeller(seller);
    setViewDetailsOpen(true);
    try {
      const res = await dispatch(fetchSellerDetails(seller._id)).unwrap();
      if (res) setSelectedSeller(res);
    } catch {
      // Retain existing item
    }
  };

  const handleOpenVerifyModal = (seller, defaultAction = 'approved') => {
    setSelectedSeller(seller);
    setVerifyAction(defaultAction);
    setRejectionReason('');
    setVerificationNote('');
    setVerifyModalOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!selectedSeller) return;
    if (verifyAction === 'rejected' && !rejectionReason.trim()) {
      toast.error('Please enter a reason for rejecting the seller KYC.');
      return;
    }

    setActionLoading(true);
    try {
      await dispatch(
        verifySeller({
          sellerId: selectedSeller._id,
          status: verifyAction,
          note: verificationNote.trim() || undefined,
          rejectionReason: verifyAction === 'rejected' ? rejectionReason.trim() : undefined,
        })
      ).unwrap();
      toast.success(
        `Seller ${selectedSeller.shopName} has been ${
          verifyAction === 'approved' ? 'approved ✓' : 'rejected'
        }.`
      );
      setVerifyModalOpen(false);
    } catch (err) {
      toast.error(err || 'Failed to update seller verification');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenSuspendModal = (seller) => {
    setSelectedSeller(seller);
    setSuspendReason('');
    setSuspendModalOpen(true);
  };

  const handleConfirmSuspendToggle = async () => {
    if (!selectedSeller) return;
    setActionLoading(true);
    const willSuspend = !selectedSeller.isSuspended;
    try {
      await dispatch(
        suspendSeller({
          sellerId: selectedSeller._id,
          suspend: willSuspend,
          reason: suspendReason.trim() || undefined,
        })
      ).unwrap();
      toast.success(
        `Seller ${selectedSeller.shopName} has been ${
          willSuspend ? 'suspended' : 'unsuspended'
        }.`
      );
      setSuspendModalOpen(false);
    } catch (err) {
      toast.error(err || 'Failed to update seller suspension status');
    } finally {
      setActionLoading(false);
    }
  };

  const sellerList = sellers?.data || [];
  const pagination = sellers?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Seller & KYC Management
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Review store verification requests, manage merchant KYC, and monitor shop status.
          </p>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-xs font-medium self-start sm:self-auto">
          Total Stores:{' '}
          <span className="font-bold text-gray-900">
            {pagination.total || pagination.totalResults || sellerList.length}
          </span>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200 shadow-xs space-y-3 sm:space-y-4">
        {/* Scrollable Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 border-b border-gray-200">
          {[
            { id: 'all', label: 'All Sellers' },
            { id: 'pending', label: '⏳ Pending' },
            { id: 'approved', label: '✅ Approved' },
            { id: 'rejected', label: '❌ Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by shop name, seller name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="flex-1 sm:flex-none justify-center text-xs sm:text-sm"
            >
              Search
            </Button>
            {search && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="flex-1 sm:flex-none justify-center text-xs sm:text-sm"
                onClick={() => {
                  setSearch('');
                  setCurrentPage(1);
                  dispatch(fetchSellers({ page: 1, limit: 15 }));
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        {sellerList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200 text-[11px] sm:text-xs">
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Shop Details</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Owner Account</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Location (2dsphere)</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Tax IDs</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">KYC Status</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap">Suspension</th>
                  <th className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sellerList.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="font-bold text-gray-900 text-xs sm:text-sm">{s.shopName}</div>
                      <div className="text-[11px] text-gray-500">
                        {s.shopAddress?.city || 'No City'}, {s.shopAddress?.pincode || ''}
                      </div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 text-xs sm:text-sm">{s.user?.name || 'Seller'}</div>
                      <div className="text-[11px] text-gray-500">{s.user?.email || 'N/A'}</div>
                      {s.user?.phone && (
                        <div className="text-[10px] text-gray-400">{s.user.phone}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {s.location?.coordinates ? (
                        <div className="font-mono text-[11px] text-gray-700 bg-gray-50 px-2 py-0.5 rounded inline-block border border-gray-200">
                          [{s.location.coordinates[0]?.toFixed(3)}, {s.location.coordinates[1]?.toFixed(3)}]
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">Not set</span>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-[11px] whitespace-nowrap">
                      <div>GST: <span className="font-mono text-gray-700">{s.gstNumber || 'N/A'}</span></div>
                      <div>PAN: <span className="font-mono text-gray-700">{s.panNumber || 'N/A'}</span></div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <Badge tone={statusToneMap[s.verificationStatus] || 'neutral'}>
                        {s.verificationStatus?.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {s.isSuspended ? (
                        <Badge tone="danger">🚫 Suspended</Badge>
                      ) : (
                        <Badge tone="success">Active</Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs px-2 sm:px-2.5 py-1"
                          onClick={() => handleOpenViewDetails(s)}
                        >
                          Details
                        </Button>
                        {s.verificationStatus === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 sm:px-2.5 py-1"
                              onClick={() => handleOpenVerifyModal(s, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="text-xs px-2 sm:px-2.5 py-1"
                              onClick={() => handleOpenVerifyModal(s, 'rejected')}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {s.verificationStatus === 'approved' && (
                          <Button
                            variant={s.isSuspended ? 'secondary' : 'ghost'}
                            size="sm"
                            className={`text-xs px-2 sm:px-2.5 py-1 ${
                              !s.isSuspended ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : ''
                            }`}
                            onClick={() => handleOpenSuspendModal(s)}
                          >
                            {s.isSuspended ? 'Unsuspend' : 'Suspend'}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 sm:p-12 text-center text-gray-500 text-xs sm:text-sm">
            {status === 'loading' ? 'Loading sellers...' : 'No sellers found.'}
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

      {/* View Full Seller Details Modal */}
      <Modal
        open={viewDetailsOpen}
        onClose={() => setViewDetailsOpen(false)}
        title="Seller & Shop Profile"
      >
        {selectedSeller && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200">
              <div>
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">{selectedSeller.shopName}</h3>
                <p className="text-xs text-gray-500">
                  Registered by {selectedSeller.user?.name} ({selectedSeller.user?.email})
                </p>
              </div>
              <Badge tone={statusToneMap[selectedSeller.verificationStatus] || 'neutral'}>
                {selectedSeller.verificationStatus?.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">GST Number</span>
                <span className="font-mono text-gray-800">{selectedSeller.gstNumber || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">PAN Number</span>
                <span className="font-mono text-gray-800">{selectedSeller.panNumber || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">Shop Address</span>
                <span className="text-gray-800">
                  {selectedSeller.shopAddress?.line1}, {selectedSeller.shopAddress?.city}, {selectedSeller.shopAddress?.pincode}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-gray-500 block">Coordinates (Lng, Lat)</span>
                <span className="font-mono text-[11px] text-gray-800">
                  {selectedSeller.location?.coordinates
                    ? `${selectedSeller.location.coordinates[0]}, ${selectedSeller.location.coordinates[1]}`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Bank Details */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
              <h4 className="text-[11px] sm:text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Bank Payout Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] sm:text-xs">Account Name</span>
                  <span className="font-semibold text-gray-800">
                    {selectedSeller.bankDetails?.accountHolderName || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] sm:text-xs">Account Number</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {selectedSeller.bankDetails?.accountNumber || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] sm:text-xs">IFSC / Code</span>
                  <span className="font-mono font-semibold text-gray-800">
                    {selectedSeller.bankDetails?.ifsc || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {selectedSeller.rejectionReason && (
              <div className="p-3 bg-red-50 text-red-800 rounded-lg text-xs border border-red-200">
                <strong>Rejection Reason:</strong> {selectedSeller.rejectionReason}
              </div>
            )}

            <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setViewDetailsOpen(false)}
              >
                Close
              </Button>
              {selectedSeller.verificationStatus === 'pending' && (
                <Button
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                  onClick={() => {
                    setViewDetailsOpen(false);
                    handleOpenVerifyModal(selectedSeller, 'approved');
                  }}
                >
                  Verify Application
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Verify / KYC Modal */}
      <Modal
        open={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        title={verifyAction === 'approved' ? 'Approve Seller Application' : 'Reject Seller Application'}
      >
        {selectedSeller && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-600">
              {verifyAction === 'approved'
                ? `Approving ${selectedSeller.shopName} will activate their store and allow their products to appear in nearby buyer searches.`
                : `Rejecting ${selectedSeller.shopName} will require you to provide a specific rejection reason for the merchant.`}
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setVerifyAction('approved')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  verifyAction === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ✓ Approve Store
              </button>
              <button
                type="button"
                onClick={() => setVerifyAction('rejected')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors ${
                  verifyAction === 'rejected'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ✕ Reject Application
              </button>
            </div>

            {verifyAction === 'rejected' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for rejection <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Invalid GST document, mismatched address coordinates, incomplete business registration..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-xs sm:text-sm focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Admin Note (optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Verified via official tax portal"
                value={verificationNote}
                onChange={(e) => setVerificationNote(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setVerifyModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={verifyAction === 'approved' ? 'primary' : 'danger'}
                size="md"
                className={`w-full sm:w-auto justify-center text-xs sm:text-sm ${
                  verifyAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                }`}
                loading={actionLoading}
                onClick={handleConfirmVerification}
              >
                {verifyAction === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Suspend / Unsuspend Modal */}
      <Modal
        open={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        title={selectedSeller?.isSuspended ? 'Unsuspend Seller Store' : 'Suspend Seller Store'}
      >
        {selectedSeller && (
          <div className="space-y-4">
            <p className="text-xs sm:text-sm text-gray-600">
              {selectedSeller.isSuspended
                ? `Are you sure you want to unsuspend ${selectedSeller.shopName}? Their products will return to active listings.`
                : `Are you sure you want to suspend ${selectedSeller.shopName}? Their store and products will be temporarily hidden from buyers.`}
            </p>

            {!selectedSeller.isSuspended && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for suspension (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Policy violations, excessive return disputes..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2 text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                onClick={() => setSuspendModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={selectedSeller.isSuspended ? 'primary' : 'danger'}
                size="md"
                className="w-full sm:w-auto justify-center text-xs sm:text-sm"
                loading={actionLoading}
                onClick={handleConfirmSuspendToggle}
              >
                {selectedSeller.isSuspended ? 'Confirm Unsuspend' : 'Confirm Suspend'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Sellers;

