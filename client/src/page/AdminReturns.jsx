import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getAdminReturns,
  updateReturnStatus,
} from '../services/supportService.js';
import Pagination from '../components/Pagination.jsx';
import AdminLayout, { Notice } from '../components/AdminLayout.jsx';
import { orderNumber } from '../utils/adminFormat.js';
import '../styles/admin.css';

const PAGE_SIZE = 15;

const FILTERS = [
  'ALL',
  'REQUESTED',
  'APPROVED',
  'PICKED_UP',
  'REFUNDED',
  'COMPLETED',
  'REJECTED',
];

const LABEL = {
  REQUESTED: 'Requested',
  APPROVED: 'Approved',
  PICKED_UP: 'Picked up',
  REFUNDED: 'Refunded',
  COMPLETED: 'Exchange completed',
  REJECTED: 'Rejected',
};

const TONE = {
  REQUESTED: 'warning',
  APPROVED: 'info',
  PICKED_UP: 'info',
  REFUNDED: 'success',
  COMPLETED: 'success',
  REJECTED: 'danger',
};

// The actions an admin can take from each status.
const NEXT_ACTIONS = {
  REQUESTED: [
    { status: 'APPROVED', label: 'Approve' },
    { status: 'REJECTED', label: 'Reject', danger: true },
  ],
  APPROVED: [{ status: 'PICKED_UP', label: 'Mark picked up' }],
  PICKED_UP: [{ status: 'RECEIVED', label: 'Mark received' }],
};

const formatRupees = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDay = (value) =>
  new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const AdminReturns = () => {
  const { token } = useAuth();

  const [status, setStatus] = useState('REQUESTED');
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) return undefined;

    let active = true;

    getAdminReturns(token, { status, page, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setError('');
        setRequests(result.requests);
        setPagination(result.pagination);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load return requests.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, status, page, refreshKey]);

  const act = async (request, nextStatus, label) => {
    let note;

    if (nextStatus === 'REJECTED') {
      note = window.prompt('Reason for rejecting this request (the customer will see it):', '');

      if (note === null) return;

      if (!note.trim()) {
        setError('Add a short reason before rejecting.');
        return;
      }
    }

    setBusyId(request._id);
    setError('');
    setNotice('');

    try {
      await updateReturnStatus(token, request._id, nextStatus, note);
      setNotice(`${label}: ${request.productName} (${orderNumber(request.order)}).`);
      setLoading(true);
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || 'Could not update this request.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <AdminLayout
      title="Returns"
      subtitle="Return and exchange requests from customers"
    >
      {error && (
        <Notice tone="error" onClose={() => setError('')}>
          {error}
        </Notice>
      )}

      {notice && <Notice onClose={() => setNotice('')}>{notice}</Notice>}

      <section className="admin-panel">
        <div className="admin-toolbar">
          <div className="admin-tabs" role="group" aria-label="Filter by status">
            {FILTERS.map((item) => (
              <button
                key={item}
                type="button"
                className={`admin-tab${status === item ? ' active' : ''}`}
                aria-pressed={status === item}
                onClick={() => {
                  setLoading(true);
                  setPage(1);
                  setStatus(item);
                }}
              >
                {item === 'ALL' ? 'All' : LABEL[item]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="admin-empty">Loading requests…</p>
        ) : requests.length === 0 ? (
          <p className="admin-empty">No requests match this filter.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Item</th>
                  <th>Request</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {requests.map((request) => {
                  const actions = NEXT_ACTIONS[request.status] || [];

                  return (
                    <tr key={request._id}>
                      <td>
                        <strong>{orderNumber(request.order)}</strong>
                        <div className="admin-muted">{formatDay(request.createdAt)}</div>
                      </td>

                      <td>
                        {request.user?.name || '—'}
                        <div className="admin-muted">{request.user?.email || ''}</div>
                      </td>

                      <td>
                        <span className="admin-product-name">{request.productName}</span>
                        <div className="admin-muted">
                          Qty {request.quantity}
                          {request.size ? ` · ${request.size}` : ''}
                          {request.color ? ` · ${request.color}` : ''}
                        </div>
                      </td>

                      <td>
                        {request.type === 'EXCHANGE'
                          ? `Exchange to ${request.exchangeSize}`
                          : 'Return for wallet refund'}
                        {request.status === 'REFUNDED' && (
                          <div className="admin-muted">
                            Refunded {formatRupees(request.refundAmountPaise / 100)}
                          </div>
                        )}
                      </td>

                      <td style={{ maxWidth: 260 }}>
                        <span className="admin-muted">{request.reason}</span>
                        {request.adminNote && (
                          <div className="admin-muted">Note: {request.adminNote}</div>
                        )}
                      </td>

                      <td>
                        <span className={`admin-pill admin-pill-${TONE[request.status] || 'neutral'}`}>
                          {LABEL[request.status] || request.status}
                        </span>
                      </td>

                      <td>
                        <div className="admin-row-actions">
                          {actions.map((action) => (
                            <button
                              key={action.status}
                              type="button"
                              className={`admin-button ${
                                action.danger ? 'admin-button-danger' : 'admin-button-primary'
                              }`}
                              disabled={busyId === request._id}
                              onClick={() => act(request, action.status, action.label)}
                            >
                              {action.label}
                            </button>
                          ))}
                          {actions.length === 0 && <span className="admin-muted">—</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <Pagination
            pagination={pagination}
            itemLabel="requests"
            onPageChange={(next) => {
              setLoading(true);
              setPage(next);
            }}
          />
        )}
      </section>
    </AdminLayout>
  );
};

export default AdminReturns;
