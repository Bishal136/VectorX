import { Routes, Route } from 'react-router-dom';
import UserLayout from '../components/layout/UserLayout';
import SellerLayout from '../components/layout/SellerLayout';
import AdminLayout from '../components/layout/AdminLayout';

// Auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyOtp from '../pages/auth/VerifyOtp';
// import ForgotPassword from '../pages/auth/ForgotPassword';

// User pages
import Home from '../pages/user/Home';
// import ProductListing from '../pages/user/ProductListing';
// import ProductDetails from '../pages/user/ProductDetails';
// import Cart from '../pages/user/Cart';
// import Checkout from '../pages/user/Checkout';
import Profile from '../pages/user/Profile';
// import OrderHistory from '../pages/user/OrderHistory';

// Seller pages
import SellerDashboard from '../pages/seller/SellerDashboard';
// import SellerProducts from '../pages/seller/Products';
// import SellerOrders from '../pages/seller/Orders';
// import ShopProfile from '../pages/seller/ShopProfile';

// Admin pages
// import AdminDashboard from '../pages/admin/Dashboard';
// import AdminUsers from '../pages/admin/Users';
// import AdminSellers from '../pages/admin/Sellers';
// import AdminCategories from '../pages/admin/Categories';
// import AdminOrders from '../pages/admin/Orders';
// import AdminSettings from '../pages/admin/Settings';

// Guards
import ProtectedRoute from './ProtectedRoute';
import Page404 from '../pages/page404/Page404';
// import Unauthorized from '../pages/Unauthorized';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public – wrapped in UserLayout */}
      <Route element={<UserLayout />}>

        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        {/* <Route path="/forgot-password" element={<ForgotPassword />} /> */}
        {/* <Route path="/products" element={<ProductListing />} /> */}
        {/* <Route path="/products/:id" element={<ProductDetails />} /> */}
        {/* <Route path="/unauthorized" element={<Unauthorized />} /> */}

      </Route>

      {/* User (buyer) – Protected + UserLayout */}
      <Route element={<UserLayout />}>
        <Route element={<ProtectedRoute allowedRoles={['user']} />}>
          
          {/* <Route path="/cart" element={<Cart />} /> */}
          {/* <Route path="/checkout" element={<Checkout />} /> */}
          <Route path="/profile" element={<Profile />} />
          {/* <Route path="/orders" element={<OrderHistory />} /> */}

        </Route>
      </Route>

      {/* Seller – Protected + SellerLayout */}
      <Route element={<SellerLayout />}>
        <Route element={<ProtectedRoute allowedRoles={['seller']} />}>

          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          {/* <Route path="/seller/products" element={<SellerProducts />} /> */}
          {/* <Route path="/seller/orders" element={<SellerOrders />} /> */}
          {/* <Route path="/seller/shop" element={<ShopProfile />} /> */}

        </Route>
      </Route>

      {/* Admin – Protected + AdminLayout */}
      <Route element={<AdminLayout />}>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>

          {/* <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/sellers" element={<AdminSellers />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/settings" element={<AdminSettings />} /> */}

        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
};

export default AppRoutes;