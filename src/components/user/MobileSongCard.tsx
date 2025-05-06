// src/components/user/MobileSongCard.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card, CardContent, Typography, Box, Chip,
  IconButton, Collapse, CardActions, CardActionArea
} from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import { Song } from '../../types/Song';
import { Game, DifficultyDefinition } from '../../types/Game';
import { useFavorites } from '../../hooks/useFavorites';

interface MobileSongCardProps {
  song: Song;
  game: Game | null;
}

const MobileSongCard: React.FC<MobileSongCardProps> = ({ song, game }) => {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [expanded, setExpanded] = React.useState(false);
  
  // Sort difficulties for consistent display
  const sortedDifficulties = React.useMemo(() => {
    if (!game?.difficulties) return [];
    return [...game.difficulties].sort((a, b) => a.order - b.order);
  }, [game]);
  
  const handleToggleFavorite = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleFavorite(song.id);
  };
  
  const handleToggleExpand = (event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded(!expanded);
  };
  
  const handleCardClick = () => {
    navigate(`/songs/${song.id}`);
  };
  
  const handleYouTubeClick = (event: React.MouseEvent, url: string | null | undefined) => {
    event.stopPropagation();
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  // Find the first available YouTube URL from any difficulty
  const findFirstYouTubeUrl = (): string | null => {
    for (const diff of sortedDifficulties) {
      const diffInfo = song.difficulties[diff.id];
      if (diffInfo?.youtubeUrl) {
        return diffInfo.youtubeUrl;
      }
    }
    return null;
  };
  
  const youtubeUrl = findFirstYouTubeUrl();
  
  return (
    <Card 
      sx={{ 
        mb: 1.5, 
        position: 'relative',
        overflow: 'visible'
      }}
    >
      <CardActionArea onClick={handleCardClick}>
        <CardContent sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mr: 1 }}>
              No.{song.songNo}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {sortedDifficulties.map(diff => {
                const diffInfo = song.difficulties[diff.id];
                if (!diffInfo || !diffInfo.level) return null;
                
                return (
                  <Chip
                    key={diff.id}
                    label={diffInfo.level}
                    size="small"
                    sx={{
                      bgcolor: diff.color,
                      color: 'white',
                      height: '20px',
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                );
              })}
            </Box>
          </Box>
          
          <Typography variant="h6" component="div" sx={{ mt: 0.5, fontSize: '1rem', lineHeight: 1.2 }}>
            {song.name}
          </Typography>
          
          {song.info.artist && (
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mt: 0.5 }}>
              {song.info.artist}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
      
      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Box>
          <IconButton 
            size="small" 
            onClick={handleToggleFavorite}
            color="secondary"
          >
            {isFavorite(song.id) ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>
          
          {youtubeUrl && (
            <IconButton 
              size="small" 
              onClick={(e) => handleYouTubeClick(e, youtubeUrl)}
              color="error"
            >
              <YouTubeIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        
        <IconButton 
          size="small" 
          onClick={handleToggleExpand}
          sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </CardActions>
      
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 0, pb: '8px !important' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {/* Difficulties with more details */}
            {sortedDifficulties.map(diff => {
              const diffInfo = song.difficulties[diff.id];
              if (!diffInfo || !diffInfo.level) return null;
              
              return (
                <Box key={diff.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        width: 10, 
                        height: 10, 
                        borderRadius: '50%', 
                        bgcolor: diff.color,
                        mr: 1 
                      }} 
                    />
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      {diff.name} Lv.{diffInfo.level}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {diffInfo.combo && (
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', mr: 1, color: 'text.secondary' }}>
                        {diffInfo.combo}コンボ
                      </Typography>
                    )}
                    
                    {diffInfo.youtubeUrl && (
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleYouTubeClick(e, diffInfo.youtubeUrl)}
                        color="error"
                        sx={{ padding: 0 }}
                      >
                        <YouTubeIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    )}
                  </Box>
                </Box>
              );
            })}
            
            {/* Additional song info */}
            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
              {song.info.bpm && (
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  BPM: {song.info.bpm}
                </Typography>
              )}
              
              {song.info.duration && (
                <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  時間: {song.info.duration}
                </Typography>
              )}
              
              {song.info.tags && song.info.tags.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                  {song.info.tags.map((tag, index) => (
                    <Chip 
                      key={index}
                      label={tag}
                      size="small"
                      variant="outlined"
                      sx={{ 
                        height: '16px',
                        '& .MuiChip-label': { 
                          px: 0.5, 
                          fontSize: '0.65rem' 
                        } 
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
};

export default React.memo(MobileSongCard);