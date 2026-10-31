import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getDashboardStats,
  getAllOrders,
  getSalesSeries,
  getTopProducts,
} from '../services/adminService.js';
import AdminLayout, {
  Notice,
  StatusPill,
} from '../components/AdminLayout.jsx';
import {
  STATUS_ORDER,
  STATUS_TONE,
  formatCurrency,
  formatDate,
  orderNumber,
  statusLabel,
} from '../utils/adminFormat.js';
import '../styles/admin.css';

// Segment colours follow the status tone palette.
const TONE_COLOR = {
  info: 'var(--adm-info)',
  progress: 'var(--adm-progress)',
  success: 'var(--adm-success)',
  danger: 'var(--adm-danger)',
  warning: 'var(--adm-warning)',
  neutral: 'var(--adm-muted)',
};

// Short money label for axis ticks, e.g. ₹2.5k.
const shortMoney = (amount) =>
  amount >= 1000
    ? `₹${(amount / 1000).toFixed(amount >= 10000 ? 0 : 1)}k`
    : `₹${amount}`;

const shortDate = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

// Round the top of the scale up to a tidy number, so the line never touches the top.
const niceMax = (value) => {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(1, value)));

  return Math.ceil(value / magnitude) * magnitude;
};

// Smooth curve through the points (Catmull-Rom converted to Bézier segments).
const smoothPath = (points) => {
  if (points.length === 0) return '';

  let path = `M ${points[0][0]} ${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    path += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2[0]} ${p2[1]}`;
  }

  return path;
};

const SalesStat = ({ label, value }) => (
  <div className="sales-stat">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

// Area chart of daily revenue with a hover tooltip. Plain SVG, so no chart library is needed.
const SalesChart = ({ series }) => {
  const [hover, setHover] = useState(null);

  const width = 720;
  const height = 260;
  const pad = { top: 20, right: 16, bottom: 30, left: 56 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;

  const max = niceMax(Math.max(1, ...series.map((day) => day.revenue)));
  const step = innerWidth / Math.max(1, series.length - 1);
  const baseline = pad.top + innerHeight;

  const xAt = (index) => pad.left + index * step;
  const yAt = (value) => pad.top + innerHeight - (value / max) * innerHeight;

  const points = series.map((day, index) => [xAt(index), yAt(day.revenue)]);
  const line = smoothPath(points);
  const area = points.length
    ? `${line} L ${xAt(series.length - 1)} ${baseline} L ${xAt(0)} ${baseline} Z`
    : '';

  const totalRevenue = series.reduce((sum, day) => sum + day.revenue, 0);
  const totalOrders = series.reduce((sum, day) => sum + day.orders, 0);
  const average = series.length ? totalRevenue / series.length : 0;
  const best = series.reduce(
    (top, day) => (day.revenue > top.revenue ? day : top),
    { revenue: 0, date: '' }
  );

  const labelEvery = Math.max(1, Math.ceil(series.length / 8));
  const active = hover !== null ? series[hover] : null;
  const tooltipLeft = active ? Math.min(Math.max((xAt(hover) / width) * 100, 12), 88) : 0;

  // Find the nearest day from the pointer, so it works with mouse and touch.
  const handlePointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const index = Math.round((x - pad.left) / step);

    setHover(Math.min(Math.max(index, 0), series.length - 1));
  };

  return (
    <div className="sales-wrap">
      <div className="sales-stats">
        <SalesStat label="Revenue" value={formatCurrency(totalRevenue)} />
        <SalesStat label="Orders" value={totalOrders} />
        <SalesStat label="Daily average" value={formatCurrency(average)} />
        <SalesStat
          label="Best day"
          value={best.revenue > 0 ? `${shortDate(best.date)} · ${formatCurrency(best.revenue)}` : '—'}
        />
      </div>

      <div className="sales-plot">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Revenue trend"
          className="sales-chart"
          onPointerMove={handlePointer}
          onPointerDown={handlePointer}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="sales-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#111" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#111" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((fraction) => {
            const y = baseline - fraction * innerHeight;

            return (
              <g key={fraction}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="sales-grid" />
                <text x={pad.left - 10} y={y + 4} textAnchor="end" className="sales-tick">
                  {shortMoney(Math.round(max * fraction))}
                </text>
              </g>
            );
          })}

          {area && <path d={area} fill="url(#sales-fill)" />}
          {line && <path d={line} className="sales-line" />}

          {active && (
            <>
              <line
                x1={xAt(hover)}
                x2={xAt(hover)}
                y1={pad.top}
                y2={baseline}
                className="sales-cursor"
              />
              <circle cx={xAt(hover)} cy={yAt(active.revenue)} r={5} className="sales-dot" />
            </>
          )}

          {series.map((day, index) =>
            index % labelEvery === 0 ? (
              <text
                key={`label-${day.date}`}
                x={xAt(index)}
                y={height - 8}
                textAnchor="middle"
                className="sales-tick"
              >
                {shortDate(day.date)}
              </text>
            ) : null
          )}
        </svg>

        {active && (
          <div className="sales-tooltip" style={{ left: `${tooltipLeft}%` }}>
            <strong>{shortDate(active.date)}</strong>
            <span>{formatCurrency(active.revenue)}</span>
            <span className="sales-tooltip-muted">{active.orders} order(s)</span>
          </div>
        )}
      </div>
    </div>
  );
};

