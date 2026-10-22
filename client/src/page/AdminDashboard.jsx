
import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getDashboardStats } from '../services/adminService.js';
import '../styles/admin.css';

const currency = (amount = 0) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const AdminDashboard = () => {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError('');

        const data = await getDashboardStats(token);

        if (active) {
          setStats(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load dashboard statistics.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (token) {
      loadDashboard();
    } else {
      setError('Your login session is missing. Please log in again.');
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const orderStatuses = stats?.orders?.byStatus || {};

  return (
    <div className="admin-page">
      <div className="admin-shell">
        {/* Sidebar */}
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span className="admin-brand-mark">T</span>

            <div>
              <strong>THREADS.COM</strong>
              <span>ADMIN STUDIO</span>
            </div>
          </div>

          <div className="admin-nav-label">WORKSPACE</div>

          <nav className="admin-nav">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span>▦</span> Overview
            </NavLink>

            <NavLink
              to="/admin/products"
              className={({ isActive }) =>
                isActive ? 'active' : ''
              }
            >
              <span>◫</span> Products
            </NavLink>

            <a
              href="#orders"
              onClick={(event) => event.preventDefault()}
              title="Order management is coming next"
            >
              <span>▤</span> Orders
              <small>Soon</small>
            </a>

            <a
              href="#customers"
              onClick={(event) => event.preventDefault()}
              title="Customer management is coming next"
            >
              <span>♙</span> Customers
              <small>Soon</small>
            </a>
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-avatar">A</div>

            <div className="admin-user-info">
              <strong>Administrator</strong>
              <span>Store management</span>
            </div>

            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              ↗
            </button>
          </div>
        </aside>

        {/* Main Dashboard */}
        <main className="admin-main">
          <header className="admin-topbar">
            <div>
              <div className="admin-eyebrow">
                WORKSPACE / OVERVIEW
              </div>

              <h1 className="admin-title">Dashboard</h1>

              <p className="admin-subtitle">
                Welcome back. Here's your store at a glance.
              </p>
            </div>

            <Link
              className="admin-button admin-button-primary"
              to="/admin/products"
            >
              + Manage Products
            </Link>
          </header>

          {/* Loading State */}
          {loading && (
            <div className="admin-panel">
              <p className="admin-muted">
                Loading dashboard statistics...
              </p>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="admin-panel" role="alert">
              <h2 className="admin-panel-title">
                Unable to load dashboard
              </h2>

              <p className="admin-muted">{error}</p>

              <button
                type="button"
                className="admin-button admin-button-primary"
                onClick={() => window.location.reload()}
              >
                Try again
              </button>
            </div>
          )}

          {/* Dashboard Statistics */}
          {!loading && !error && stats && (
            <>
              <section
                className="admin-stats-grid"
                aria-label="Store statistics"
              >
                <article className="admin-stat-card">
                  <div className="admin-stat-label">
                    TOTAL PRODUCTS
                  </div>

                  <div className="admin-stat-value">
                    {stats.products?.total ?? 0}
                  </div>

                  <div className="admin-muted">
                    Products in your catalogue
                  </div>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-label">
                    TOTAL ORDERS
                  </div>

                  <div className="admin-stat-value">
                    {stats.orders?.total ?? 0}
                  </div>

                  <div className="admin-muted">
                    All recorded orders
                  </div>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-label">
                    ORDER VALUE
                  </div>

                  <div className="admin-stat-value">
                    {currency(stats.totalOrderValue)}
                  </div>

                  <div className="admin-muted">
                    Excluding cancelled orders
                  </div>
                </article>

                <article className="admin-stat-card">
                  <div className="admin-stat-label">
                    PAID REVENUE
                  </div>

                  <div className="admin-stat-value">
                    {currency(stats.paidRevenue)}
                  </div>

                  <div className="admin-muted">
                    Orders marked as paid
                  </div>
                </article>
              </section>

              {/* Inventory and Orders */}
              <section className="admin-dashboard-grid">
                <article className="admin-panel">
                  <div className="admin-panel-header">
                    <div>
                      <h2 className="admin-panel-title">
                        Inventory Overview
                      </h2>

                      <p className="admin-muted">
                        Current product stock status
                      </p>
                    </div>

                    <Link to="/admin/products">
                      View products →
                    </Link>
                  </div>

                  <div className="admin-overview-list">
                    <div>
                      <span>In stock</span>
                      <strong>
                        {stats.products?.inStock ?? 0}
                      </strong>
                    </div>

                    <div>
                      <span>Low stock (1–5)</span>
                      <strong>
                        {stats.products?.lowStock ?? 0}
                      </strong>
                    </div>

                    <div>
                      <span>Out of stock</span>
                      <strong>
                        {stats.products?.outOfStock ?? 0}
                      </strong>
                    </div>
                  </div>
                </article>

                <article className="admin-panel">
                  <div className="admin-panel-header">
                    <div>
                      <h2 className="admin-panel-title">
                        Order Status
                      </h2>

                      <p className="admin-muted">
                        Orders grouped by current status
                      </p>
                    </div>
                  </div>

                  <div className="admin-overview-list">
                    {Object.keys(orderStatuses).length === 0 ? (
                      <p className="admin-muted">
                        No orders recorded yet.
                      </p>
                    ) : (
                      Object.entries(orderStatuses).map(
                        ([status, count]) => (
                          <div key={status}>
                            <span>
                              {status.replaceAll('_', ' ')}
                            </span>

                            <strong>{count}</strong>
                          </div>
                        )
                      )
                    )}
                  </div>
                </article>
              </section>

              {/* Next Development Step */}
              <section className="admin-panel admin-next-panel">
                <div>
                  <h2 className="admin-panel-title">
                    Next: Order Management
                  </h2>

                  <p className="admin-muted">
                    Dashboard statistics are connected. Next, build
                    the admin order management page to view orders,
                    customer details, and update order statuses.
                  </p>
                </div>
              </section>
            </>
          )}

          <footer className="admin-muted admin-page-footer">
            THREADS.COM · ADMIN STUDIO
          </footer>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
