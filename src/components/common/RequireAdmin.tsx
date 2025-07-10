import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface RequireAdminProps {
  children: React.ReactNode;
}

const RequireAdmin: React.FC<RequireAdminProps> = ({ children }) => {
  const { currentUser, isAdmin, loading } = useAuth();

  console.log('[RequireAdmin] Checking admin access - loading:', loading, 'currentUser:', currentUser?.email, 'isAdmin:', isAdmin);

  if (loading) {
    return <div>Loading...</div>;
  }

  // ログインしていない場合はログインページへ
  if (!currentUser) {
    console.log('[RequireAdmin] No user logged in, redirecting to login');
    return <Navigate to="/login" state={{ from: { pathname: '/admin' } }} replace />;
  }

  // 管理者でない場合はホームへ
  if (!isAdmin) {
    console.log('[RequireAdmin] User is not admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default RequireAdmin;