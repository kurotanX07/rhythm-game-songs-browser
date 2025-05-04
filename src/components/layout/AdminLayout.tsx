// src/components/layout/AdminLayout.tsx
import React from 'react';
import { Box, Container } from '@mui/material';
import Header from '../common/Header';
import Footer from '../common/Footer';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {children}
      </Container>
      <Footer />
    </Box>
  );
};

export default AdminLayout;