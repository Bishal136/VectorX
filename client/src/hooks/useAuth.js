// src/hooks/useAuth.js
import { useDispatch, useSelector } from 'react-redux';
import { useCallback } from 'react';
import { logoutUser } from '../features/auth/authSlice';

/**
 * Custom hook for authentication state and actions.
 *
 * @returns {Object} { user, token, isAuthenticated, isLoading, error, logout }
 */
 export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, status, error, isInitializing } = useSelector((state) => state.auth);

  const isAuthenticated = !!token && !!user;
  const isLoading = status === 'loading';

  const logout = useCallback(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    logout,
  };
};

export default useAuth;