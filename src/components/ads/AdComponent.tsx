// src/components/ads/AdComponent.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Box, Paper, Typography, Button, Collapse } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { useAds } from '../../contexts/AdContext';
import { useNavigate } from 'react-router-dom';

interface AdComponentProps {
  size?: 'banner' | 'rectangle' | 'leaderboard';
  position?: 'top' | 'inline' | 'sidebar' | 'bottom';
  slot?: string;
}

// Placeholder ad content for development
const PLACEHOLDER_ADS = [
  {
    title: 'プレミアム会員になる',
    description: '広告なしでアプリを楽しみましょう！データのエクスポート機能も使えます。',
    cta: '詳細を見る',
    color: '#3f51b5',
    icon: <MusicNoteIcon />,
    link: '/membership'
  },
  {
    title: '新機能：楽曲比較',
    description: 'プレミアム会員限定の新機能！複数の楽曲を同時に比較できます。',
    cta: '今すぐアップグレード',
    color: '#f50057',
    icon: <MusicNoteIcon />,
    link: '/membership'
  },
  {
    title: '広告なしで閲覧',
    description: 'プレミアム会員になって、広告なしの快適な閲覧を体験しませんか？',
    cta: '会員登録',
    color: '#009688',
    icon: <MusicNoteIcon />,
    link: '/membership'
  }
];

const AdComponent: React.FC<AdComponentProps> = ({ 
  size = 'banner', 
  position = 'top',
  slot 
}) => {
  const { showAds, adUnit } = useAds();
  const adRef = useRef<HTMLDivElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const [currentAdIndex] = useState(Math.floor(Math.random() * PLACEHOLDER_ADS.length));
  const navigate = useNavigate();
  
  // Get the current placeholder ad
  const placeholderAd = PLACEHOLDER_ADS[currentAdIndex];
  
  // Don't render anything if ads are disabled
  if (!showAds) {
    return null;
  }
  
  // Size mapping
  const getSizeStyles = () => {
    switch (size) {
      case 'banner':
        return { width: '100%', height: '90px' };
      case 'rectangle':
        return { width: '300px', height: '250px' };
      case 'leaderboard':
        return { width: '100%', height: '90px' };
      default:
        return { width: '100%', height: '90px' };
    }
  };
  
  // Position styling
  const getPositionStyles = () => {
    switch (position) {
      case 'top':
        return { marginBottom: 2 };
      case 'inline':
        return { margin: '16px 0' };
      case 'sidebar':
        return { margin: '0 0 16px 0' };
      case 'bottom':
        return { marginTop: 2 };
      default:
        return { margin: 2 };
    }
  };
  
  // In a real app, this would interface with the ad network
  useEffect(() => {
    // Simulate ad loading
    const timeout = setTimeout(() => {
      setAdLoaded(true);
      
      // In a real app with actual ad network:
      // Try to load the ad from the ad network
      // if (window.adNetwork) {
      //   window.adNetwork.displayAd({
      //     element: adRef.current,
      //     slotId: slot || adUnit,
      //     sizes: [[300, 250]]
      //   });
      // }
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [adUnit, slot]);
  
  // Handle ad click
  const handleAdClick = () => {
    // Navigate to membership page
    navigate(placeholderAd.link);
  };
  
  // Handle close ad
  const handleCloseAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlaceholder(false);
  };
  
  return (
    <Collapse in={showPlaceholder}>
      <Paper
        ref={adRef}
        onClick={handleAdClick}
        sx={{
          ...getSizeStyles(),
          ...getPositionStyles(),
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          cursor: 'pointer',
          opacity: adLoaded ? 1 : 0.7,
          transition: 'opacity 0.3s',
          border: `1px solid ${placeholderAd.color}`,
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            opacity: 0.9
          }
        }}
      >
        {/* Ad Content */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            bgcolor: placeholderAd.color,
            color: 'white',
            p: 2,
            width: '30%',
            justifyContent: 'center'
          }}
        >
          {placeholderAd.icon}
        </Box>
        
        <Box sx={{ flexGrow: 1, p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {placeholderAd.title}
          </Typography>
          <Typography variant="body2">
            {placeholderAd.description}
          </Typography>
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ 
              mt: 1,
              color: placeholderAd.color,
              borderColor: placeholderAd.color,
              '&:hover': {
                borderColor: placeholderAd.color,
                backgroundColor: `${placeholderAd.color}10`
              }
            }}
          >
            {placeholderAd.cta}
          </Button>
        </Box>
        
        {/* Ad Label */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 0, 
            right: 0, 
            bgcolor: 'rgba(0,0,0,0.5)', 
            color: 'white',
            px: 1,
            py: 0.5,
            fontSize: '0.7rem',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <InfoIcon sx={{ fontSize: '0.8rem', mr: 0.5 }} />
          広告
        </Box>
        
        {/* Close Button */}
        <Box 
          sx={{ 
            position: 'absolute', 
            bottom: 0, 
            right: 0, 
            bgcolor: 'rgba(0,0,0,0.3)', 
            color: 'white',
            p: 0.5,
            borderRadius: '4px 0 0 0',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(0,0,0,0.5)'
            }
          }}
          onClick={handleCloseAd}
        >
          <CloseIcon sx={{ fontSize: '0.8rem' }} />
        </Box>
      </Paper>
    </Collapse>
  );
};

export default AdComponent;