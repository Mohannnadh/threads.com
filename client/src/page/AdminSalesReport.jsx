import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSalesReport } from '../services/adminService.js';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';
import { formatCurrency } from '../utils/adminFormat.js';
import '../styles/admin.css';

// Rows per page in the "Day by day" table.
// To show more or fewer rows per page, change this number.
const DAY_ROWS_PER_PAGE = 10;

// Sort options for the "Day by day" table.
const DAY_SORTS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'orders', label: 'Most orders' },
  { key: 'units', label: 'Most units sold' },
  { key: 'gross', label: 'Highest gross' },
  { key: 'net', label: 'Highest net' },
];

// Calendar day in India, as YYYY-MM-DD, shifted by a number of days.
const dayKeyFromToday = (offsetDays = 0) => {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const date = new Date(`${today}T00:00:00Z`);

  date.setUTCDate(date.getUTCDate() + offsetDays);

  return date.toISOString().slice(0, 10);
};

const monthStart = () => `${dayKeyFromToday(0).slice(0, 7)}-01`;

const PRESETS = [
  { key: '7', label: 'Last 7 days', range: () => [dayKeyFromToday(-6), dayKeyFromToday(0)] },
  { key: '30', label: 'Last 30 days', range: () => [dayKeyFromToday(-29), dayKeyFromToday(0)] },
  { key: 'month', label: 'This month', range: () => [monthStart(), dayKeyFromToday(0)] },
  { key: '90', label: 'Last 90 days', range: () => [dayKeyFromToday(-89), dayKeyFromToday(0)] },
];

