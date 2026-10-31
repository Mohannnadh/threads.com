import { useEffect, useState } from 'react';

// Popup dialogs used in place of the browser's confirm and alert boxes.
// Any file can call confirmDialog() or notifyDialog(); DialogProvider shows them.

let requester = null;

// Asks a yes/no question. Resolves true for Confirm, false for Cancel or Escape.
export const confirmDialog = ({
  title = 'Please confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
}) => {
  if (!requester) return Promise.resolve(window.confirm(message));

  return requester({ kind: 'confirm', title, message, confirmLabel, cancelLabel, danger });
};

// Shows a message with an OK button.
export const notifyDialog = (message, title = 'Notice') => {
  if (!requester) {
    window.alert(message);
    return Promise.resolve();
  }

  return requester({ kind: 'notice', title, message });
};

export const DialogProvider = ({ children }) => {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    requester = (next) =>
      new Promise((resolve) => {
        setRequest((previous) => {
          // A new popup replaces an open one, which counts as cancelled.
          previous?.resolve(false);
          return { ...next, resolve };
        });
      });

    return () => {
      requester = null;
    };
  }, []);

  const close = (answer) => {
    if (!request) return;

    request.resolve(answer);
    setRequest(null);
  };

  useEffect(() => {
    if (!request) return undefined;

    const onKey = (event) => {
      if (event.key === 'Escape') close(false);
      if (event.key === 'Enter') close(request.kind === 'notice' ? true : true);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request]);

  return (
    <>
      {children}

      {request && (
        <div
          role="presentation"
          onClick={() => close(request.kind === 'notice' ? true : false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 2000,
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            aria-describedby="dialog-message"
            onClick={(event) => event.stopPropagation()}
            style={{
              background: '#fff',
              color: '#111',
              width: '100%',
              maxWidth: 420,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              fontFamily: 'inherit',
            }}
          >
            <h2 id="dialog-title" style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 600 }}>
              {request.title}
            </h2>
            <p id="dialog-message" style={{ margin: '0 0 22px', fontSize: 14, lineHeight: 1.5, color: '#333' }}>
              {request.message}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {request.kind === 'confirm' && (
                <button
                  type="button"
                  onClick={() => close(false)}
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #111',
                    background: '#fff',
                    color: '#111',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  {request.cancelLabel}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                style={{
                  padding: '10px 18px',
                  border: '1px solid',
                  borderColor: request.danger ? '#b42318' : '#111',
                  background: request.danger ? '#b42318' : '#111',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                {request.kind === 'notice' ? 'OK' : request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
