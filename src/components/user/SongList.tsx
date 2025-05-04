import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Chip, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tooltip, IconButton
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Song, DifficultyLevel } from '../../types/Song';
import { FilterOptions } from './FilterControls';

interface SongListProps {
  songs: Song[];
  filters: FilterOptions;
}

const SongList: React.FC<SongListProps> = ({ songs, filters }) => {
  const navigate = useNavigate();
  
  // 曲のフィルタリング
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // テキスト検索
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const songNameMatch = song.name.toLowerCase().includes(searchLower);
        const artistMatch = song.info.artist && song.info.artist.toLowerCase().includes(searchLower);
        
        if (!songNameMatch && !artistMatch) {
          return false;
        }
      }
      
      // 難易度フィルター
      if (filters.difficulty !== 'ALL') {
        const diffInfo = song.difficulties[filters.difficulty];
        
        if (!diffInfo.level) {
          return false;
        }
        
        // レベル範囲
        if (diffInfo.level < filters.minLevel || diffInfo.level > filters.maxLevel) {
          return false;
        }
      }
      
      // タグフィルター
      if (filters.tags.length > 0) {
        if (!song.info.tags || song.info.tags.length === 0) {
          return false;
        }
        
        // すべてのフィルタータグが曲のタグに含まれるかチェック
        return filters.tags.every(tag => 
          song.info.tags?.some(songTag => 
            songTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
      }
      
      return true;
    });
  }, [songs, filters]);
  
  // 曲の詳細ページへ遷移
  const handleSongClick = (songId: string) => {
    navigate(`/songs/${songId}`);
  };
  
  // YouTubeリンク
  const handleYouTubeClick = (
    event: React.MouseEvent<HTMLButtonElement>,
    url?: string
  ) => {
    event.stopPropagation();
    
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  // 難易度表示のバッジの色設定
  const getDifficultyColor = (difficulty: DifficultyLevel): string => {
    switch (difficulty) {
      case 'EASY':
        return '#43a047';
      case 'NORMAL':
        return '#1976d2';
      case 'HARD':
        return '#ff9800';
      case 'EXPERT':
        return '#d32f2f';
      case 'MASTER':
        return '#9c27b0';
      case 'APPEND':
        return '#607d8b';
      default:
        return '#9e9e9e';
    }
  };
  
  if (filteredSongs.length === 0) {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="body1">
          条件に一致する楽曲はありません。
        </Typography>
      </Box>
    );
  }
  
  return (
    <TableContainer component={Paper} sx={{ mt: 2 }}>
      <Table aria-label="song list table">
        <TableHead>
          <TableRow>
            <TableCell>No.</TableCell>
            <TableCell>楽曲名</TableCell>
            <TableCell>アーティスト</TableCell>
            <TableCell align="center">EASY</TableCell>
            <TableCell align="center">NORMAL</TableCell>
            <TableCell align="center">HARD</TableCell>
            <TableCell align="center">EXPERT</TableCell>
            <TableCell align="center">MASTER</TableCell>
            <TableCell align="center">APPEND</TableCell>
            <TableCell align="center">詳細</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredSongs.map((song) => (
            <TableRow
              key={song.id}
              hover
              onClick={() => handleSongClick(song.id)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>{song.songNo}</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <MusicNoteIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="body1">{song.name}</Typography>
                </Box>
              </TableCell>
              <TableCell>{song.info.artist || '-'}</TableCell>
              
              {(['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER', 'APPEND'] as DifficultyLevel[]).map(diff => (
                <TableCell key={diff} align="center">
                  {song.difficulties[diff].level ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Chip
                        label={song.difficulties[diff].level}
                        size="small"
                        sx={{
                          bgcolor: getDifficultyColor(diff),
                          color: 'white',
                          fontWeight: 'bold',
                          mb: 0.5
                        }}
                      />
                      
                      {song.difficulties[diff].youtubeUrl && (
                        <Tooltip title="YouTubeで視聴">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => handleYouTubeClick(e, song.difficulties[diff].youtubeUrl)}
                          >
                            <YouTubeIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  ) : (
                    '-'
                  )}
                </TableCell>
              ))}
              
              <TableCell align="center">
                <Tooltip title="詳細を表示">
                  <IconButton size="small" color="primary">
                    <InfoOutlinedIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default SongList;