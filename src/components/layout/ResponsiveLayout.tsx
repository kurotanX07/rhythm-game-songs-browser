import React from 'react';
import { useMediaQuery, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  return (
    <Box 
      sx={{ 
        padding: isMobile ? 1 : 3,
        // モバイル向けの調整
        '& .MuiTableCell-root': {
          padding: isMobile ? '8px 4px' : '16px',
        },
        '& .MuiContainer-root': {
          padding: isMobile ? '0px 4px' : '0px 24px',
        }
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveLayout;