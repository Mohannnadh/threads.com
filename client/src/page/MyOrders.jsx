import { confirmDialog, notifyDialog } from '../components/Dialog.jsx';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getMyOrdersPage } from '../services/orderService.js';
import {
  getMyReviews,
  getMyReturns,
  viewInvoice,
  deleteReview,
} from '../services/supportService.js';
import Pagination from '../components/Pagination.jsx';
import OrderTracker from '../components/OrderTracker.jsx';
import ReviewForm from '../components/ReviewForm.jsx';
import ReturnForm from '../components/ReturnForm.jsx';
import '../styles/orders.css';

const PAGE_SIZE = 10;
const RETURN_WINDOW_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

const RETURN_LABEL = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PICKED_UP: 'Picked up',
  REFUNDED: 'Refunded to wallet',
  COMPLETED: 'Exchange completed',
};

const PAYMENT_LABEL = {
  WALLET: 'Wallet',
  ONLINE: 'Online',
  COD: 'Cash on delivery',
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const formatRupees = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

// Lookup keys used for the review and return maps.
const keyOf = (...parts) => parts.map(String).join(':');

const MyOrders = () => {
  const { token } = useAuth();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Reviews keyed by orderId:productId, return requests by orderId:itemIndex.
  const [reviews, setReviews] = useState({});
  const [returns, setReturns] = useState({});

  // Which inline form is open, e.g. "review:<orderId>:<index>".
  const [openForm, setOpenForm] = useState('');
  const [invoiceBusy, setInvoiceBusy] = useState('');
  const [actionError, setActionError] = useState('');

  // Loads the requested page of orders whenever the page or login changes.
  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    const loadOrders = async () => {
      try {
        const result = await getMyOrdersPage(token, { page, limit: PAGE_SIZE });

        if (!active) return;

        // If the current page no longer exists, step back to the last page.
        if (
          result.orders.length === 0 &&
          result.pagination.totalPages > 0 &&
          page > result.pagination.totalPages
        ) {
          setPage(result.pagination.totalPages);
          return;
        }

        setError('');
        setOrders(result.orders);
        setPagination(result.pagination);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load your orders.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadOrders();

    return () => {
      active = false;
    };
  }, [token, page]);

  // Reviews and returns are secondary: if they fail, the page still works.
  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    Promise.all([getMyReviews(token), getMyReturns(token)])
      .then(([reviewData, returnData]) => {
        if (!active) return;

        setReviews(
          Object.fromEntries(
            (reviewData.reviews || []).map((review) => [
              keyOf(review.order, review.product),
              review,
            ])
          )
        );

        setReturns(
          Object.fromEntries(
            (returnData.requests || []).map((request) => [
              keyOf(request.order, request.itemIndex),
              request,
            ])
          )
        );
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [token]);

  const handleInvoice = async (orderId) => {
    setActionError('');
    setInvoiceBusy(orderId);

    // Open the tab now, so the browser does not block it after the request.
    const tab = window.open('', '_blank');

    try {
      await viewInvoice(token, orderId, tab);
    } catch (err) {
      tab?.close();
      setActionError(err.message);
    } finally {
      setInvoiceBusy('');
    }
  };

  const handleDeleteReview = async (orderId, productId, review) => {
    if (!(await confirmDialog({ message: 'Delete your review? This cannot be undone.', confirmLabel: 'Delete', danger: true }))) return;

    setActionError('');

    try {
      await deleteReview(token, review._id);
      setReviews((current) => {
        const next = { ...current };
        delete next[keyOf(orderId, productId)];
        return next;
      });
    } catch (err) {
      setActionError(err.message);
    }
  };

  const toggleForm = (name) => setOpenForm((current) => (current === name ? '' : name));

  if (loading) {
    return <main className="ord-page">Loading your orders...</main>;
  }

  return (
    <main className="ord-page">
      <p className="ord-eyebrow">YOUR ACCOUNT / ORDER HISTORY</p>
      <h1 className="ord-title">MY ORDERS</h1>

      {error && (
        <p role="alert" className="ord-error">
          {error}
        </p>
      )}

      {actionError && (
        <p role="alert" className="ord-error">
          {actionError}
        </p>
      )}

      {!error && orders.length === 0 && (
        <section className="ord-empty">
          <h2>No orders yet.</h2>
          <p>Your orders will appear here after checkout.</p>
          <Link to="/products">Explore products</Link>
        </section>
      )}

      {orders.map((order) => {
        const delivered = order.orderStatus === 'DELIVERED';
        const windowEnds = order.deliveredAt
          ? new Date(new Date(order.deliveredAt).getTime() + RETURN_WINDOW_DAYS * DAY_MS)
          : null;
        const withinWindow = Boolean(windowEnds) && Date.now() <= windowEnds.getTime();

        return (
          <article key={order._id} className="ord-card">
            <header className="ord-head">
              <div>
                <span className="ord-label">Order placed</span>
                <span>{formatDate(order.createdAt)}</span>
              </div>
              <div>
                <span className="ord-label">Order number</span>
                <span>#{String(order._id).slice(-6).toUpperCase()}</span>
              </div>
              <div>
                <span className="ord-label">Total</span>
                <span>{formatRupees(order.totalAmount)}</span>
              </div>
              <div>
                <span className="ord-label">Status</span>
                <span className="ord-status">{order.orderStatus}</span>
              </div>
            </header>

            <OrderTracker order={order} />

            <ul className="ord-items">
              {order.items.map((item, index) => {
                const review = reviews[keyOf(order._id, item.product)];
                const request = returns[keyOf(order._id, index)];
                const canReview = delivered && !review;
                const canReturn = delivered && withinWindow && !request;
                const reviewOpen = openForm === `review:${order._id}:${index}`;
                const returnOpen = openForm === `return:${order._id}:${index}`;

                return (
                  <li key={`${item.product}-${index}`} className="ord-item">
                    <div className="ord-item-main">
                      <span className="ord-item-name">{item.name}</span>
                      <span className="ord-item-meta">
                        Qty {item.quantity}
                        {item.size ? ` · Size ${item.size}` : ''}
                        {item.color ? ` · ${item.color}` : ''}
                      </span>
                    </div>

                    <span className="ord-item-price">
                      {formatRupees(Number(item.price) * Number(item.quantity))}
                    </span>

                    <div className="ord-item-actions">
                      {review && (
                        <>
                          <span className="ord-tag">Reviewed · {review.rating}★</span>
                          {!reviewOpen && (
                            <button
                              type="button"
                              className="ord-btn"
                              onClick={() => toggleForm(`review:${order._id}:${index}`)}
                            >
                              Edit review
                            </button>
                          )}
                          {!reviewOpen && (
                            <button
                              type="button"
                              className="ord-btn"
                              onClick={() => handleDeleteReview(order._id, item.product, review)}
                            >
                              Delete review
                            </button>
                          )}
                        </>
                      )}

                      {request && (
                        <span className="ord-tag">
                          {request.type === 'EXCHANGE' ? 'Exchange' : 'Return'} ·{' '}
                          {RETURN_LABEL[request.status] || request.status}
                        </span>
                      )}

                      {canReview && !reviewOpen && (
                        <button
                          type="button"
                          className="ord-btn"
                          onClick={() => toggleForm(`review:${order._id}:${index}`)}
                        >
                          Write a review
                        </button>
                      )}

                      {canReturn && !returnOpen && (
                        <button
                          type="button"
                          className="ord-btn"
                          onClick={() => toggleForm(`return:${order._id}:${index}`)}
                        >
                          Return or exchange
                        </button>
                      )}
                    </div>

                    {reviewOpen && (
                      <ReviewForm
                        token={token}
                        orderId={order._id}
                        productId={item.product}
                        productName={item.name}
                        review={review}
                        onCancel={() => setOpenForm('')}
                        onSaved={(saved) => {
                          setReviews((current) => ({
                            ...current,
                            [keyOf(order._id, item.product)]: saved,
                          }));
                          setOpenForm('');
                        }}
                      />
                    )}

                    {returnOpen && (
                      <ReturnForm
                        token={token}
                        order={order}
                        itemIndex={index}
                        item={item}
                        windowEnds={windowEnds}
                        onCancel={() => setOpenForm('')}
                        onSaved={(saved) => {
                          setReturns((current) => ({
                            ...current,
                            [keyOf(order._id, index)]: saved,
                          }));
                          setOpenForm('');
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            <footer className="ord-foot">
              <span className="ord-muted">
                Payment: {PAYMENT_LABEL[order.paymentMethod] || 'Cash on delivery'} ·{' '}
                {order.paymentStatus}
              </span>

              {order.orderStatus !== 'CANCELLED' && (
                <button
                  type="button"
                  className="ord-btn"
                  onClick={() => handleInvoice(order._id)}
                  disabled={invoiceBusy === order._id}
                >
                  {invoiceBusy === order._id ? 'Opening…' : 'View invoice'}
                </button>
              )}
            </footer>
          </article>
        );
      })}

      <Pagination
        pagination={pagination}
        itemLabel="orders"
        onPageChange={(next) => {
          setLoading(true);
          setOpenForm('');
          setPage(next);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </main>
  );
};

export default MyOrders;
