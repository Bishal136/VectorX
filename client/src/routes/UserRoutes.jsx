import { Outlet } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const UserRoutes = () => {
  return (
    <ProtectedRoute allowedRoles={['user']}>
      <Outlet />
    </ProtectedRoute>
  );
};

export default UserRoutes;