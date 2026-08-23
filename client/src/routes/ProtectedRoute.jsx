import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // If a seller tries to access buyer-only routes (e.g. /profile), redirect to seller dashboard
    if (user?.role === 'seller') {
      return <Navigate to="/seller/dashboard" replace />;
    }
    // If an admin tries to access unauthorized routes, redirect to admin dashboard
    if (user?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // If a standard user (buyer) tries to access seller/admin routes, redirect to storefront
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;