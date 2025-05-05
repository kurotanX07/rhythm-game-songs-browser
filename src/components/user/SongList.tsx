// src/components/user/SongList.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Tooltip, 
  IconButton, Pagination, FormControl, InputLabel, Select, 
  MenuItem, SelectChangeEvent, Stack
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
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
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Sort order state
  const [sortField, setSortField] = useState<string>('songNo');
  const [sortDiffId, setSortDiffId] = useState<string | null>(null);
  const [sortIsCombo, setSortIsCombo] = useState<boolean>(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // ゲームの難易度を順序でソート (memoized)
  const sortedDifficulties = useMemo(() => {
    if (!game?.difficulties) return [];
    return [...game.difficulties].sort((a, b) => a.order - b.order);
  }, [game]);
  
  // 曲のフィルタリング (memoized with performance optimizations)
  const filteredSongs = useMemo(() => {
    console.time('filter');
    
    // Create optimized lookup sets for faster filtering
    const searchTermLower = filters.searchText.toLowerCase();
    const tagFiltersLower = filters.tags.map(tag => tag.toLowerCase());
    
    // Optimized filtering logic
    const result = songs.filter(song => {
      // Skip processing if no filters are applied
      if (!searchTermLower && filters.difficulty === 'ALL' && tagFiltersLower.length === 0) {
        return true;
      }
      
      // Text search - only calculate if search term exists
      if (searchTermLower) {
        const songNameLower = song.name.toLowerCase();
        const artistLower = (song.info.artist || '').toLowerCase();
        
        if (!songNameLower.includes(searchTermLower) && !artistLower.includes(searchTermLower)) {
          return false;
        }
      }
      
      // 難易度フィルター - only process if not ALL
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
      
      // タグフィルター - only process if tags exist
      if (tagFiltersLower.length > 0) {
        if (!song.info.tags || song.info.tags.length === 0) {
          return false;
        }
        
        // Convert tags to lowercase array for comparison
        const songTagsLower = song.info.tags.map(tag => tag.toLowerCase());
        
        // Check if any tag matches
        const hasMatchingTag = tagFiltersLower.some(filterTag => {
          // Check for any partial match in the song tags
          return songTagsLower.some(songTag => songTag.includes(filterTag));
        });
        
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
    
    console.timeEnd('filter');
    return result;
  }, [songs, filters]);
  
  // Apply sorting (memoized)
  const sortedSongs = useMemo(() => {
    return [...filteredSongs].sort((a, b) => {
      // 難易度レベルでソート
      if (sortDiffId) {
        const levelA = a.difficulties[sortDiffId]?.level || 0;
        const levelB = b.difficulties[sortDiffId]?.level || 0;
        
        if (sortIsCombo) {
          // コンボ数でソート
          const comboA = a.difficulties[sortDiffId]?.combo || 0;
          const comboB = b.difficulties[sortDiffId]?.combo || 0;
          return sortDirection === 'asc' ? comboA - comboB : comboB - comboA;
        } else {
          // レベルでソート
          return sortDirection === 'asc' ? levelA - levelB : levelB - levelA;
        }
      }
      
      // 通常フィールドでソート
      if (sortField === 'songNo') {
        return sortDirection === 'asc' ? a.songNo - b.songNo : b.songNo - a.songNo;
      } else if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (sortField === 'artist') {
        const artistA = a.info.artist || '';
        const artistB = b.info.artist || '';
        return sortDirection === 'asc' 
          ? artistA.localeCompare(artistB) 
          : artistB.localeCompare(artistA);
      }
      return 0;
    });
  }, [filteredSongs, sortField, sortDiffId, sortIsCombo, sortDirection]);
  
  // Pagination calculation (memoized)
  const paginatedSongs = useMemo(() => {
    const startIdx = (page - 1) * rowsPerPage;
    return sortedSongs.slice(startIdx, startIdx + rowsPerPage);
  }, [sortedSongs, page, rowsPerPage]);
  
  // Event handlers
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: SelectChangeEvent) => {
    setRowsPerPage(parseInt(event.target.value));
    setPage(1); // Reset to first page
  };
  
  // 基本フィールドのソート
  const handleSortChange = (field: string) => {
    // 難易度ソートをリセット
    setSortDiffId(null);
    setSortIsCombo(false);
    
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and reset direction to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 難易度レベルのソート
  const handleDifficultySort = (diffId: string, isCombo: boolean = false) => {
    const isSameSortCriteria = sortDiffId === diffId && sortIsCombo === isCombo;
    
    // 通常フィールドソートをリセット
    setSortField('');
    // 新しい難易度とタイプをセット
    setSortDiffId(diffId);
    setSortIsCombo(isCombo);
    
    // 同じフィールドの場合は方向を切り替え
    if (isSameSortCriteria) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortDirection('asc');
    }
  };
  
  // 曲の詳細ページへ遷移
  const handleSongClick = useCallback((songId: string) => {
    navigate(`/songs/${songId}`);
  }, [navigate]);
  
  // YouTubeリンク
  const handleYouTubeClick = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    url?: string | null
  ) => {
    event.stopPropagation();
    
    if (url) {
      window.open(url, '_blank');
    }
  }, []);
  
  // ソートアイコンを表示
  const renderSortIcon = (field: string, diffId: string | null = null, isCombo: boolean = false) => {
    const isActive = diffId 
      ? (sortDiffId === diffId && sortIsCombo === isCombo)
      : (sortField === field);
      
    if (!isActive) return null;
    
    return sortDirection === 'asc' 
      ? <ArrowDropUpIcon fontSize="small" />
      : <ArrowDropDownIcon fontSize="small" />;
  };
  
  // 難易度定義を取得
  const getDifficultyDefinition = useCallback((id: string): DifficultyDefinition | undefined => {
    return game?.difficulties.find(d => d.id === id);
  }, [game]);
  
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
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="body2">
          {filteredSongs.length}曲中 {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filteredSongs.length)}曲目を表示
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120, mr: 2 }}>
            <InputLabel id="rows-per-page-label">表示件数</InputLabel>
            <Select
              labelId="rows-per-page-label"
              value={rowsPerPage.toString()}
              onChange={handleChangeRowsPerPage}
              label="表示件数"
            >
              <MenuItem value={25}>25件</MenuItem>
              <MenuItem value={50}>50件</MenuItem>
              <MenuItem value={100}>100件</MenuItem>
              <MenuItem value={250}>250件</MenuItem>
            </Select>
          </FormControl>
          
          <Pagination 
            count={Math.ceil(filteredSongs.length / rowsPerPage)} 
            page={page}
            onChange={handleChangePage}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      </Box>
      
      <TableContainer component={Paper}>
        <Table aria-label="song list table" size="small">
          <TableHead>
            <TableRow>
              <TableCell 
                onClick={() => handleSortChange('songNo')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                No.{renderSortIcon('songNo')}
              </TableCell>
              <TableCell 
                onClick={() => handleSortChange('name')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                楽曲名{renderSortIcon('name')}
              </TableCell>
              <TableCell 
                onClick={() => handleSortChange('artist')}
                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
              >
                アーティスト{renderSortIcon('artist')}
              </TableCell>
              {sortedDifficulties.map(diff => (
                <TableCell key={diff.id} align="center">
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={() => handleDifficultySort(diff.id, false)}
                    >
                      {diff.name}{renderSortIcon('', diff.id, false)}
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                      onClick={() => handleDifficultySort(diff.id, true)}
                    >
                      コンボ{renderSortIcon('', diff.id, true)}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
              <TableCell align="center">詳細</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSongs.map((song) => (
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
                        <Stack spacing={0.5} alignItems="center">
                          <Chip
                            label={diffInfo.level}
                            size="small"
                            sx={{
                              bgcolor: diff.color,
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          />
                          
                          {/* コンボ数表示 */}
                          <Typography variant="caption" color="text.secondary">
                            {diffInfo.combo || '-'}
                          </Typography>
                          
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
                        </Stack>
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
      
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
        <Pagination 
          count={Math.ceil(filteredSongs.length / rowsPerPage)} 
          page={page}
          onChange={handleChangePage}
          color="primary"
          showFirstButton
          showLastButton
        />
      </Box>
    </>
  );
};

export default SongList;