import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import Logo from '../common/Logo';
import Button from '../common/Button';

const AdminTopbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-200 py-2.5 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <Link to="/admin/dashboard" className="flex items-center gap-2">
          <Logo />
        </Link>
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
          Super Admin
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <Link
          to="/"
          className="text-gray-600 hover:text-indigo-600 font-medium text-xs sm:text-sm hidden md:inline-flex items-center gap-1"
        >
          <span>🏪</span> View Storefront
        </Link>
        <div className="h-4 w-px bg-gray-200 hidden md:block" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="text-xs font-bold text-gray-900">{user?.name}</div>
            <div className="text-[10px] text-gray-500 capitalize">{user?.role || 'admin'}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-gray-500 hover:text-red-600 text-xs px-2.5 py-1"
        >
          Log Out
        </Button>
      </div>
    </header>
  );
};

export default AdminTopbar;