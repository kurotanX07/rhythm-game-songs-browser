import React from 'react';
import { Box } from '@mui/material';

interface AdComponentProps {
  size: 'banner' | 'inline';
  position: 'top' | 'inline' | 'bottom';
}

const AdComponent: React.FC<AdComponentProps> = ({ size, position }) => {
  // Ad dimensions based on size and position
  const adDimensions = {
    banner: {
      width: position === 'inline' ? '100%' : 728,
      height: 90,
    },
    inline: {
      width: '100%',
      height: 90,
    },
  };

  return (
    <Box
      sx={{
        mb: position === 'inline' ? 2 : 0,
        mt: position === 'bottom' ? 2 : 0,
        width: adDimensions[size].width,
        height: adDimensions[size].height,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderRadius: 1,
      }}
    >
      {/* This is where the actual ad would be rendered */}
      {/* For development, we'll show a placeholder */}
      <Box
        sx={{
          width: '100%',
          height: '100%',
          bgcolor: 'grey.200',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          border: '1px dashed grey',
        }}
      >
        AD PLACEHOLDER
      </Box>
    </Box>
  );
};

export default AdComponent;