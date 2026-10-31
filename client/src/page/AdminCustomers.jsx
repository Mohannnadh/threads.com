import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getCustomers, getCustomer, setCustomerBlocked } from '../services/adminService.js';
import Pagination from '../components/Pagination.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';
import { formatCurrency, formatDate, orderNumber, statusLabel } from '../utils/adminFormat.js';
import '../styles/admin.css';

const PAGE_SIZE = 15;

const AdminCustomers = () => {
  const { token } = useAuth();

  // The customer list
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // The popup for one customer
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;
    setLoading(true);

    getCustomers(token, { search: debouncedSearch, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!active) return;

        setCustomers(data.customers);
        setPagination(data.pagination);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load customers.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, debouncedSearch, page, refreshKey]);

  // Loads the chosen customer when the popup opens.
  useEffect(() => {
    if (!token || !selectedId) {
      setDetail(null);
      return undefined;
    }

    let active = true;
    setDetailLoading(true);

    getCustomer(token, selectedId)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Could not load this customer.');
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, selectedId, refreshKey]);

  // Closing the popup with Escape.
  useEffect(() => {
    if (!selectedId) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') closePopup();
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  const openPopup = (id) => {
    setOrderSearch('');
    setSelectedId(id);
  };

  const closePopup = () => {
    setSelectedId('');
    setDetail(null);
    setOrderSearch('');
  };

  const customer = detail?.customer;

  // Orders matching the search in the popup: order number, product, status, payment or date.
  const visibleOrders = useMemo(() => {
    const orders = detail?.orders || [];
    const query = orderSearch.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter((order) => {
      const haystack = [
        orderNumber(order._id),
        order._id,
        statusLabel(order.orderStatus),
        order.orderStatus,
        order.paymentMethod,
        order.couponCode || '',
        formatDate(order.createdAt),
        ...(order.items || []).flatMap((item) => [item.name, item.color, item.size]),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query.replace(/^#/, ''));
    });
  }, [detail, orderSearch]);

  const toggleBlocked = async () => {
    if (!customer) return;

    const block = !customer.isBlocked;
    const question = block
      ? `Block ${customer.name}? They will be signed out and cannot sign in until unblocked.`
      : `Unblock ${customer.name}? They will be able to sign in again.`;

    if (!(await confirmDialog({ title: block ? 'Block customer?' : 'Unblock customer?', message: question, confirmLabel: block ? 'Block' : 'Unblock', danger: block }))) return;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const data = await setCustomerBlocked(token, customer._id, block);
      setNotice(data.message);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Could not update the customer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="Customers" subtitle="Accounts, addresses and order history">
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}
      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="admin-panel">
        <div className="admin-toolbar">
          <input
            type="search"
            className="admin-search"
            placeholder="Search customer by name or email"
            aria-label="Search customers"
            value={search}
            onChange={(event) => {
              setLoading(true);
              setSearch(event.target.value);
            }}
          />
        </div>

        {loading ? (
          <p className="admin-empty">Loading customers…</p>
        ) : customers.length === 0 ? (
          <p className="admin-empty">No customers found.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th className="num">Orders</th>
                  <th className="num">Delivered</th>
                  <th className="num">Total spent</th>
                  <th>Last order</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((row) => (
                  <tr
                    key={row._id}
                    onClick={() => openPopup(row._id)}
                    style={{ cursor: 'pointer' }}
                    title="View customer"
                  >
                    <td>
                      <span className="admin-product-name">{row.name}</span>
                    </td>
                    <td>{row.email}</td>
                    <td>{formatDate(row.joinedAt)}</td>
                    <td className="num">{row.orders}</td>
                    <td className="num">{row.delivered}</td>
                    <td className="num">{formatCurrency(row.spent)}</td>
                    <td>{row.lastOrder ? formatDate(row.lastOrder) : '—'}</td>
                    <td>
                      <span className={`admin-pill admin-pill-${row.isBlocked ? 'danger' : 'success'}`}>
                        {row.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <Pagination
            pagination={pagination}
            onPageChange={(next) => {
              setLoading(true);
              setPage(next);
            }}
            itemLabel="customers"
            disabled={loading}
          />
        )}
      </section>

      {selectedId && (
        <div className="admin-modal-backdrop" onClick={closePopup} role="presentation">
          <div
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-popup-title"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 900 }}
          >
            <div className="admin-modal-head">
              <div>
                <h2 id="customer-popup-title" className="admin-panel-title" style={{ margin: 0 }}>
                  {customer ? customer.name : 'Customer'}
                </h2>
                {customer && (
                  <p className="admin-muted" style={{ margin: 0 }}>
                    {customer.email}
                  </p>
                )}
              </div>
              <button type="button" className="admin-icon-button" aria-label="Close" onClick={closePopup}>
                ✕
              </button>
            </div>

            <div className="admin-modal-body" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
              {detailLoading || !customer ? (
                <p className="admin-empty">Loading…</p>
              ) : (
                <>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 12,
                    }}
                  >
                    {[
                      { label: 'Orders', value: detail.stats.orders },
                      { label: 'Delivered', value: detail.stats.delivered },
                      { label: 'Cancelled', value: detail.stats.cancelled },
                      { label: 'Total spent', value: formatCurrency(detail.stats.spent) },
                      { label: 'Joined', value: formatDate(customer.joinedAt) },
                    ].map((card) => (
                      <div key={card.label} className="admin-panel" style={{ margin: 0, padding: 12 }}>
                        <div className="admin-muted" style={{ fontSize: 12 }}>{card.label}</div>
                        <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>{card.value}</div>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: 20,
                    }}
                  >
                    <div>
                      <h3 className="admin-panel-title">Details</h3>
                      <p style={{ margin: '4px 0' }}>Gender: {customer.gender || '—'}</p>
                      <p style={{ margin: '4px 0' }}>
                        Date of birth: {customer.dateOfBirth ? formatDate(customer.dateOfBirth) : '—'}
                      </p>
                      <p style={{ margin: '4px 0' }}>
                        Status: {customer.isBlocked ? 'Blocked' : 'Active'}
                      </p>
                    </div>

                    <div>
                      <h3 className="admin-panel-title">Saved addresses ({customer.addresses.length})</h3>
                      {customer.addresses.length === 0 ? (
                        <p className="admin-muted">No saved addresses.</p>
                      ) : (
                        customer.addresses.map((address) => (
                          <p key={address._id} style={{ margin: '4px 0', fontSize: 14 }}>
                            <strong>{address.name}</strong>
                            {address.isDefault ? ' (default)' : ''}, {address.addressLine}, {address.city},{' '}
                            {address.state} {address.postalCode}, {address.country}. Phone {address.phone}
                          </p>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 className="admin-panel-title" style={{ margin: 0 }}>Orders</h3>
                    <input
                      type="search"
                      className="admin-search"
                      placeholder="Search orders by number, product, status or payment"
                      aria-label="Search this customer's orders"
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      style={{ minWidth: 280 }}
                    />
                  </div>

                  {detail.orders.length === 0 ? (
                    <p className="admin-muted">This customer has not placed any orders.</p>
                  ) : visibleOrders.length === 0 ? (
                    <p className="admin-muted">No orders match "{orderSearch}".</p>
                  ) : (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Order</th>
                            <th>Date</th>
                            <th>Items</th>
                            <th>Payment</th>
                            <th>Status</th>
                            <th className="num">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleOrders.map((order) => (
                            <tr key={order._id}>
                              <td>{orderNumber(order._id)}</td>
                              <td>{formatDate(order.createdAt)}</td>
                              <td>
                                {(order.items || []).map((item, index) => (
                                  <div key={index}>
                                    {item.name} × {item.quantity}
                                    {item.color ? ` · ${item.color}` : ''}
                                    {item.size ? ` · ${item.size}` : ''}
                                  </div>
                                ))}
                              </td>
                              <td>{order.paymentMethod}</td>
                              <td>{statusLabel(order.orderStatus)}</td>
                              <td className="num">{formatCurrency(order.totalAmount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button
                      type="button"
                      className={`admin-button ${customer.isBlocked ? '' : 'admin-button-danger'}`}
                      disabled={busy}
                      onClick={toggleBlocked}
                    >
                      {customer.isBlocked ? 'Unblock customer' : 'Block customer'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminCustomers;
