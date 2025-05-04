import React, { useMemo } from 'react';
import { Box, Paper } from '@mui/material';
import YouTube from 'react-youtube';

interface YouTubePlayerProps {
  url: string;
}

const YouTubePlayer: React.FC<YouTubePlayerProps> = ({ url }) => {
  // URLからYouTubeのビデオIDを抽出
  const videoId = useMemo(() => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match && match[1] ? match[1] : null;
  }, [url]);
  
  if (!videoId) {
    return <div>無効なYouTube URL</div>;
  }
  
  const opts = {
    width: '100%',
    height: '400',
    playerVars: {
      // https://developers.google.com/youtube/player_parameters
      autoplay: 0,
      rel: 0,
      modestbranding: 1,
    },
  };
  
  return (
    <Box
      component={Paper}
      variant="outlined"
      sx={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        paddingTop: '56.25%', // 16:9 アスペクト比
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        <YouTube
          videoId={videoId}
          opts={opts}
          style={{ width: '100%', height: '100%' }}
        />
      </Box>
    </Box>
  );
};

export default YouTubePlayer;