const SALES_RANGES = [7, 30, 90, 365];

const today = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const AdminDashboard = () => {
  const { token } = useAuth();

  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sales, setSales] = useState(null);
  const [salesDays, setSalesDays] = useState(30);
  const [salesLoading, setSalesLoading] = useState(true);
  const [topProducts, setTopProducts] = useState([]);
  const [topLoading, setTopLoading] = useState(true);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    getTopProducts(token)
      .then((products) => {
        if (active) setTopProducts(products);
      })
      .catch(() => {
        if (active) setTopProducts([]);
      })
      .finally(() => {
        if (active) setTopLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setError('Your session has ended. Please log in again.');
      setLoading(false);
      return undefined;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      setError('');

      const [statsResult, ordersResult] = await Promise.allSettled([
        getDashboardStats(token),
        getAllOrders(token),
      ]);

      if (!active) return;

      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value);
      } else {
        setError(
          statsResult.reason?.message ||
            'Unable to load store statistics.'
        );
      }

      if (ordersResult.status === 'fulfilled') {
        setRecentOrders(
          Array.isArray(ordersResult.value)
            ? ordersResult.value.slice(0, 6)
            : []
        );
      }

      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [token]);

  // Sales chart loads on its own, so a slow request does not block the page.
  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    setSalesLoading(true);

    getSalesSeries(token, salesDays)
      .then((data) => {
        if (active) setSales(data);
      })
      .catch(() => {
        if (active) setSales(null);
      })
      .finally(() => {
        if (active) setSalesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, salesDays]);

  const byStatus = stats?.orders?.byStatus || {};
  const totalOrders = stats?.orders?.total || 0;
  const waitingOrders = byStatus.PLACED || 0;
  const products = stats?.products || {};

  return (
    <AdminLayout
      title="Overview"
      subtitle={today()}
      actions={
        <Link
          className="admin-button admin-button-primary"
          to="/admin/products"
        >
          Manage products
        </Link>
      }
    >
      {error && (
        <Notice tone="error">
          {error}{' '}
          <button
            type="button"
            className="admin-link-button"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </Notice>
      )}

      {loading && !stats && (
        <p className="admin-empty">Loading store statistics…</p>
      )}

      {stats && (
        <>
          <section className="admin-metrics" aria-label="Key figures">
            <div className="admin-metric">
              <div className="admin-metric-label">Orders</div>
              <div className="admin-metric-value">{totalOrders}</div>
              <div className="admin-metric-note">All time</div>
            </div>

            <div className="admin-metric">
              <div className="admin-metric-label">Order value</div>
              <div className="admin-metric-value">
                {formatCurrency(stats.totalOrderValue)}
              </div>
              <div className="admin-metric-note">Excludes cancelled</div>
            </div>

            <div className="admin-metric">
              <div className="admin-metric-label">Paid revenue</div>
              <div className="admin-metric-value">
                {formatCurrency(stats.paidRevenue)}
              </div>
              <div className="admin-metric-note">Payment confirmed</div>
            </div>

            <div className="admin-metric">
              <div className="admin-metric-label">In stock</div>
              <div className="admin-metric-value">
                {products.inStock ?? 0}
                <span className="admin-muted"> / {products.total ?? 0}</span>
              </div>
              <div className="admin-metric-note">Products available</div>
            </div>
          </section>

          <section className="admin-panel" style={{ marginBottom: 20 }}>
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">Sales</h2>
                <p className="admin-panel-note">
                  {sales
                    ? `${formatCurrency(sales.totalRevenue)} from ${sales.totalOrders} order(s) in the last ${salesDays} days`
                    : 'Revenue per day, excluding cancelled orders'}
                </p>
              </div>
              <div className="admin-tabs" role="group" aria-label="Sales range">
                {SALES_RANGES.map((range) => (
                  <button
                    key={range}
                    type="button"
                    className={`admin-tab${salesDays === range ? ' active' : ''}`}
                    aria-pressed={salesDays === range}
                    onClick={() => setSalesDays(range)}
                  >
                    {range === 365 ? '1 year' : `${range} days`}
                  </button>
                ))}
              </div>
            </div>

            {salesLoading && !sales ? (
              <p className="admin-empty">Loading sales…</p>
            ) : sales ? (
              <SalesChart series={sales.series} />
            ) : (
              <p className="admin-empty">Sales are unavailable right now.</p>
            )}
          </section>

          <div className="admin-two-col">
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2 className="admin-panel-title">Order pipeline</h2>
                  <p className="admin-panel-note">
                    Where every order sits right now
                  </p>
                </div>
                <Link className="admin-link-button" to="/admin/orders">
                  All orders
                </Link>
              </div>

              {totalOrders === 0 ? (
                <p className="admin-empty">
                  No orders yet. They will appear here once customers
                  check out.
                </p>
              ) : (
                <>
                  <div
                    className="admin-pipeline"
                    role="img"
                    aria-label="Share of orders by status"
                  >
                    {STATUS_ORDER.map((status) => {
                      const count = byStatus[status] || 0;

                      if (!count) return null;

                      return (
                        <span
                          key={status}
                          style={{
                            width: `${(count / totalOrders) * 100}%`,
                            background:
                              TONE_COLOR[STATUS_TONE[status]] ||
                              TONE_COLOR.neutral,
                          }}
                        />
                      );
                    })}
                  </div>

                  <ul className="admin-legend">
                    {STATUS_ORDER.map((status) => {
                      const count = byStatus[status] || 0;
                      const share = totalOrders
                        ? Math.round((count / totalOrders) * 100)
                        : 0;

                      return (
                        <li key={status}>
                          <span
                            className="admin-swatch"
                            style={{
                              background:
                                TONE_COLOR[STATUS_TONE[status]] ||
                                TONE_COLOR.neutral,
                            }}
                            aria-hidden="true"
                          />
                          <span>{statusLabel(status)}</span>
                          <span className="admin-legend-count">
                            {count}
                          </span>
                          <span className="admin-legend-share">
                            {share}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h2 className="admin-panel-title">Needs attention</h2>
                  <p className="admin-panel-note">
                    Work that is waiting on you
                  </p>
                </div>
              </div>

              <ul className="admin-attention">
                <li>
                  <div>
                    <strong>Orders to confirm</strong>
                    <div className="admin-muted">
                      Placed but not yet confirmed
                    </div>
                  </div>
                  <Link
                    className="admin-attention-figure"
                    to="/admin/orders"
                    aria-label={`${waitingOrders} orders to confirm`}
                  >
                    {waitingOrders}
                  </Link>
                </li>

                <li>
                  <div>
                    <strong>Out of stock</strong>
                    <div className="admin-muted">
                      Hidden from customers until restocked
                    </div>
                  </div>
                  <Link
                    className={`admin-attention-figure${
                      products.outOfStock ? ' is-alert' : ''
                    }`}
                    to="/admin/products"
                    aria-label={`${products.outOfStock ?? 0} products out of stock`}
                  >
                    {products.outOfStock ?? 0}
                  </Link>
                </li>

                <li>
                  <div>
                    <strong>Low stock</strong>
                    <div className="admin-muted">
                      One to five units left
                    </div>
                  </div>
                  <Link
                    className="admin-attention-figure"
                    to="/admin/products"
                    aria-label={`${products.lowStock ?? 0} products low on stock`}
                  >
                    {products.lowStock ?? 0}
                  </Link>
                </li>
              </ul>

              {(products.lowStockItems || []).length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="admin-muted" style={{ fontSize: 12, marginBottom: 6 }}>Running low</div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 13 }}>
                    {products.lowStockItems.slice(0, 6).map((item, index) => (
                      <li key={`${item.productId}-${item.color}-${item.size}-${index}`} style={{ padding: '4px 0' }}>
                        {item.name}
                        {item.color ? ` · ${item.color}` : ''}
                        {item.size ? ` / ${item.size}` : ''} — <strong>{item.stock} left</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          <section className="admin-panel" style={{ marginBottom: 20 }}>
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">Top selling products</h2>
                <p className="admin-panel-note">Best sellers by units sold, excluding cancelled orders</p>
              </div>
            </div>

            {topLoading ? (
              <p className="admin-empty">Loading…</p>
            ) : topProducts.length === 0 ? (
              <p className="admin-empty">No sales yet.</p>
            ) : (
              <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {topProducts.map((product, index) => (
                  <li
                    key={product._id || index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '12px 0',
                      borderTop: '1px solid var(--adm-line)',
                    }}
                  >
                    <span style={{ width: 22, fontWeight: 700, color: '#777' }}>{index + 1}</span>

                    {product.image ? (
                      <img
                        src={product.image}
                        alt=""
                        style={{ width: 44, height: 56, objectFit: 'cover', border: '1px solid var(--adm-line)', background: '#f3f1ed' }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{ width: 44, height: 56, border: '1px solid var(--adm-line)', background: '#f3f1ed' }}
                      />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.name}
                      </strong>
                      <span className="admin-muted">{formatCurrency(product.revenue)} revenue</span>
                    </div>

                    <span className="admin-pill admin-pill-success">{product.unitsSold} sold</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2 className="admin-panel-title">Recent orders</h2>
                <p className="admin-panel-note">
                  The six most recent orders
                </p>
              </div>
              <Link className="admin-link-button" to="/admin/orders">
                View all orders
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="admin-empty">No orders to show yet.</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Placed</th>
                      <th className="num">Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order._id}>
                        <td>
                          <Link
                            className="admin-link-button"
                            to={`/admin/orders?open=${order._id}`}
                          >
                            {orderNumber(order._id)}
                          </Link>
                        </td>
                        <td>
                          {order.shippingAddress?.name ||
                            order.user?.name ||
                            '—'}
                        </td>
                        <td>{formatDate(order.createdAt)}</td>
                        <td className="num">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td>
                          <StatusPill status={order.orderStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <footer className="admin-muted admin-page-footer">
        Threads.com store admin
      </footer>
    </AdminLayout>
  );
};

export default AdminDashboard;
