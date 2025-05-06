// src/components/user/SongComparison.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Tooltip, Tabs, Tab
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import YouTubeIcon from '@mui/icons-material/YouTube';

import { Song } from '../../types/Song';
import { Game } from '../../types/Game';

interface SongComparisonProps {
  open: boolean;
  onClose: () => void;
  songs: Song[];
  game: Game | null;
  onRemoveSong: (songId: string) => void;
}

// Tab panel props interface
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Tab panel component
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`comparison-tabpanel-${index}`}
      aria-labelledby={`comparison-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const SongComparison: React.FC<SongComparisonProps> = ({
  open,
  onClose,
  songs,
  game,
  onRemoveSong
}) => {
  const [tabValue, setTabValue] = useState(0);
  
  // Reset tab when dialog opens/closes
  useEffect(() => {
    if (open) {
      setTabValue(0);
    }
  }, [open]);
  
  // Sort difficulties for consistent display
  const sortedDifficulties = React.useMemo(() => {
    if (!game?.difficulties) return [];
    return [...game.difficulties].sort((a, b) => a.order - b.order);
  }, [game]);
  
  // Handle tab change
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Handle YouTube link click
  const handleYouTubeClick = (url: string | null | undefined) => {
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  // Render song header
  const renderSongHeader = (song: Song) => (
    <Box sx={{ textAlign: 'center', position: 'relative', pt: 1, pb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
        {song.name}
      </Typography>
      
      <Typography variant="body2" color="text.secondary">
        {song.info.artist || ''}
      </Typography>
      
      <Box sx={{ position: 'absolute', top: 0, right: 0 }}>
        <IconButton 
          size="small" 
          onClick={() => onRemoveSong(song.id)}
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
  
  // Render level comparison table
  const renderLevelComparison = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>難易度</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                No.{song.songNo}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedDifficulties.map(diff => (
            <TableRow key={diff.id}>
              <TableCell 
                sx={{ 
                  bgcolor: diff.color,
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                {diff.name}
              </TableCell>
              {songs.map(song => {
                const diffInfo = song.difficulties[diff.id];
                return (
                  <TableCell key={song.id} align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ fontWeight: 'bold' }}>
                        {diffInfo?.level || '-'}
                      </Typography>
                      
                      {diffInfo?.youtubeUrl && (
                        <Tooltip title="YouTube動画を開く">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleYouTubeClick(diffInfo.youtubeUrl)}
                            sx={{ ml: 1 }}
                          >
                            <YouTubeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Render combo comparison table
  const renderComboComparison = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>難易度</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                No.{song.songNo}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedDifficulties.map(diff => (
            <TableRow key={diff.id}>
              <TableCell 
                sx={{ 
                  bgcolor: diff.color,
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                {diff.name}
              </TableCell>
              {songs.map(song => {
                const diffInfo = song.difficulties[diff.id];
                return (
                  <TableCell key={song.id} align="center">
                    {diffInfo?.combo || '-'}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Render song info comparison table
  const renderInfoComparison = () => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>項目</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                No.{song.songNo}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {/* BPM Row */}
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>BPM</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                {song.info.bpm || '-'}
              </TableCell>
            ))}
          </TableRow>
          
          {/* Duration Row */}
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>時間</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                {song.info.duration || '-'}
              </TableCell>
            ))}
          </TableRow>
          
          {/* Artist Row */}
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>アーティスト</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                {song.info.artist || '-'}
              </TableCell>
            ))}
          </TableRow>
          
          {/* Added Date Row */}
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>追加日</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                {song.info.addedDate ? song.info.addedDate.toLocaleDateString() : '-'}
              </TableCell>
            ))}
          </TableRow>
          
          {/* Tags Row */}
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>タグ</TableCell>
            {songs.map(song => (
              <TableCell key={song.id} align="center">
                {song.info.tags && song.info.tags.length > 0 ? (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'center' }}>
                    {song.info.tags.map((tag, index) => (
                      <Chip 
                        key={index}
                        label={tag}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: '20px',
                          '& .MuiChip-label': { 
                            px: 0.5, 
                            fontSize: '0.7rem' 
                          } 
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  '-'
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      aria-labelledby="song-comparison-dialog-title"
    >
      <DialogTitle id="song-comparison-dialog-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          楽曲比較 ({songs.length}曲)
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{ color: 'grey.500' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent 
        dividers
        sx={{ 
          minHeight: 400,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {songs.length === 0 ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography variant="body1" color="text.secondary">
              比較する楽曲がありません。楽曲一覧から楽曲を選択してください。
            </Typography>
          </Box>
        ) : (
          <>
            {/* Song Headers */}
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: `repeat(${songs.length}, 1fr)`,
              gap: 2
            }}>
              {songs.map(song => (
                <Box key={song.id}>
                  {renderSongHeader(song)}
                </Box>
              ))}
            </Box>
            
            {/* Comparison Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={tabValue} 
                onChange={handleTabChange} 
                aria-label="comparison tabs"
                centered
              >
                <Tab label="難易度レベル" />
                <Tab label="コンボ数" />
                <Tab label="楽曲情報" />
              </Tabs>
            </Box>
            
            {/* Tab Content */}
            <TabPanel value={tabValue} index={0}>
              {renderLevelComparison()}
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
              {renderComboComparison()}
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
              {renderInfoComparison()}
            </TabPanel>
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} color="primary">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SongComparison;