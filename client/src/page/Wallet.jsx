import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getWallet,
  createTopUpOrder,
  verifyTopUp,
} from '../services/walletService.js';
import Pagination from '../components/Pagination.jsx';
import { loadRazorpayScript, formatPaise } from '../utils/razorpay.js';
import '../styles/wallet.css';

const PRESET_AMOUNTS = [500, 1000, 2000, 5000];
const MIN_TOPUP = 100;
const MAX_TOPUP = 50000;

const formatDate = (value) =>
  new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const describe = (transaction) => {
  const shortRef = String(transaction.reference || '')
    .slice(-6)
    .toUpperCase();

  switch (transaction.source) {
    case 'TOPUP':
      return 'Money added';
    case 'ORDER_PAYMENT':
      return `Paid for order #${shortRef}`;
    case 'REFUND':
      return `Refund for order #${shortRef}`;
    default:
      return 'Wallet activity';
  }
};

const Wallet = () => {
  const { token } = useAuth();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [amountInput, setAmountInput] = useState('500');
  const [topUpError, setTopUpError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadWallet = useCallback(
    async (targetPage) => {
      setLoading(true);
      setLoadError('');

      try {
        const data = await getWallet(token, targetPage);

        setBalance(data.balance);
        setTransactions(data.transactions || []);
        setPagination(data.pagination);
      } catch (err) {
        setLoadError(err.message || 'Could not load your wallet.');
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadWallet(page);
  }, [loadWallet, page]);

  const parsedAmount = Number(amountInput);
  const amountIsValid =
    Number.isInteger(parsedAmount) &&
    parsedAmount >= MIN_TOPUP &&
    parsedAmount <= MAX_TOPUP;

  const handleAddMoney = async (event) => {
    event.preventDefault();
    setTopUpError('');
    setNotice('');

    if (!amountIsValid) {
      setTopUpError(
        `Enter a whole amount between ₹${MIN_TOPUP} and ₹${MAX_TOPUP}.`
      );
      return;
    }

    setBusy(true);

    try {
      const ready = await loadRazorpayScript();

      if (!ready || !window.Razorpay) {
        throw new Error('Razorpay could not be loaded. Please try again.');
      }

      const { razorpayOrder, keyId } = await createTopUpOrder(
        token,
        parsedAmount
      );

      const checkout = new window.Razorpay({
        key: keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        order_id: razorpayOrder.id,
        name: 'THREADS.COM',
        description: 'Add money to wallet',
        theme: { color: '#111111' },

        handler: async (response) => {
          try {
            const result = await verifyTopUp(token, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setNotice(
              result.message || `${formatPaise(razorpayOrder.amount)} added to your wallet.`
            );

            setPage(1);
            await loadWallet(1);
          } catch (err) {
            setTopUpError(
              err.message ||
                'We could not confirm the payment. Check your wallet shortly or contact support.'
            );
          } finally {
            setBusy(false);
          }
        },

        modal: {
          ondismiss: () => setBusy(false),
        },
      });

      checkout.on('payment.failed', (response) => {
        setTopUpError(
          response.error?.description || 'Payment failed. Please try again.'
        );
        setBusy(false);
      });

      checkout.open();
    } catch (err) {
      setTopUpError(err.message || 'Could not start the top-up.');
      setBusy(false);
    }
  };

  return (
    <div className="wallet-page">
      <header className="wallet-header">
        <h1>Wallet</h1>
        <p>Add money once and use it at checkout. Cancelled wallet orders are refunded here.</p>
      </header>

      <section className="wallet-balance" aria-live="polite">
        <span className="wallet-balance-label">Available balance</span>
        <strong className="wallet-balance-value">
          {loading && !pagination ? '…' : formatPaise(balance)}
        </strong>
        <Link to="/products" className="wallet-balance-link">
          Continue shopping
        </Link>
      </section>

      <section className="wallet-card" aria-labelledby="wallet-add-title">
        <h2 id="wallet-add-title">Add money</h2>

        <div className="wallet-presets" role="group" aria-label="Quick amounts">
          {PRESET_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              className={`wallet-chip${
                Number(amountInput) === amount ? ' is-selected' : ''
              }`}
              aria-pressed={Number(amountInput) === amount}
              onClick={() => setAmountInput(String(amount))}
              disabled={busy}
            >
              ₹{amount.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        <form className="wallet-topup" onSubmit={handleAddMoney}>
          <label htmlFor="wallet-amount">Amount (₹)</label>
          <div className="wallet-topup-row">
            <input
              id="wallet-amount"
              type="number"
              inputMode="numeric"
              min={MIN_TOPUP}
              max={MAX_TOPUP}
              step={1}
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              disabled={busy}
            />
            <button
              type="submit"
              className="wallet-primary"
              disabled={busy || !amountIsValid}
            >
              {busy ? 'Opening payment…' : `Add ₹${amountIsValid ? parsedAmount.toLocaleString('en-IN') : '—'}`}
            </button>
          </div>

          <p className="wallet-hint">
            Between ₹{MIN_TOPUP} and ₹{MAX_TOPUP.toLocaleString('en-IN')} per top-up. Whole rupees only.
          </p>

          {topUpError && (
            <p className="wallet-message wallet-error" role="alert">
              {topUpError}
            </p>
          )}
          {notice && (
            <p className="wallet-message wallet-success" role="status">
              {notice}
            </p>
          )}
        </form>
      </section>

      <section className="wallet-card" aria-labelledby="wallet-history-title">
        <h2 id="wallet-history-title">Transactions</h2>

        {loadError && (
          <p className="wallet-message wallet-error" role="alert">
            {loadError}{' '}
            <button
              type="button"
              className="wallet-text-button"
              onClick={() => loadWallet(page)}
            >
              Try again
            </button>
          </p>
        )}

        {!loadError && !loading && transactions.length === 0 && (
          <p className="wallet-empty">
            No transactions yet. Add money to get started.
          </p>
        )}

        {transactions.length > 0 && (
          <ul className="wallet-list">
            {transactions.map((transaction) => {
              const isCredit = transaction.type === 'CREDIT';

              return (
                <li key={transaction._id} className="wallet-row">
                  <div>
                    <strong>{describe(transaction)}</strong>
                    <span>{formatDate(transaction.createdAt)}</span>
                  </div>

                  <div className="wallet-row-amount">
                    <strong className={isCredit ? 'is-credit' : 'is-debit'}>
                      {isCredit ? '+' : '−'}
                      {formatPaise(transaction.amount)}
                    </strong>
                    <span>Balance {formatPaise(transaction.balanceAfter)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <Pagination
          pagination={pagination}
          onPageChange={setPage}
          itemLabel="transactions"
          disabled={loading}
        />
      </section>
    </div>
  );
};

export default Wallet;
