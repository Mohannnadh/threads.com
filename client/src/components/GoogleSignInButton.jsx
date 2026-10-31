import { useEffect, useRef } from 'react';
import { GOOGLE_CLIENT_ID } from '../config.js';

const GOOGLE_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

let googleScriptPromise;
let googleInitialized = false;
let activeCredentialHandler = null;

const loadGoogleIdentityServices = () => {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      let script = document.querySelector(`script[src="${GOOGLE_SCRIPT_URL}"]`);

      if (!script) {
        script = document.createElement('script');
        script.src = GOOGLE_SCRIPT_URL;
        script.async = true;
        script.defer = true;
      }

      script.addEventListener('load', () => resolve(window.google), {
        once: true,
      });
      script.addEventListener(
        'error',
        () => reject(new Error('Google sign-in could not be loaded.')),
        { once: true }
      );

      if (!script.isConnected) {
        document.head.appendChild(script);
      }
    }).catch((error) => {
      googleScriptPromise = null;
      throw error;
    });
  }

  return googleScriptPromise;
};

const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const onCredentialRef = useRef(onCredential);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let active = true;
    const buttonElement = buttonRef.current;
    const handleCredential = (credential) => onCredentialRef.current(credential);
    activeCredentialHandler = handleCredential;

    if (!GOOGLE_CLIENT_ID) {
      return undefined;
    }

    loadGoogleIdentityServices()
      .then((google) => {
        if (!active || !buttonElement) return;

        if (!googleInitialized) {
          google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            auto_select: false,
            button_auto_select: false,
            use_fedcm_for_button: true,
            callback: (response) => {
              if (response.credential) {
                activeCredentialHandler?.(response.credential);
              }
            },
          });
          googleInitialized = true;
        }

        google.accounts.id.renderButton(buttonElement, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(buttonElement.clientWidth, 400), 
          width:'199',
        });
      })
      .catch((error) => {
        if (active) onCredentialRef.current(null, error);
      });

    return () => {
      active = false;
      if (activeCredentialHandler === handleCredential) {
        activeCredentialHandler = null;
      }
      buttonElement?.replaceChildren();
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="auth-message auth-error" role="alert">
        Google sign-in is not configured.
      </p>
    );
  }

  return (
    <div
      className={`google-auth-button${disabled ? ' is-disabled' : ''}`}
      ref={buttonRef}
      aria-busy={disabled}
      inert={disabled}
    />
  );
};

export default GoogleSignInButton;
