// Shared formatting and status vocabulary for the admin panel.

export const STATUS_ORDER = [
  'PLACED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

// Which status changes an admin may make from each status.
// Mirrors the transitions enforced by the server.
export const NEXT_STATUSES = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// Button labels describe the action, not the resulting state.
export const ACTION_LABEL = {
  CONFIRMED: 'Confirm order',
  PROCESSING: 'Start processing',
  SHIPPED: 'Mark as shipped',
  DELIVERED: 'Mark as delivered',
  CANCELLED: 'Cancel order',
};

// Colour family for each status or payment state.
export const STATUS_TONE = {
  PLACED: 'info',
  CONFIRMED: 'info',
  PROCESSING: 'progress',
  SHIPPED: 'progress',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
  PAID: 'success',
  PENDING: 'warning',
  FAILED: 'danger',
};

export const statusLabel = (value) => {
  if (!value) return '—';

  const text = String(value).replaceAll('_', ' ').toLowerCase();

  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

export const formatDate = (date) => {
  if (!date) return '—';

  return new Date(date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

// Short, readable order reference, e.g. "#A1B2C3".
export const orderNumber = (id) =>
  `#${String(id || '').slice(-6).toUpperCase()}`;

// Statuses that can be chosen next, after server-side rules are applied.
export const availableActions = (order) => {
  const options = NEXT_STATUSES[order.orderStatus] || [];

  // Paid online orders cannot be cancelled through the admin action.
  if (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'PAID') {
    return options.filter((status) => status !== 'CANCELLED');
  }

  return options;
};
