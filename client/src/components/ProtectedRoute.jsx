import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Customer routes send visitors to /login. Admin routes pass
// redirectTo="/admin/login" so staff land on the admin sign-in page.
const ProtectedRoute = ({
  children,
  allowedRoles,
  redirectTo = '/login',
}) => {
  const { isAuthenticated, role, sessionReady } = useAuth();

  // Wait for the saved login to be checked before deciding where to send the visitor.
  if (!sessionReady) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default ProtectedRoute;
