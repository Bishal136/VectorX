import React from 'react';
import { NavLink } from 'react-router-dom';

const SellerSidebar = ({ open, onClose }) => {
  const links = [
    { label: 'Dashboard', path: '/seller/dashboard', icon: '📊' },
    { label: 'Products', path: '/seller/products', icon: '📦' },
    { label: 'Orders', path: '/seller/orders', icon: '📋' },
    { label: 'Shop Profile', path: '/seller/shop', icon: '🏪' },
  ];

  return (
    <aside
      className={`
        fixed top-0 left-0 h-full z-30 w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:static lg:translate-x-0 lg:z-auto lg:h-auto
      `}
    >
      {/* Sidebar Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Merchant Hub
        </h2>
        {/* Close button — mobile only */}
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-md transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <span className="mr-3 text-base">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer Info in Sidebar */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-1">
        <p className="font-semibold text-slate-300">VectorX Hyperlocal</p>
        <p className="text-[11px] text-slate-400">
          Nearby ranking enabled via 2dsphere indexing.
        </p>
      </div>
    </aside>
  );
};

export default SellerSidebar;