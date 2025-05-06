// src/components/layout/ResponsiveLayout.tsx
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
        },
        // 文字サイズの調整（モバイルの場合に小さくする）
        '& .MuiTypography-body1': {
          fontSize: isMobile ? '0.875rem' : '1rem',
        },
        '& .MuiTypography-body2': {
          fontSize: isMobile ? '0.75rem' : '0.875rem',
        },
        '& .MuiTypography-h5': {
          fontSize: isMobile ? '1.25rem' : '1.5rem',
        },
        '& .MuiTypography-h6': {
          fontSize: isMobile ? '1rem' : '1.25rem',
        },
        '& .MuiButton-root': {
          fontSize: isMobile ? '0.75rem' : '0.875rem',
        },
        '& .MuiChip-root': {
          fontSize: isMobile ? '0.65rem' : '0.75rem',
          height: isMobile ? '24px' : '32px',
        },
        // その他モバイル向けの調整
        '& .MuiTextField-root .MuiInputBase-input': {
          fontSize: isMobile ? '0.875rem' : '1rem',
        },
        '& .MuiSelect-select': {
          fontSize: isMobile ? '0.875rem' : '1rem',
        },
      }}
    >
      {children}
    </Box>
  );
};

export default ResponsiveLayout;