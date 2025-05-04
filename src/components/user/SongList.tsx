// src/components/user/SongList.tsx
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Tooltip, IconButton
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Song } from '../../types/Song';
import { Game, DifficultyDefinition } from '../../types/Game';
import { FilterOptions } from './FilterControls';

interface SongListProps {
  songs: Song[];
  filters: FilterOptions;
  game: Game | null;
}

const SongList: React.FC<SongListProps> = ({ songs, filters, game }) => {
  const navigate = useNavigate();
  
  // ゲームの難易度を順序でソート
  const sortedDifficulties = useMemo(() => {
    if (!game?.difficulties) return [];
    return [...game.difficulties].sort((a, b) => a.order - b.order);
  }, [game]);
  
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
        
        if (!diffInfo || !diffInfo.level) {
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
    url?: string | null  // Changed to accept null values too
  ) => {
    event.stopPropagation();
    
    if (url) {
      window.open(url, '_blank');
    }
  };
  
  // 難易度定義を取得
  const getDifficultyDefinition = (id: string): DifficultyDefinition | undefined => {
    return game?.difficulties.find(d => d.id === id);
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
            {sortedDifficulties.map(diff => (
              <TableCell key={diff.id} align="center">{diff.name}</TableCell>
            ))}
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
              
              {sortedDifficulties.map(diff => {
                const diffInfo = song.difficulties[diff.id];
                return (
                  <TableCell key={diff.id} align="center">
                    {diffInfo && diffInfo.level ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Chip
                          label={diffInfo.level}
                          size="small"
                          sx={{
                            bgcolor: diff.color,
                            color: 'white',
                            fontWeight: 'bold',
                            mb: 0.5
                          }}
                        />
                        
                        {diffInfo.youtubeUrl && (
                          <Tooltip title="YouTubeで視聴">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => handleYouTubeClick(e, diffInfo.youtubeUrl)}
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
                );
              })}
              
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