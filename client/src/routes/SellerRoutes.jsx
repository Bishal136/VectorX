import { Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const SellerRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={['seller']}>
      <Outlet />
    </ProtectedRoute>
  );
};

export default SellerRoutes;