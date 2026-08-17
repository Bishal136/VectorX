// Suggested location: src/components/auth/AuthBootstrap.jsx
//
// Wrap this around your routes in App.jsx, inside the Redux <Provider>:
//
//   <Provider store={store}>
//     <AuthBootstrap>
//       <BrowserRouter>
//         <AppRoutes />
//       </BrowserRouter>
//     </AuthBootstrap>
//   </Provider>
//
// On first mount: if a token survived a page reload but `user` hasn't been
// rehydrated yet, this fetches the current user once so isAuthenticated
// (token && user) goes back to true instead of staying stuck at "logged out".

import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCurrentUser } from '../../features/auth/authSlice';

const AuthBootstrap = ({ children }) => {
  const dispatch = useDispatch();
  const { token, user, isInitializing } = useSelector((state) => state.auth);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (token && !user) {
      dispatch(fetchCurrentUser());
    }
  }, [dispatch, token, user]);

  // Brief full-page spinner while we confirm the token is still valid, instead
  // of letting the Navbar/pages flash a "logged out" state for a moment first.
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-green-600 rounded-full animate-spin" />
      </div>
    );
  }

  return children;
};

export default AuthBootstrap;