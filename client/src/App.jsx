
import { useLayoutEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

// Layout and route protection
import Layout from './layouts/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Authentication pages
import Login from './page/Login.jsx';
import AdminLogin from './page/AdminLogin.jsx';
import Register from './page/Register.jsx';
import ForgotPassword from './page/ForgotPassword.jsx';
import VerifyOtp from './page/VerifyOtp.jsx';
import ResetPassword from './page/ResetPassword.jsx';

// Customer pages
import Home from './page/Home.jsx';
import Products from './page/Products.jsx';
import Categories from './page/Categories.jsx';
import ProductDetails from './page/ProductDetails.jsx';
import Wishlist from './page/Wishlist.jsx';
import Cart from './page/Cart.jsx';

// Admin pages
import AdminDashboard from './page/AdminDashboard.jsx';
import AdminProducts from './page/AdminProducts.jsx';
import AdminOrders from './page/AdminOrders.jsx';
import AdminReturns from './page/AdminReturns.jsx';
import AdminCategories from './page/AdminCategories.jsx';
import AdminReviews from './page/AdminReviews.jsx';
import AdminOffers from './page/AdminOffers.jsx';
import AdminProfile from './page/AdminProfile.jsx';
import AdminSalesReport from './page/AdminSalesReport.jsx';
import AdminCustomers from './page/AdminCustomers.jsx';
import AdminCoupons from './page/AdminCoupons.jsx';

//profile page
import Profile from './page/Profile.jsx';

import Checkout from "./page/Checkout.jsx";
import OrderSuccess from './page/OrderSuccess.jsx';
import MyOrders from './page/MyOrders.jsx';
import Wallet from './page/Wallet.jsx';

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
      <Route path="/admin/login" element={<AdminLogin />} />
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
        <Route path="/categories" element={<Categories />} />
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
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Admin dashboard — admin only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Admin product management — admin only */}
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
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
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminOrders />
          </ProtectedRoute>
        }
      />
      {/* Admin category management — admin only */}
      <Route
        path="/admin/categories"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminCategories />
          </ProtectedRoute>
        }
      />
      {/* Admin coupons (code-based discounts) — admin only */}
      <Route
        path="/admin/coupons"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminCoupons />
          </ProtectedRoute>
        }
      />

      {/* Admin customers — admin only */}
      <Route
        path="/admin/customers"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminCustomers />
          </ProtectedRoute>
        }
      />

      {/* Admin sales report — admin only */}
      <Route
        path="/admin/sales"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminSalesReport />
          </ProtectedRoute>
        }
      />

      {/* Admin profile — admin only */}
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminProfile />
          </ProtectedRoute>
        }
      />

      {/* Admin product offers (automatic discounts) — admin only */}
      <Route
        path="/admin/offers"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminOffers />
          </ProtectedRoute>
        }
      />
      {/* Admin review moderation — admin only */}
      <Route
        path="/admin/reviews"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminReviews />
          </ProtectedRoute>
        }
      />
      {/* Admin return and exchange requests — admin only */}
      <Route
        path="/admin/returns"
        element={
          <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">
            <AdminReturns />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
