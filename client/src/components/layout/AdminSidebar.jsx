import React from 'react';
import { NavLink } from 'react-router-dom';

const AdminSidebar = () => {
  const links = [
    { label: 'Overview', path: '/admin/dashboard', icon: '📊' },
    { label: 'User Management', path: '/admin/users', icon: '👥' },
    { label: 'Seller & KYC', path: '/admin/sellers', icon: '🏪' },
    { label: 'Categories', path: '/admin/categories', icon: '📂' },
    { label: 'Orders Oversight', path: '/admin/orders', icon: '📋' },
    { label: 'Platform Settings', path: '/admin/settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-60 bg-white border-r border-gray-200 h-full shrink-0 flex flex-col justify-between overflow-y-auto">
      <div className="py-4">
        <div className="px-4 pb-3 mb-2 border-b border-gray-100">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
            Navigation Menu
          </span>
        </div>
        <nav className="space-y-1 px-3">
          {links.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{link.icon}</span>
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-100 text-[11px] text-gray-400 text-center">
        VectorX Admin Control v1.1
      </div>
    </aside>
  );
};

export default AdminSidebar;