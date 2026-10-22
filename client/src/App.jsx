
import { useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layout and route protection
import Layout from './layouts/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Authentication pages
import Login from './page/Login.jsx';
import Register from './page/Register.jsx';
import ForgotPassword from './page/ForgotPassword.jsx';
import VerifyOtp from './page/VerifyOtp.jsx';
import ResetPassword from './page/ResetPassword.jsx';

// Customer pages
import Home from './page/Home.jsx';
import Products from './page/Products.jsx';
import ProductDetails from './page/ProductDetails.jsx';
import Wishlist from './page/Wishlist.jsx';
import Cart from './page/Cart.jsx';

// Admin pages
import AdminDashboard from './page/AdminDashboard.jsx';
import AdminProducts from './page/AdminProducts.jsx';
import AdminOrders from './page/AdminOrders.jsx';

//profile page
import Profile from './page/Profile.jsx';

import Checkout from "./page/Checkout.jsx";
import OrderSuccess from './page/OrderSuccess.jsx';
import MyOrders from './page/MyOrders.jsx';

function App() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <Routes>
      {/* Redirect root to login */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      {/* Authentication pages */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      {/* Customer pages with shared layout */}
      <Route element={<Layout />}>
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={<Products />}
        />

        <Route
          path="/products/:id"
          element={<ProductDetails />}
        />

        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          }
        />

        <Route
          path="/cart"
          element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-success"
          element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin dashboard — admin only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin product management — admin only */}
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminProducts />
          </ProtectedRoute>
        }
      />

      {/* Redirect unknown URLs to login */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
      {/* Admin order management — admin only */}
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminOrders />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
