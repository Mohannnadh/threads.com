
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { getUserProfile } from '../services/userService.js';
import { sessionKeys, sessionScope } from '../utils/session.js';

const AuthContext = createContext(null);

const readSaved = (scope) => {
  const keys = sessionKeys(scope);
  const token = localStorage.getItem(keys.token);

  let user = null;

  try {
    const raw = localStorage.getItem(keys.user);
    user = raw ? JSON.parse(raw) : null;
  } catch {
    user = null;
  }

  return { token, user };
};

const getRoleFromToken = (token) => {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(atob(base64));
    return decoded.role || null;
  } catch {
    return null;
  }
};

const AuthProvider = ({ children }) => {
  const { pathname } = useLocation();
  const scope = sessionScope(pathname);

  // One saved session for the customer side and one for the admin side.
  const [sessions, setSessions] = useState(() => ({
    customer: readSaved('customer'),
    admin: readSaved('admin'),
  }));

  // False until the saved login has been checked with the server. Routes wait
  // for this, so a reload never redirects to the wrong sign-in page.
  const [sessionReady, setSessionReady] = useState(
    () => !sessions[scope].token
  );

  const { token, user } = sessions[scope];

  const updateSession = (target, patch) => {
    setSessions((current) => ({
      ...current,
      [target]: { ...current[target], ...patch },
    }));
  };

  const login = (newToken, newUser) => {
    if (!newToken) {
      console.error('Login failed: no token received.');
      return;
    }

    // The role in the token decides which side the session belongs to.
    const target = getRoleFromToken(newToken) === 'admin' ? 'admin' : 'customer';
    const keys = sessionKeys(target);
    const savedUser = newUser || (getRoleFromToken(newToken) ? { role: getRoleFromToken(newToken) } : null);

    localStorage.setItem(keys.token, newToken);

    if (savedUser) {
      localStorage.setItem(keys.user, JSON.stringify(savedUser));
    } else {
      localStorage.removeItem(keys.user);
    }

    updateSession(target, { token: newToken, user: savedUser });
  };

  const logout = () => {
    const keys = sessionKeys(scope);

    localStorage.removeItem(keys.token);
    localStorage.removeItem(keys.user);
    updateSession(scope, { token: null, user: null });
  };

  // Ask the server who the saved token belongs to. The stored user details can
  // be stale, so the server's answer wins.
  useEffect(() => {
    if (!token) {
      setSessionReady(true);
      return undefined;
    }

    let active = true;
    setSessionReady(false);

    getUserProfile()
      .then((data) => {
        if (!active || !data?.user) return;

        const verified = { ...data.user, role: getRoleFromToken(token) || data.user.role };

        localStorage.setItem(sessionKeys(scope).user, JSON.stringify(verified));
        updateSession(scope, { user: verified });
      })
      .catch((error) => {
        if (!active) return;

        // The token is no longer valid: sign out of this side only.
        if (error.status === 401 || error.status === 403) {
          localStorage.removeItem(sessionKeys(scope).token);
          localStorage.removeItem(sessionKeys(scope).user);
          updateSession(scope, { token: null, user: null });
        }
      })
      .finally(() => {
        if (active) setSessionReady(true);
      });

    return () => {
      active = false;
    };
  }, [token, scope]);

  const isAuthenticated = Boolean(token);

  // The role inside the signed token is the source of truth for this session.
  const role = (token && getRoleFromToken(token)) || user?.role || null;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        isAuthenticated,
        sessionReady,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
};

export { AuthProvider, useAuth };
