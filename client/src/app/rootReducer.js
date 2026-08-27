// src/app/rootReducer.js
import { combineReducers } from '@reduxjs/toolkit';

// Import all feature slices
import authReducer from '../features/auth/authSlice';
import userReducer from '../features/user/userSlice';
import sellerReducer from '../features/seller/sellerSlice';
import adminReducer from '../features/admin/adminSlice';
import productReducer from '../features/products/productSlice';
import cartReducer from '../features/cart/cartSlice';
import orderReducer from '../features/order/orderSlice';
import paymentReducer from '../features/payment/paymentSlice';
import chatReducer from '../features/chat/chatSlice';
//

// Import RTK Query API reducers if you use them
// import { authApi } from '../features/auth/authApi';
// import { productApi } from '../features/products/productApi';

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  seller: sellerReducer,
  admin: adminReducer,
  products: productReducer,
  cart: cartReducer,
  orders: orderReducer,
  order: orderReducer,
  payment: paymentReducer,
  chat: chatReducer,
});

export default rootReducer;