const formatDay = (key) =>
  new Date(`${key}T00:00:00+05:30`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const PAYMENT_LABEL = { COD: 'Cash on delivery', ONLINE: 'Online (Razorpay)', WALLET: 'Wallet' };
const STATUS_LABEL = {
  PLACED: 'Placed',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

// Turns the report into a CSV file the admin can open in Excel or Sheets.
const downloadCsv = (report) => {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Sales report', `${report.from} to ${report.to}`],
    [],
    ['Summary'],
    ['Orders', report.summary.orders],
    ['Units sold', report.summary.units],
    ['Gross sales', report.summary.grossSales],
    ['Discounts', report.summary.discounts],
    ['Refunds', report.summary.refunds],
    ['Net sales', report.summary.netSales],
    ['Average order', report.summary.averageOrder],
    [],
    ['Date', 'Orders', 'Units', 'Gross', 'Discounts', 'Net'],
    ...report.daily.map((day) => [day.date, day.orders, day.units, day.gross, day.discounts, day.net]),
    [],
    ['Top products', 'Units', 'Revenue'],
    ...report.topProducts.map((product) => [product.name, product.units, product.revenue]),
  ];

  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');

  link.href = url;
  link.download = `sales-${report.from}-to-${report.to}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const AdminSalesReport = () => {
  const { token } = useAuth();

  const [preset, setPreset] = useState('30');
  const [from, setFrom] = useState(() => dayKeyFromToday(-29));
  const [to, setTo] = useState(() => dayKeyFromToday(0));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [dayPage, setDayPage] = useState(1);
  const [showDaily, setShowDaily] = useState(true);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    setLoading(true);

    getSalesReport(token, from, to)
      .then((data) => {
        if (!active) return;

        setReport(data);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load the sales report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, from, to]);

  const choosePreset = (item) => {
    const [start, end] = item.range();

    setDayPage(1);
    setPreset(item.key);
    setFrom(start);
    setTo(end);
  };

  const changeFrom = (value) => {
    setDayPage(1);
    setPreset('custom');
    setFrom(value);
    if (value > to) setTo(value);
  };

  const changeTo = (value) => {
    setDayPage(1);
    setPreset('custom');
    setTo(value);
    if (value < from) setFrom(value);
  };

  const summary = report?.summary;

  const compareDays = (a, b) => {
    const newest = b.date.localeCompare(a.date);

    switch (sortBy) {
      case 'oldest':
        return -newest;
      case 'orders':
        return b.orders - a.orders || newest;
      case 'units':
        return b.units - a.units || newest;
      case 'gross':
        return b.gross - a.gross || newest;
      case 'net':
        return b.net - a.net || newest;
      default:
        return newest;
    }
  };

  const sortedDays = report ? [...report.daily].sort(compareDays) : [];
  const dayPageCount = Math.max(1, Math.ceil(sortedDays.length / DAY_ROWS_PER_PAGE));
  const currentDayPage = Math.min(dayPage, dayPageCount);
  const dayRows = sortedDays.slice(
    (currentDayPage - 1) * DAY_ROWS_PER_PAGE,
    currentDayPage * DAY_ROWS_PER_PAGE
  );

  const cards = summary
    ? [
        { label: 'Net sales', value: formatCurrency(summary.netSales), strong: true },
        { label: 'Gross sales', value: formatCurrency(summary.grossSales) },
        { label: 'Orders', value: summary.orders },
        { label: 'Units sold', value: summary.units },
        { label: 'Average order', value: formatCurrency(summary.averageOrder) },
        { label: 'Discounts given', value: formatCurrency(summary.discounts) },
        { label: 'Refunds', value: formatCurrency(summary.refunds), sub: `${summary.refundCount} return(s)` },
        { label: 'Cancelled orders', value: summary.cancelled },
      ]
    : [];

  return (
    <AdminLayout title="Sales report" subtitle="Sales, refunds and best sellers for any date range">
      {error && <Notice tone="error">{error}</Notice>}

      <section className="admin-panel" style={{ marginBottom: 20 }}>
        <div className="admin-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="admin-tabs" role="tablist">
            {PRESETS.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={preset === item.key}
                className={`admin-tab${preset === item.key ? ' is-active' : ''}`}
                onClick={() => choosePreset(item)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13 }}>
              From{' '}
              <input type="date" value={from} max={to} onChange={(event) => changeFrom(event.target.value)} />
            </label>
            <label style={{ fontSize: 13 }}>
              To{' '}
              <input type="date" value={to} min={from} max={dayKeyFromToday(0)} onChange={(event) => changeTo(event.target.value)} />
            </label>
            <button
              type="button"
              className="admin-button admin-button-primary"
              disabled={!report}
              onClick={() => report && downloadCsv(report)}
            >
              Download CSV
            </button>
          </div>
        </div>
      </section>

      {loading && !report ? (
        <p className="admin-empty">Loading the report…</p>
      ) : (
        report && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 12,
                marginBottom: 20,
                opacity: loading ? 0.5 : 1,
              }}
            >
              {cards.map((card) => (
                <div key={card.label} className="admin-panel" style={{ margin: 0, padding: 16 }}>
                  <div className="admin-muted" style={{ fontSize: 12 }}>{card.label}</div>
                  <div style={{ fontSize: card.strong ? 24 : 20, fontWeight: 600, marginTop: 4 }}>
                    {card.value}
                  </div>
                  {card.sub && <div className="admin-muted" style={{ fontSize: 12 }}>{card.sub}</div>}
                </div>
              ))}
            </div>

            <section className="admin-panel" style={{ marginBottom: 20 }}>
              <div className="admin-panel-header">
                <div>
                  <h3 className="admin-panel-title">Day by day</h3>
                  <p className="admin-muted" style={{ margin: 0 }}>{report.daily.length} days in this range</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {showDaily && (
                    <label style={{ fontSize: 13 }}>
                      Sort by{' '}
                      <select
                        value={sortBy}
                        onChange={(event) => {
                          setDayPage(1);
                          setSortBy(event.target.value);
                        }}
                      >
                        {DAY_SORTS.map((option) => (
                          <option key={option.key} value={option.key}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    className="admin-button"
                    onClick={() => setShowDaily((current) => !current)}
                  >
                    {showDaily ? 'Hide table' : 'Show table'}
                  </button>
                </div>
              </div>

              {showDaily && (
                <>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th className="num">Orders</th>
                          <th className="num">Units</th>
                          <th className="num">Gross</th>
                          <th className="num">Discounts</th>
                          <th className="num">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dayRows.map((day) => (
                          <tr key={day.date} style={day.orders === 0 ? { color: '#aaa' } : undefined}>
                            <td>{formatDay(day.date)}</td>
                            <td className="num">{day.orders}</td>
                            <td className="num">{day.units}</td>
                            <td className="num">{formatCurrency(day.gross)}</td>
                            <td className="num">{formatCurrency(day.discounts)}</td>
                            <td className="num">{formatCurrency(day.net)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {dayPageCount >= 1 && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 14,
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <span className="admin-muted" style={{ fontSize: 13 }}>
                        Page {currentDayPage} of {dayPageCount} · {sortedDays.length} days
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          className="admin-button"
                          disabled={currentDayPage <= 1}
                          onClick={() => setDayPage(currentDayPage - 1)}
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          className="admin-button"
                          disabled={currentDayPage >= dayPageCount}
                          onClick={() => setDayPage(currentDayPage + 1)}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: 20,
                marginBottom: 20,
              }}
            >
              <section className="admin-panel" style={{ margin: 0 }}>
                <h3 className="admin-panel-title">Top 5 selling products</h3>
                <p className="admin-muted" style={{ marginTop: 0 }}>Ranked by units sold</p>
                {report.topProducts.length === 0 ? (
                  <p className="admin-empty">No sales in this period.</p>
                ) : (
                  <ol style={{ margin: 0, paddingLeft: 20 }}>
                    {report.topProducts.map((product) => (
                      <li key={product._id || product.name} style={{ padding: '6px 0' }}>
                        <strong>{product.name}</strong>
                        <div className="admin-muted" style={{ fontSize: 12 }}>
                          {product.units} sold · {formatCurrency(product.revenue)}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="admin-panel" style={{ margin: 0 }}>
                <h3 className="admin-panel-title">Payment methods</h3>
                {report.byPayment.length === 0 ? (
                  <p className="admin-empty">No sales in this period.</p>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Method</th>
                        <th className="num">Orders</th>
                        <th className="num">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.byPayment.map((row) => (
                        <tr key={row.method}>
                          <td>{PAYMENT_LABEL[row.method] || row.method}</td>
                          <td className="num">{row.orders}</td>
                          <td className="num">{formatCurrency(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <h3 className="admin-panel-title" style={{ marginTop: 22 }}>Orders by status</h3>
                {Object.keys(report.byStatus).length === 0 ? (
                  <p className="admin-empty">No orders in this period.</p>
                ) : (
                  <table className="admin-table">
                    <tbody>
                      {Object.entries(report.byStatus).map(([status, count]) => (
                        <tr key={status}>
                          <td>{STATUS_LABEL[status] || status}</td>
                          <td className="num">{count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </>
        )
      )}
    </AdminLayout>
  );
};

export default AdminSalesReport;
