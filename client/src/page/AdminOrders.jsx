
import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAllOrders,
  updateOrderStatus,
} from '../services/adminService';
import '../styles/admin.css';

const ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const NEXT_STATUSES = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return 'N/A';

  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function AdminOrders() {
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        setError('');

        const result = await getAllOrders(token);
        setOrders(Array.isArray(result) ? result : []);
      } catch (err) {
        setError(err.message || 'Failed to load orders.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadOrders();
    } else {
      setLoading(false);
      setError('Please log in as an administrator.');
    }
  }, [token]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId);
      setError('');

      // Argument order must match adminService.js:
      // token, orderId, orderStatus
      const updatedOrder = await updateOrderStatus(
        token,
        orderId,
        newStatus
      );

      setOrders((previousOrders) =>
        previousOrders.map((order) =>
          order._id === orderId
            ? { ...order, ...updatedOrder }
            : order
        )
      );

      setSelectedOrder((previousOrder) =>
        previousOrder?._id === orderId
          ? { ...previousOrder, ...updatedOrder }
          : previousOrder
      );
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setUpdatingId(null);
    }
  };


  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      order.orderStatus === statusFilter;

    const searchText = search.trim().toLowerCase();

    const customerName =
      order.shippingAddress?.name ||
      order.user?.name ||
      '';

    const customerEmail = order.user?.email || '';

    const matchesSearch =
      !searchText ||
      order._id?.toLowerCase().includes(searchText) ||
      customerName.toLowerCase().includes(searchText) ||
      customerEmail.toLowerCase().includes(searchText) ||
      order.orderStatus?.toLowerCase().includes(searchText);

    return matchesStatus && matchesSearch;
  });

  return (
    <main className="admin-page">
      <div className="admin-container">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">THREADS.COM ADMIN</p>
            <h1>Order Management</h1>
            <p>View customer orders and manage their status.</p>
          </div>

          <NavLink to="/admin" className="admin-button">
            Back to Dashboard
          </NavLink>
        </header>

        {error && (
          <div className="admin-alert" role="alert">
            {error}
          </div>
        )}

        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>All Orders</h2>
              <p>
                {filteredOrders.length} order
                {filteredOrders.length === 1 ? '' : 's'} found
              </p>
            </div>
          </div>

          <div className="admin-filters">
            <input
              type="search"
              placeholder="Search order ID, customer or email..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search orders"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter orders by status"
            >
              <option value="ALL">All Statuses</option>

              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="admin-message">Loading orders...</p>
          ) : filteredOrders.length === 0 ? (
            <p className="admin-message">No orders found.</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const customerName =
                      order.shippingAddress?.name ||
                      order.user?.name ||
                      'N/A';

                    return (
                      <tr key={order._id}>
                        <td>
                          #{order._id.slice(-6).toUpperCase()}
                        </td>

                        <td>
                          <strong>{customerName}</strong>
                          <br />
                          <small>
                            {order.user?.email || 'N/A'}
                          </small>
                        </td>

                        <td>{formatDate(order.createdAt)}</td>

                        <td>
                          {order.items?.reduce(
                            (total, item) =>
                              total + (Number(item.quantity) || 0),
                            0
                          ) || 0}
                        </td>

                        <td>{formatCurrency(order.totalAmount)}</td>

                        <td>
                          <div>{order.paymentMethod || 'N/A'}</div>
                          <small>
                            {order.paymentStatus || 'N/A'}
                          </small>
                        </td>

                        <td>
                          <select
                            value={order.orderStatus}
                            onChange={(event) =>
                              handleStatusChange(
                                order._id,
                                event.target.value
                              )
                            }
                            disabled={updatingId === order._id}
                            aria-label={`Update order ${order._id} status`}
                          >
                            <option value={order.orderStatus}>
                              {order.orderStatus}
                            </option>

                            {(
                              NEXT_STATUSES[order.orderStatus] || []
                            ).map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>

                          {updatingId === order._id && (
                            <small>Updating...</small>
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="admin-button"
                            onClick={() => setSelectedOrder(order)}
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedOrder && (
          <div
            className="admin-modal-overlay"
            onClick={() => setSelectedOrder(null)}
          >
            <section
              className="admin-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-details-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="admin-panel-header">
                <div>
                  <p className="admin-eyebrow">ORDER DETAILS</p>
                  <h2 id="order-details-title">
                    #{selectedOrder._id.slice(-6).toUpperCase()}
                  </h2>
                </div>

                <button
                  type="button"
                  className="admin-button"
                  onClick={() => setSelectedOrder(null)}
                >
                  Close
                </button>
              </div>

              <h3>Customer</h3>
              <p>
                <strong>Name:</strong>{' '}
                {selectedOrder.shippingAddress?.name ||
                  selectedOrder.user?.name ||
                  'N/A'}
              </p>
              <p>
                <strong>Email:</strong>{' '}
                {selectedOrder.user?.email || 'N/A'}
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                {selectedOrder.shippingAddress?.phone || 'N/A'}
              </p>

              <h3>Shipping Address</h3>
              <p>
                {[
                  selectedOrder.shippingAddress?.addressLine,
                  selectedOrder.shippingAddress?.city,
                  selectedOrder.shippingAddress?.state,
                  selectedOrder.shippingAddress?.postalCode,
                  selectedOrder.shippingAddress?.country,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No address available'}
              </p>

              <h3>Items</h3>

              {selectedOrder.items?.length ? (
                selectedOrder.items.map((item, index) => (
                  <div
                    className="admin-order-item"
                    key={`${item.product || item.name}-${index}`}
                  >
                    <strong>{item.name || 'Unnamed product'}</strong>

                    <p>
                      Quantity: {item.quantity ?? 0}
                    </p>
                    <p>Size: {item.size || 'N/A'}</p>
                    <p>Color: {item.color || 'N/A'}</p>
                    <p>Unit price: {formatCurrency(item.price)}</p>
                    <p>
                      Item total:{' '}
                      {formatCurrency(
                        (Number(item.price) || 0) *
                        (Number(item.quantity) || 0)
                      )}
                    </p>
                  </div>
                ))
              ) : (
                <p>No items available.</p>
              )}

              <h3>Payment and Status</h3>
              <p>
                <strong>Payment method:</strong>{' '}
                {selectedOrder.paymentMethod || 'N/A'}
              </p>
              <p>
                <strong>Payment status:</strong>{' '}
                {selectedOrder.paymentStatus || 'N/A'}
              </p>
              <p>
                <strong>Order status:</strong>{' '}
                {selectedOrder.orderStatus || 'N/A'}
              </p>
              <p>
                <strong>Subtotal:</strong>{' '}
                {formatCurrency(selectedOrder.subtotal)}
              </p>
              <p>
                <strong>Shipping fee:</strong>{' '}
                {formatCurrency(selectedOrder.shippingFee)}
              </p>
              <p>
                <strong>Total:</strong>{' '}
                {formatCurrency(selectedOrder.totalAmount)}
              </p>
              <p>
                <strong>Placed:</strong>{' '}
                {formatDate(selectedOrder.createdAt)}
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminOrders;
