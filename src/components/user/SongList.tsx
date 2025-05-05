// src/components/user/SongList.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Tooltip, 
  IconButton, Pagination, FormControl, InputLabel, Select, 
  MenuItem, SelectChangeEvent, Stack, Slider, Switch, FormControlLabel
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import { Song } from '../../types/Song';
import { Game, DifficultyDefinition } from '../../types/Game';
import { FilterOptions } from './FilterControls';

interface SongListProps {
  songs: Song[];
  filters: FilterOptions;
  game: Game | null;
}

// Column visibility state interface
interface ColumnVisibility {
  artist: boolean;
  lyricist: boolean;
  composer: boolean;
  arranger: boolean;
  duration: boolean;
  bpm: boolean;
  addedDate: boolean;
}

// Display density settings
type DisplayDensity = 'compact' | 'comfortable' | 'spacious';

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
  
  // Display settings
  const [density, setDensity] = useState<DisplayDensity>('compact'); // Default to compact as requested
  const [fontSize, setFontSize] = useState<number>(12); // Default font size
  
  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>({
    artist: true, // Default shown
    lyricist: false,
    composer: false,
    arranger: false,
    duration: true, // Default shown
    bpm: true, // Default shown
    addedDate: false
  });

  // Column settings panel
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  
  // Game's difficulties sorted by order (memoized)
  const sortedDifficulties = useMemo(() => {
    if (!game?.difficulties) return [];
    return [...game.difficulties].sort((a, b) => a.order - b.order);
  }, [game]);
  
  // Computed density style settings
  const densityStyles = useMemo(() => {
    switch (density) {
      case 'compact':
        return {
          padding: '2px 8px',
          fontSize: `${fontSize}px`,
          lineHeight: '1.1'
        };
      case 'comfortable':
        return {
          padding: '6px 16px',
          fontSize: `${fontSize + 1}px`,
          lineHeight: '1.3'
        };
      case 'spacious':
        return {
          padding: '8px 20px',
          fontSize: `${fontSize + 2}px`,
          lineHeight: '1.5'
        };
    }
  }, [density, fontSize]);
  
  // Filtered songs (memoized with performance optimizations)
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
      
      // Difficulty filter - only process if not ALL
      if (filters.difficulty !== 'ALL') {
        const diffInfo = song.difficulties[filters.difficulty];
        
        if (!diffInfo || !diffInfo.level) {
          return false;
        }
        
        // Level range
        if (diffInfo.level < filters.minLevel || diffInfo.level > filters.maxLevel) {
          return false;
        }
      }
      
      // Tag filter - only process if tags exist
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
      // Difficulty level sort
      if (sortDiffId) {
        const levelA = a.difficulties[sortDiffId]?.level || 0;
        const levelB = b.difficulties[sortDiffId]?.level || 0;
        
        if (sortIsCombo) {
          // Combo number sort
          const comboA = a.difficulties[sortDiffId]?.combo || 0;
          const comboB = b.difficulties[sortDiffId]?.combo || 0;
          return sortDirection === 'asc' ? comboA - comboB : comboB - comboA;
        } else {
          // Level sort
          return sortDirection === 'asc' ? levelA - levelB : levelB - levelA;
        }
      }
      
      // Regular field sort
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
      } else if (sortField === 'lyricist') {
        const lyricistA = a.info.lyricist || '';
        const lyricistB = b.info.lyricist || '';
        return sortDirection === 'asc' 
          ? lyricistA.localeCompare(lyricistB) 
          : lyricistB.localeCompare(lyricistA);
      } else if (sortField === 'composer') {
        const composerA = a.info.composer || '';
        const composerB = b.info.composer || '';
        return sortDirection === 'asc' 
          ? composerA.localeCompare(composerB) 
          : composerB.localeCompare(composerA);
      } else if (sortField === 'arranger') {
        const arrangerA = a.info.arranger || '';
        const arrangerB = b.info.arranger || '';
        return sortDirection === 'asc' 
          ? arrangerA.localeCompare(arrangerB) 
          : arrangerB.localeCompare(arrangerA);
      } else if (sortField === 'duration') {
        const durationA = a.info.duration || '';
        const durationB = b.info.duration || '';
        return sortDirection === 'asc' 
          ? durationA.localeCompare(durationB) 
          : durationB.localeCompare(durationA);
      } else if (sortField === 'bpm') {
        const bpmA = a.info.bpm || 0;
        const bpmB = b.info.bpm || 0;
        return sortDirection === 'asc' ? bpmA - bpmB : bpmB - bpmA;
      } else if (sortField === 'addedDate') {
        const dateA = a.info.addedDate ? a.info.addedDate.getTime() : 0;
        const dateB = b.info.addedDate ? b.info.addedDate.getTime() : 0;
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
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
  
  // Basic field sort
  const handleSortChange = (field: string) => {
    // Reset difficulty sort
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
  
  // Difficulty level sort
  const handleDifficultySort = (diffId: string, isCombo: boolean = false) => {
    const isSameSortCriteria = sortDiffId === diffId && sortIsCombo === isCombo;
    
    // Reset regular field sort
    setSortField('');
    // Set new difficulty and type
    setSortDiffId(diffId);
    setSortIsCombo(isCombo);
    
    // Toggle direction if same field
    if (isSameSortCriteria) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortDirection('asc');
    }
  };
  
  // Navigate to song detail page
  const handleSongClick = useCallback((songId: string) => {
    navigate(`/songs/${songId}`);
  }, [navigate]);
  
  // YouTube link handler
  const handleYouTubeClick = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    url?: string | null
  ) => {
    event.stopPropagation();
    
    if (url) {
      window.open(url, '_blank');
    }
  }, []);
  
  // Sort icon renderer
  const renderSortIcon = (field: string, diffId: string | null = null, isCombo: boolean = false) => {
    const isActive = diffId 
      ? (sortDiffId === diffId && sortIsCombo === isCombo)
      : (sortField === field);
      
    if (!isActive) return null;
    
    return sortDirection === 'asc' 
      ? <ArrowDropUpIcon fontSize="small" />
      : <ArrowDropDownIcon fontSize="small" />;
  };
  
  // Get difficulty definition
  const getDifficultyDefinition = useCallback((id: string): DifficultyDefinition | undefined => {
    return game?.difficulties.find(d => d.id === id);
  }, [game]);
  
  // Handle column visibility change
  const handleColumnChange = (column: keyof ColumnVisibility) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };
  
  // Handle display density change
  const handleDensityChange = (event: SelectChangeEvent) => {
    setDensity(event.target.value as DisplayDensity);
  };
  
  // Handle font size change
  const handleFontSizeChange = (_event: Event, newValue: number | number[]) => {
    setFontSize(newValue as number);
  };
  
  // Toggle column settings panel
  const toggleColumnSettings = () => {
    setShowColumnSettings(!showColumnSettings);
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
      
      {/* Display Settings */}
      <Paper sx={{ p: 1, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <IconButton onClick={toggleColumnSettings} color={showColumnSettings ? "primary" : "default"}>
              <ViewColumnIcon />
            </IconButton>
            <Typography variant="body2" sx={{ ml: 1 }}>
              表示項目
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, maxWidth: 400 }}>
            <FormatSizeIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" sx={{ mr: 1, minWidth: 70 }}>文字サイズ:</Typography>
            <Slider
              value={fontSize}
              onChange={handleFontSizeChange}
              min={10}
              max={18}
              step={1}
              valueLabelDisplay="auto"
              sx={{ maxWidth: 200 }}
            />
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="density-select-label">表示密度</InputLabel>
            <Select
              labelId="density-select-label"
              value={density}
              onChange={handleDensityChange}
              label="表示密度"
            >
              <MenuItem value="compact">コンパクト</MenuItem>
              <MenuItem value="comfortable">標準</MenuItem>
              <MenuItem value="spacious">広め</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Column Settings Panel */}
        {showColumnSettings && (
          <Box sx={{ mt: 1, p: 1, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" gutterBottom>表示する項目を選択:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
              <FormControlLabel
                control={<Switch size="small" checked={columnVisibility.artist} onChange={() => handleColumnChange('artist')} />}
                label="アーティスト"
                sx={{ mr: 2 }}
              />
              <FormControlLabel
                control={<Switch size="small" checked={columnVisibility.lyricist} onChange={() => handleColumnChange('lyricist')} />}
                label="作詞"
                sx={{ mr: 2 }}
              />
              <FormControlLabel
                control={<Switch size="small" checked={columnVisibility.composer} onChange={() => handleColumnChange('composer')} />}
                label="作曲"
                sx={{ mr: 2 }}
              />
              <FormControlLabel
                control={<Switch size="small" checked={columnVisibility.arranger} onChange={() => handleColumnChange('arranger')} />}
                label="編曲"
                sx={{ mr: 2 }}
              />
              <FormControlLabel
                control={<Switch size="small" checked={columnVisibility.duration} onChange={() => handleColumnChange('duration')} />}
                label="再生時間"
                sx={{ mr: 2 }}
              />
              <FormControlLabel
                control={<Switch size="small" checked={columnVisibility.bpm} onChange={() => handleColumnChange('bpm')} />}
                label="BPM"
                sx={{ mr: 2 }}
              />
              <FormControlLabel
                control={<Switch size="small" checked={columnVisibility.addedDate} onChange={() => handleColumnChange('addedDate')} />}
                label="追加日"
                sx={{ mr: 2 }}
              />
            </Box>
          </Box>
        )}
      </Paper>
      
      <TableContainer component={Paper}>
        <Table aria-label="song list table" size="small">
          <TableHead>
            <TableRow>
              <TableCell 
                onClick={() => handleSortChange('songNo')}
                sx={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  ...densityStyles,
                  width: '60px'
                }}
              >
                No.{renderSortIcon('songNo')}
              </TableCell>
              <TableCell 
                onClick={() => handleSortChange('name')}
                sx={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  ...densityStyles
                }}
              >
                楽曲名{renderSortIcon('name')}
              </TableCell>
              {columnVisibility.artist && (
                <TableCell 
                  onClick={() => handleSortChange('artist')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles
                  }}
                >
                  アーティスト{renderSortIcon('artist')}
                </TableCell>
              )}
              {columnVisibility.lyricist && (
                <TableCell 
                  onClick={() => handleSortChange('lyricist')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles
                  }}
                >
                  作詞{renderSortIcon('lyricist')}
                </TableCell>
              )}
              {columnVisibility.composer && (
                <TableCell 
                  onClick={() => handleSortChange('composer')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles
                  }}
                >
                  作曲{renderSortIcon('composer')}
                </TableCell>
              )}
              {columnVisibility.arranger && (
                <TableCell 
                  onClick={() => handleSortChange('arranger')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles
                  }}
                >
                  編曲{renderSortIcon('arranger')}
                </TableCell>
              )}
              {columnVisibility.duration && (
                <TableCell 
                  onClick={() => handleSortChange('duration')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles,
                    width: '90px'
                  }}
                  align="center"
                >
                  再生時間{renderSortIcon('duration')}
                </TableCell>
              )}
              {columnVisibility.bpm && (
                <TableCell 
                  onClick={() => handleSortChange('bpm')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles,
                    width: '80px'
                  }}
                  align="center"
                >
                  BPM{renderSortIcon('bpm')}
                </TableCell>
              )}
              {columnVisibility.addedDate && (
                <TableCell 
                  onClick={() => handleSortChange('addedDate')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles
                  }}
                  align="center"
                >
                  追加日{renderSortIcon('addedDate')}
                </TableCell>
              )}
              {sortedDifficulties.map(diff => (
                <TableCell 
                  key={diff.id} 
                  align="center"
                  sx={{ 
                    ...densityStyles,
                    padding: `${densityStyles.padding.split(' ')[0]} 4px`,
                  }}
                >
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
                      <Typography 
                        sx={{ 
                          fontSize: `${Number(densityStyles.fontSize.replace('px', '')) - 1}px`,
                          fontWeight: 'bold'
                        }}
                      >
                        {diff.name}
                      </Typography>
                      {renderSortIcon('', diff.id, false)}
                    </Box>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'text.secondary',
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline' },
                        fontSize: `${Number(densityStyles.fontSize.replace('px', '')) - 2}px`,
                      }}
                      onClick={() => handleDifficultySort(diff.id, true)}
                    >
                      コンボ{renderSortIcon('', diff.id, true)}
                    </Typography>
                  </Box>
                </TableCell>
              ))}
              <TableCell 
                align="center"
                sx={{ 
                  ...densityStyles,
                  width: '60px'
                }}
              >
                詳細
              </TableCell>
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
                <TableCell sx={densityStyles}>{song.songNo}</TableCell>
                <TableCell sx={densityStyles}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <MusicNoteIcon sx={{ mr: 1, color: 'primary.main', fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 2}px` }} />
                    <Typography sx={{ fontSize: densityStyles.fontSize }}>{song.name}</Typography>
                  </Box>
                </TableCell>
                
                {columnVisibility.artist && (
                  <TableCell sx={densityStyles}>{song.info.artist || ''}</TableCell>
                )}
                
                {columnVisibility.lyricist && (
                  <TableCell sx={densityStyles}>{song.info.lyricist || ''}</TableCell>
                )}
                
                {columnVisibility.composer && (
                  <TableCell sx={densityStyles}>{song.info.composer || ''}</TableCell>
                )}
                
                {columnVisibility.arranger && (
                  <TableCell sx={densityStyles}>{song.info.arranger || ''}</TableCell>
                )}
                
                {columnVisibility.duration && (
                  <TableCell sx={densityStyles} align="center">{song.info.duration || ''}</TableCell>
                )}
                
                {columnVisibility.bpm && (
                  <TableCell sx={densityStyles} align="center">{song.info.bpm || ''}</TableCell>
                )}
                
                {columnVisibility.addedDate && (
                  <TableCell sx={densityStyles} align="center">
                    {song.info.addedDate ? song.info.addedDate.toLocaleDateString() : ''}
                  </TableCell>
                )}
                
                {sortedDifficulties.map(diff => {
                  const diffInfo = song.difficulties[diff.id];
                  return (
                    <TableCell 
                      key={diff.id} 
                      align="center"
                      sx={{ 
                        ...densityStyles,
                        padding: `${densityStyles.padding.split(' ')[0]} 2px`,
                      }}
                    >
                      {diffInfo && diffInfo.level ? (
                        <Stack spacing={0.5} alignItems="center">
                          <Chip
                            label={diffInfo.level}
                            size="small"
                            sx={{
                              bgcolor: diff.color,
                              color: 'white',
                              fontWeight: 'bold',
                              height: `${Number(densityStyles.fontSize.replace('px', '')) + 4}px`,
                              '& .MuiChip-label': {
                                px: 1,
                                fontSize: `${Number(densityStyles.fontSize.replace('px', '')) - 1}px`
                              }
                            }}
                          />
                          
                          {/* Combo display */}
                          <Typography 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: `${Number(densityStyles.fontSize.replace('px', '')) - 2}px`
                            }}
                          >
                            {diffInfo.combo || '-'}
                          </Typography>
                          
                          {diffInfo.youtubeUrl && (
                            <Tooltip title="YouTubeで視聴">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => handleYouTubeClick(e, diffInfo.youtubeUrl)}
                                sx={{ 
                                  p: 0.5,
                                  '& .MuiSvgIcon-root': {
                                    fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 2}px`
                                  }
                                }}
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
                
                <TableCell align="center" sx={densityStyles}>
                  <Tooltip title="詳細を表示">
                    <IconButton 
                      size="small" 
                      color="primary"
                      sx={{ 
                        p: 0.5,
                        '& .MuiSvgIcon-root': {
                          fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 2}px`
                        }
                      }}
                    >
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