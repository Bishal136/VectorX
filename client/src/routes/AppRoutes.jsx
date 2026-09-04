import { Routes, Route } from 'react-router-dom';
import UserLayout from '../components/layout/UserLayout';
import SellerLayout from '../components/layout/SellerLayout';
import AdminLayout from '../components/layout/AdminLayout';

// Auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import VerifyOtp from '../pages/auth/VerifyOtp';
import GoogleCallback from '../pages/auth/GoogleCallback';
import ForgotPassword from '../pages/auth/ForgotPassword';

// User pages
import Home from '../pages/user/Home';
import ProductListing from '../pages/user/ProductListing';
import ProductDetails from '../pages/user/ProductDetails';
import Cart from '../pages/user/Cart';
import Checkout from '../pages/user/Checkout';
import Profile from '../pages/user/Profile';
import ChangePassword from '../pages/user/ChangePassword';
import OrderHistory from '../pages/user/OrderHistory';
import UserMessages from '../pages/user/Messages';
import PaymentSuccess from '../pages/user/PaymentSuccess';
import PaymentFailed from '../pages/user/PaymentFailed';
import PaymentCancel from '../pages/user/PaymentCancel';

// Seller pages
import SellerDashboard from '../pages/seller/SellerDashboard';
import SellerProducts from '../pages/seller/Products';
import SellerOrders from '../pages/seller/Orders';
import SellerReviews from '../pages/seller/Reviews';
import SellerMessages from '../pages/seller/Messages';
import ShopProfile from '../pages/seller/ShopProfile';
import RegisterSeller from '../pages/seller/RegisterSeller';

// Admin pages
import AdminDashboard from '../pages/admin/Dashboard';
import AdminUsers from '../pages/admin/Users';
import AdminSellers from '../pages/admin/Sellers';
import AdminCategories from '../pages/admin/Categories';
import AdminOrders from '../pages/admin/Orders';
import AdminSettings from '../pages/admin/Settings';
import AdminCMS from '../pages/admin/CMS';

// Guards
import ProtectedRoute from './ProtectedRoute';
import Page404 from '../pages/page404/Page404';
import Unauthorized from '../pages/Unauthorized';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Standalone Auth Routes (Independent of UserLayout store Navbar & Footer) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/auth/google/callback" element={<GoogleCallback />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Public Store Routes – wrapped in UserLayout */}
      <Route element={<UserLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/products" element={<ProductListing />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/failed" element={<PaymentFailed />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
      </Route>

      {/* Authenticated User / Account routes – wrapped in UserLayout */}
      <Route element={<UserLayout />}>
        <Route element={<ProtectedRoute allowedRoles={['user', 'seller', 'admin']} />}>
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/messages" element={<UserMessages />} />
          <Route path="/user/messages" element={<UserMessages />} />
          <Route path="/become-seller" element={<RegisterSeller />} />
          <Route path="/seller/register" element={<RegisterSeller />} />
        </Route>
      </Route>

      {/* Seller only – Protected + SellerLayout */}
      <Route element={<SellerLayout />}>
        <Route element={<ProtectedRoute allowedRoles={['seller']} />}>
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/messages" element={<SellerMessages />} />
          <Route path="/seller/reviews" element={<SellerReviews />} />
          <Route path="/seller/shop" element={<ShopProfile />} />
        </Route>
      </Route>

      {/* Admin only – Protected + AdminLayout */}
      <Route element={<AdminLayout />}>
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/sellers" element={<AdminSellers />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/cms" element={<AdminCMS />} />
          <Route path="/admin/banners" element={<AdminCMS />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
};

export default AppRoutes;