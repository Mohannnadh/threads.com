
import {
  createContext,
  useContext,
  useState,
} from 'react';

const AuthContext = createContext(null);

const getStoredUser = () => {
  try {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
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
  const [token, setToken] = useState(
    () => localStorage.getItem('token')
  );

  const [user, setUser] = useState(getStoredUser);

  const login = (newToken, newUser) => {
    if (!newToken) {
      console.error('Login failed: no token received.');
      return;
    }

    localStorage.setItem('token', newToken);
    setToken(newToken);

    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
      setUser(newUser);
    } else {
      const role = getRoleFromToken(newToken);
      const fallbackUser = role ? { role } : null;

      if (fallbackUser) {
        localStorage.setItem('user', JSON.stringify(fallbackUser));
      } else {
        localStorage.removeItem('user');
      }

      setUser(fallbackUser);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = Boolean(token);
  const role = user?.role || getRoleFromToken(token);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        role,
        isAuthenticated,
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
