import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Store, LogOut, Shield } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Logo from '../common/Logo';
import Button from '../common/Button';

const AdminTopbar = ({ sidebarOpen, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 py-2.5 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
          aria-label={sidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-gray-700" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700" />
          )}
        </button>

        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <Logo isAdmin={true} />
        </Link>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          Admin
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 text-sm">
        <Link
          to="/"
          className="text-gray-600 hover:text-indigo-600 font-medium text-xs sm:text-sm hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Store className="w-4 h-4 text-gray-500" />
          <span>View Storefront</span>
        </Link>

        <div className="h-4 w-px bg-gray-200 hidden md:block" />

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-xs font-bold text-gray-900 truncate max-w-[120px] lg:max-w-[180px]">
              {user?.name || 'Admin'}
            </div>
            <div className="text-[10px] text-gray-500 capitalize">{user?.role || 'admin'}</div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 text-xs px-2 sm:px-2.5 py-1 flex items-center gap-1"
        >
          <LogOut className="w-3.5 h-3.5 sm:hidden" />
          <span className="hidden sm:inline">Log Out</span>
        </Button>
      </div>
    </header>
  );
};

export default AdminTopbar;