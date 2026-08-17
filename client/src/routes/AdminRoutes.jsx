import { Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const AdminRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <Outlet />
    </ProtectedRoute>
  );
};

export default AdminRoutes;