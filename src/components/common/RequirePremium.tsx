// src/components/common/RequirePremium.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';

interface RequirePremiumProps {
  children: React.ReactNode;
  fallback?: React.ReactNode; // Optional custom fallback UI
}

const RequirePremium: React.FC<RequirePremiumProps> = ({ children, fallback }) => {
  const { currentUser, isAdmin, isPremium, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Allow admins and premium members
  if (isAdmin || isPremium) {
    return <>{children}</>;
  }

  // If custom fallback is provided, use it
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback UI with premium upgrade message
  return (
    <Paper 
      elevation={3} 
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        maxWidth: 500,
        mx: 'auto',
        my: 4
      }}
    >
      <LockIcon color="primary" sx={{ fontSize: 48 }} />
      
      <Typography variant="h5" align="center">
        プレミアム会員限定機能
      </Typography>
      
      <Typography variant="body1" align="center">
        この機能を利用するには、プレミアム会員へのアップグレードが必要です。
      </Typography>
      
      <Alert severity="info" sx={{ width: '100%' }}>
        プレミアム会員になると、データエクスポート機能や広告なしの閲覧など、様々な特典をご利用いただけます。
      </Alert>
      
      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="primary" 
          href={`/membership?redirect=${encodeURIComponent(location.pathname)}`}
        >
          会員プランを見る
        </Button>
        
        {!currentUser && (
          <Button 
            variant="outlined" 
            href={`/login?redirect=${encodeURIComponent(location.pathname)}`}
          >
            ログイン
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default RequirePremium;