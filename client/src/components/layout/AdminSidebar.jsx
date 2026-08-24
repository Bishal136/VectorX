import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Store,
  FolderTree,
  ClipboardList,
  Settings,
  X,
  ShieldAlert,
} from 'lucide-react';
import Logo from '../common/Logo';

const AdminSidebar = ({ isOpen, onClose }) => {
  const links = [
    { label: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Seller & KYC', path: '/admin/sellers', icon: Store },
    { label: 'Categories', path: '/admin/categories', icon: FolderTree },
    { label: 'Orders Oversight', path: '/admin/orders', icon: ClipboardList },
    { label: 'Platform Settings', path: '/admin/settings', icon: Settings },
  ];

  const renderNavLinks = (isMobile = false) => (
    <nav className="space-y-1 px-3">
      {links.map((link) => {
        const IconComponent = link.icon;
        return (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={() => {
              if (isMobile && onClose) {
                onClose();
              }
            }}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <IconComponent className="w-4 h-4 shrink-0" />
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Out Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
      >
        <div className="flex flex-col h-full">
          {/* Mobile Drawer Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                Admin
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="py-4 flex-1 overflow-y-auto">
            <div className="px-4 pb-2 mb-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
                Platform Navigation
              </span>
            </div>
            {renderNavLinks(true)}
          </div>

          <div className="p-4 border-t border-gray-100 text-[11px] text-gray-400 text-center bg-gray-50/50">
            VectorX Admin Control v1.1
          </div>
        </div>
      </aside>

      {/* Desktop Fixed/Docked Sidebar */}
      <aside className="w-60 lg:w-64 bg-white border-r border-gray-200 h-full shrink-0 hidden lg:flex flex-col justify-between overflow-y-auto">
        <div className="py-4">
          <div className="px-4 pb-3 mb-2 border-b border-gray-100">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">
              Navigation Menu
            </span>
          </div>
          {renderNavLinks(false)}
        </div>

        <div className="p-4 border-t border-gray-100 text-[11px] text-gray-400 text-center">
          VectorX Admin Control v1.1
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;