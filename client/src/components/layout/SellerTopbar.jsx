import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import Logo from '../common/Logo';
import Badge from '../common/Badge';

const SellerTopbar = () => {
  const { user } = useAuth();
  const { profile } = useSelector((state) => state.seller);

  const getVerificationBadge = () => {
    if (!profile) return null;
    if (profile.verificationStatus === 'approved') {
      return <Badge tone="success">Verified Seller</Badge>;
    }
    if (profile.verificationStatus === 'rejected') {
      return <Badge tone="danger">Verification Rejected</Badge>;
    }
    return <Badge tone="warning">Pending Review</Badge>;
  };

  return (
    <header className="bg-white border-b border-gray-200 py-3 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3 sm:gap-4">
        <Link to="/seller/dashboard" className="flex items-center">
          <Logo className="scale-90 sm:scale-100 origin-left" />
        </Link>
        <span className="hidden sm:inline-block text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
          Seller Portal
        </span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Verification Status */}
        <div className="hidden sm:block">
          {getVerificationBadge()}
        </div>

        {/* Shop Info / User info */}
        <div className="text-right">
          <p className="text-xs sm:text-sm font-semibold text-gray-900 leading-tight truncate max-w-[140px] sm:max-w-[200px]">
            {profile?.shopName || user?.name || 'Seller'}
          </p>
          <span className="text-[11px] text-gray-500 hidden sm:inline-block">
            {user?.email}
          </span>
        </div>

        <Link
          to="/"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors"
        >
          Storefront →
        </Link>
      </div>
    </header>
  );
};

export default SellerTopbar;