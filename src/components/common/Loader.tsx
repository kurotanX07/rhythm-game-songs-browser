import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoaderProps {
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" sx={{ mt: 2 }}>
        {message}
      </Typography>
    </Box>
  );
};

export default Loader;