import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getOrdersPage,
  updateOrderStatus,
} from '../services/adminService.js';
import Pagination from '../components/Pagination.jsx';
import useDebouncedValue from '../hooks/useDebouncedValue.js';
import AdminLayout, {
  Notice,
  StatusPill,
} from '../components/AdminLayout.jsx';
import { Icon } from '../components/Icon.jsx';
import { setOrderShipping } from '../services/supportService.js';
import {
  ACTION_LABEL,
  STATUS_ORDER,
  availableActions,
  formatCurrency,
  formatDate,
  orderNumber,
  statusLabel,
} from '../utils/adminFormat.js';
import '../styles/admin.css';

// Courier and tracking details. Shown while an order is being packed or shipped.
const ShippingForm = ({ order, onSave }) => {
  const [courier, setCourier] = useState(order.shipping?.courier || '');
  const [trackingNumber, setTrackingNumber] = useState(order.shipping?.trackingNumber || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!trackingNumber.trim()) {
      setFormError('Enter a tracking number.');
      return;
    }

    setSaving(true);

    try {
      await onSave({
        courier: courier.trim(),
        trackingNumber: trackingNumber.trim(),
      });
    } catch (err) {
      setFormError(err.message || 'Could not save shipping details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="admin-form-grid" onSubmit={submit}>
      <label className="admin-field">
        <span>Courier</span>
        <input
          type="text"
          maxLength={80}
          value={courier}
          placeholder="e.g. Delhivery"
          onChange={(event) => setCourier(event.target.value)}
        />
      </label>

      <label className="admin-field">
        <span>Tracking number</span>
        <input
          type="text"
          maxLength={100}
          value={trackingNumber}
          onChange={(event) => setTrackingNumber(event.target.value)}
        />
      </label>

      {formError && (
        <p className="admin-field-full" role="alert" style={{ color: '#b00020', margin: 0 }}>
          {formError}
        </p>
      )}

      <div className="admin-form-actions admin-field-full">
        <button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={saving}
        >
          {saving ? 'Saving…' : 'Save shipping details'}
        </button>
      </div>
    </form>
  );
};

const PAGE_SIZE = 15;

const AdminOrders = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ ALL: 0 });
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [selectedId, setSelectedId] = useState(
    searchParams.get('open') || null
  );

  // Bumping this reloads the current page (after a status change).
  const [refreshKey, setRefreshKey] = useState(0);

  // Load one page of orders whenever the page, filter, search or refresh key changes.
  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    const load = async () => {
      try {
        const result = await getOrdersPage(token, {
          page,
          limit: PAGE_SIZE,
          status: statusFilter,
          search: debouncedSearch,
        });

        if (!active) return;

        // If the current page no longer exists, step back to the last page.
        if (result.orders.length === 0 && result.pagination.totalPages > 0 && page > result.pagination.totalPages) {
          setPage(result.pagination.totalPages);
          return;
        }

        setError('');
        setOrders(result.orders);
        setCounts(result.counts);
        setPagination(result.pagination);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load orders.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [token, page, statusFilter, debouncedSearch, refreshKey]);

  // Reload from an event handler (sets loading first).
  const reloadOrders = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  // Escape closes the detail drawer.
  useEffect(() => {
    if (!selectedId) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeDrawer();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
    // closeDrawer is stable for this purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const selectedOrder =
    orders.find((order) => order._id === selectedId) || null;

  const openOrder = (id) => {
    setSelectedId(id);
    setSearchParams(id ? { open: id } : {}, { replace: true });
  };

  function closeDrawer() {
    setSelectedId(null);
    setSearchParams({}, { replace: true });
  }

  const changeStatus = async (order, nextStatus) => {
    const confirmed =
      nextStatus !== 'CANCELLED' ||
      (await confirmDialog({
        title: 'Cancel order?',
        message: `Cancel order ${orderNumber(order._id)}? Its stock will be returned to inventory.`,
        confirmLabel: 'Cancel order',
        cancelLabel: 'Keep order',
        danger: true,
      }));

    if (!confirmed) return;

    try {
      setBusy(true);
      setError('');
      setNotice('');

      const updated = await updateOrderStatus(
        token,
        order._id,
        nextStatus
      );

      // Keep the populated customer details from the list.
      setOrders((previous) =>
        previous.map((item) =>
          item._id === order._id
            ? { ...item, ...updated, user: item.user }
            : item
        )
      );

      setNotice(
        `${orderNumber(order._id)} is now ${statusLabel(nextStatus).toLowerCase()}.`
      );

      // Refresh so the status counts and filtered list stay accurate.
      reloadOrders();
    } catch (err) {
      setError(err.message || 'Could not update this order.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Orders"
      subtitle={`${counts.ALL} ${
        counts.ALL === 1 ? 'order' : 'orders'
      } in total`}
    >
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}

      {notice && (
        <Notice onClose={() => setNotice('')}>{notice}</Notice>
      )}

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-tabs" role="group" aria-label="Filter by status">
            {['ALL', ...STATUS_ORDER].map((status) => (
              <button
                key={status}
                type="button"
                className={`admin-tab${
                  statusFilter === status ? ' active' : ''
                }`}
                aria-pressed={statusFilter === status}
                onClick={() => {
                  setLoading(true);
                  setPage(1);
                  setStatusFilter(status);
                }}
              >
                {status === 'ALL' ? 'All' : statusLabel(status)}
                <span className="admin-tab-count">
                  {counts[status] || 0}
                </span>
              </button>
            ))}
          </div>

          <input
            className="admin-search"
            type="search"
            placeholder="Search by order ID, e.g. #A1B2C3 (or name, email, phone)"
            value={search}
            onChange={(event) => {
              setLoading(true);
              setPage(1);
              setSearch(event.target.value);
            }}
            aria-label="Search orders by order ID"
          />
        </div>

        {loading ? (
          <p className="admin-empty">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="admin-empty">
            {counts.ALL === 0
              ? 'No orders have been placed yet.'
              : 'No orders match this filter. Try another status or clear the search.'}
          </p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const itemCount = (order.items || []).reduce(
                    (sum, item) => sum + (Number(item.quantity) || 0),
                    0
                  );

                  return (
                    <tr
                      key={order._id}
                      className="admin-row-clickable"
                      onClick={() => openOrder(order._id)}
                    >
                      <td>
                        <button
                          type="button"
                          className="admin-link-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openOrder(order._id);
                          }}
                        >
                          {orderNumber(order._id)}
                        </button>
                      </td>

                      <td>
                        {order.shippingAddress?.name ||
                          order.user?.name ||
                          '—'}
                        <small>{order.user?.email || 'Guest checkout'}</small>
                      </td>

                      <td>{formatDate(order.createdAt)}</td>

                      <td className="num">{itemCount}</td>

                      <td className="num">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      <td>
                        <div>
                          {order.paymentMethod === 'WALLET'
                            ? 'Wallet'
                            : order.paymentMethod === 'ONLINE'
                              ? 'Online'
                              : 'Cash on delivery'}
                        </div>
                        <small>{statusLabel(order.paymentStatus)}</small>
                      </td>

                      <td>
                        <StatusPill status={order.orderStatus} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <Pagination
            pagination={pagination}
            itemLabel="orders"
            onPageChange={(next) => {
              setLoading(true);
              setPage(next);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </section>

      {selectedOrder && (
        <div
          className="admin-drawer-overlay"
          onClick={closeDrawer}
        >
          <aside
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-drawer-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-drawer-header">
              <div>
                <h2
                  id="order-drawer-title"
                  className="admin-drawer-title"
                >
                  Order {orderNumber(selectedOrder._id)}
                </h2>
                <p className="admin-muted">
                  Placed {formatDate(selectedOrder.createdAt)}
                </p>
              </div>

              <button
                type="button"
                className="admin-icon-button"
                onClick={closeDrawer}
                aria-label="Close order details"
              >
                <Icon name="x" />
              </button>
            </div>

            <div className="admin-drawer-pills">
              <StatusPill status={selectedOrder.orderStatus} />
              <StatusPill status={selectedOrder.paymentStatus} />
            </div>

            <div className="admin-drawer-group">
              <h3>Next step</h3>

              {availableActions(selectedOrder).length === 0 ? (
                <p className="admin-muted">
                  No further steps for this order.
                </p>
              ) : (
                <div className="admin-actions-stack">
                  {availableActions(selectedOrder).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`admin-button admin-button-block${
                        status === 'CANCELLED'
                          ? ' admin-button-danger'
                          : ' admin-button-primary'
                      }`}
                      disabled={busy}
                      onClick={() => changeStatus(selectedOrder, status)}
                    >
                      {ACTION_LABEL[status]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {(selectedOrder.orderStatus === 'PROCESSING' ||
              selectedOrder.orderStatus === 'SHIPPED') && (
              <div className="admin-drawer-group">
                <h3>Shipping</h3>
                <ShippingForm
                  key={selectedOrder._id}
                  order={selectedOrder}
                  onSave={async (shipping) => {
                    await setOrderShipping(token, selectedOrder._id, shipping);
                    setNotice(`Shipping details saved for ${orderNumber(selectedOrder._id)}.`);
                    reloadOrders();
                  }}
                />
              </div>
            )}

            <div className="admin-drawer-group">
              <h3>Customer</h3>
              <dl className="admin-kv">
                <dt>Name</dt>
                <dd>
                  {selectedOrder.shippingAddress?.name ||
                    selectedOrder.user?.name ||
                    '—'}
                </dd>
                <dt>Email</dt>
                <dd>{selectedOrder.user?.email || '—'}</dd>
                <dt>Phone</dt>
                <dd>{selectedOrder.shippingAddress?.phone || '—'}</dd>
              </dl>
            </div>

            <div className="admin-drawer-group">
              <h3>Ship to</h3>
              <p style={{ margin: 0 }}>
                {[
                  selectedOrder.shippingAddress?.addressLine,
                  selectedOrder.shippingAddress?.city,
                  selectedOrder.shippingAddress?.state,
                  selectedOrder.shippingAddress?.postalCode,
                  selectedOrder.shippingAddress?.country,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No address on file'}
              </p>
            </div>

            <div className="admin-drawer-group">
              <h3>Items</h3>

              {selectedOrder.items?.length ? (
                <ul className="admin-order-lines">
                  {selectedOrder.items.map((item, index) => (
                    <li
                      className="admin-order-line"
                      key={`${item.name || 'item'}-${index}`}
                    >
                      <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                        {(() => {
                          const src =
                            item.image ||
                            (item.product && typeof item.product === 'object'
                              ? item.product.images?.[0]
                              : '') ||
                            '';

                          return src ? (
                            <img
                              src={src}
                              alt={item.name || 'Product'}
                              style={{
                                width: 56,
                                height: 70,
                                objectFit: 'cover',
                                flexShrink: 0,
                                border: '1px solid var(--adm-line)',
                                background: '#f3f1ed',
                              }}
                            />
                          ) : (
                            <div
                              aria-label="No image"
                              style={{
                                width: 56,
                                height: 70,
                                flexShrink: 0,
                                border: '1px solid var(--adm-line)',
                                background: '#f3f1ed',
                              }}
                            />
                          );
                        })()}

                        <div>
                          {item.name || 'Unnamed product'}
                          <small>
                            Qty {item.quantity ?? 0}
                            {item.size ? ` · Size ${item.size}` : ''}
                            {item.color ? ` · Color ${item.color}` : ''}
                            {' · '}
                            {formatCurrency(item.price)} each
                          </small>
                        </div>
                      </div>
                      <strong>
                        {formatCurrency(
                          (Number(item.price) || 0) *
                            (Number(item.quantity) || 0)
                        )}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="admin-muted">No items on this order.</p>
              )}

              <div className="admin-summary-total">
                <span>Total</span>
                <span>{formatCurrency(selectedOrder.totalAmount)}</span>
              </div>
              <dl className="admin-kv" style={{ marginTop: 12 }}>
                <dt>Subtotal</dt>
                <dd>{formatCurrency(selectedOrder.subtotal)}</dd>
                <dt>Shipping</dt>
                <dd>{formatCurrency(selectedOrder.shippingFee)}</dd>
                <dt>Payment</dt>
                <dd>
                  {selectedOrder.paymentMethod === 'WALLET'
                    ? 'Wallet'
                    : selectedOrder.paymentMethod === 'ONLINE'
                      ? 'Online (Razorpay)'
                      : 'Cash on delivery'}
                </dd>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminOrders;
