// src/components/user/SongList.tsx
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, Tooltip, 
  IconButton, Pagination, FormControl, InputLabel, Select, 
  MenuItem, SelectChangeEvent, Stack, Slider, Switch, FormControlLabel,
  useMediaQuery, useTheme as useMuiTheme
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Song } from '../../types/Song';
import { Game, DifficultyDefinition } from '../../types/Game';
import { FilterOptions } from './FilterControls';
import { useFavorites } from '../../hooks/useFavorites';

interface SongListProps {
  songs: Song[];
  filters: FilterOptions;
  game: Game | null;
  onAddToComparison?: (song: Song) => void;
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
type DisplayDensity = 'compact' | 'comfortable' | 'spacious' | 'very-spacious';

const SongList: React.FC<SongListProps> = ({ 
  songs, 
  filters, 
  game,
  onAddToComparison
}) => {
  const navigate = useNavigate();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  
  // Sort order state
  const [sortField, setSortField] = useState<string>('songNo');
  const [sortDiffId, setSortDiffId] = useState<string | null>(null);
  const [sortIsCombo, setSortIsCombo] = useState<boolean>(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Load user preferences from localStorage
  const loadUserPreferences = () => {
    try {
      const savedSettings = localStorage.getItem('songBrowserSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        return {
          density: parsedSettings.density || 'spacious',
          fontSize: parsedSettings.fontSize || 12,
          columnVisibility: parsedSettings.columnVisibility || {
            artist: true,
            lyricist: false,
            composer: false,
            arranger: false,
            duration: true,
            bpm: true,
            addedDate: false
          }
        };
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
    
    return {
      density: 'spacious' as DisplayDensity,
      fontSize: 12,
      columnVisibility: {
        artist: true,
        lyricist: false,
        composer: false,
        arranger: false,
        duration: true,
        bpm: true,
        addedDate: false
      }
    };
  };
  
  const defaultPreferences = loadUserPreferences();
  
  // State for display preferences
  const [density, setDensity] = useState<DisplayDensity>(defaultPreferences.density);
  const [fontSize, setFontSize] = useState<number>(defaultPreferences.fontSize);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(defaultPreferences.columnVisibility);

  // Column settings panel
  const [showColumnSettings, setShowColumnSettings] = useState<boolean>(false);
  
  // Save user preferences when they change
  React.useEffect(() => {
    try {
      localStorage.setItem('songBrowserSettings', JSON.stringify({
        density,
        fontSize,
        columnVisibility
      }));
    } catch (error) {
      console.error('Error saving user preferences:', error);
    }
  }, [density, fontSize, columnVisibility]);
  
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
          padding: '1px 2px',
          fontSize: `${fontSize}px`,
          lineHeight: '1'
        };
      case 'comfortable':
        return {
          padding: '2px 4px',
          fontSize: `${fontSize + 1}px`,
          lineHeight: '1.1'
        };
      case 'spacious':
        return {
          padding: '4px 6px',
          fontSize: `${fontSize + 2}px`,
          lineHeight: '1.2'
        };
      case 'very-spacious':
        return {
          padding: '6px 8px',
          fontSize: `${fontSize + 3}px`,
          lineHeight: '1.4'
        };
    }
  }, [density, fontSize]);
  
  // Filtered songs (memoized with performance optimizations)
  const filteredSongs = useMemo(() => {
    // Create optimized lookup sets for faster filtering
    const searchTermLower = filters.searchText.toLowerCase();
    const tagFiltersLower = filters.tags.map(tag => tag.toLowerCase());
    
    // Filter the songs based on all criteria
    return songs.filter(song => {
      // Skip processing if no filters are applied
      if (!searchTermLower && filters.difficulty === 'ALL' && tagFiltersLower.length === 0 && !filters.favoritesOnly) {
        return true;
      }
      
      // Text search
      if (searchTermLower) {
        const songNameLower = song.name.toLowerCase();
        const artistLower = (song.info.artist || '').toLowerCase();
        
        if (!songNameLower.includes(searchTermLower) && !artistLower.includes(searchTermLower)) {
          return false;
        }
      }
      
      // Difficulty filter
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
      
      // Favorites filter
      if (filters.favoritesOnly && !isFavorite(song.id)) {
        return false;
      }
      
      // Tag filter
      if (tagFiltersLower.length > 0) {
        if (!song.info.tags || song.info.tags.length === 0) {
          return false;
        }
        
        const songTagsLower = song.info.tags.map(tag => tag.toLowerCase());
        const hasMatchingTag = tagFiltersLower.some(filterTag => {
          return songTagsLower.some(songTag => songTag.includes(filterTag));
        });
        
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
  }, [songs, filters, isFavorite]);
  
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
  const handleChangePage = (_event: React.ChangeEvent<unknown>, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: SelectChangeEvent) => {
    setRowsPerPage(parseInt(event.target.value));
    setPage(1); // Reset to first page
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
  
  // Toggle favorite
  const handleToggleFavorite = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    songId: string
  ) => {
    event.stopPropagation();
    toggleFavorite(songId);
  }, [toggleFavorite]);
  
  // Add to comparison
  const handleAddToComparison = useCallback((
    event: React.MouseEvent<HTMLButtonElement>,
    song: Song
  ) => {
    event.stopPropagation();
    if (onAddToComparison) {
      onAddToComparison(song);
    }
  }, [onAddToComparison]);
  
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
      {/* Improved top section with more space */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: isMobile ? 2 : 3,
        mt: isMobile ? 1 : 2,
        flexWrap: 'wrap',
        gap: 1.5
      }}>
        <Typography variant="body1" sx={{ 
          fontWeight: 'medium',
          fontSize: isMobile ? '0.9rem' : '1rem'
        }}>
          {filteredSongs.length}曲中 {(page - 1) * rowsPerPage + 1}-{Math.min(page * rowsPerPage, filteredSongs.length)}曲目を表示
        </Typography>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 2,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          justifyContent: isMobile ? 'flex-end' : 'flex-start',
          width: isMobile ? '100%' : 'auto'
        }}>
          <FormControl variant="outlined" size="small" sx={{ 
            minWidth: isMobile ? '120px' : '150px',
            '& .MuiInputLabel-root': {
              fontSize: isMobile ? '0.8rem' : '0.9rem'
            },
            '& .MuiSelect-select': {
              fontSize: isMobile ? '0.8rem' : '0.9rem',
              padding: isMobile ? '8px 10px' : '10px 14px'
            }
          }}>
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
            size={isMobile ? "small" : "medium"}
            sx={{
              '& .MuiPaginationItem-root': {
                minWidth: isMobile ? '30px' : '36px',
                height: isMobile ? '30px' : '36px',
                fontSize: isMobile ? '0.8rem' : '0.9rem'
              }
            }}
          />
        </Box>
      </Box>
      
      {/* Display Settings - Improved spacing */}
      <Paper sx={{ 
        p: 1.5, 
        mb: 2, 
        borderRadius: 2,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: 1,
          mb: showColumnSettings ? 1 : 0
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 0.5,
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}>
            <IconButton 
              onClick={toggleColumnSettings} 
              color={showColumnSettings ? "primary" : "default"} 
              size="small"
              sx={{ p: 0.5 }}
            >
              <ViewColumnIcon sx={{ fontSize: isMobile ? '1.1rem' : '1.3rem' }} />
            </IconButton>
            <Typography variant="body2" sx={{ ml: 0.5, fontSize: isMobile ? '0.75rem' : '0.8rem' }}>
              表示項目
            </Typography>
          </Box>
          
          <FormControl size="small" sx={{ 
            width: isMobile ? '110px' : '120px',
            '& .MuiInputLabel-root': {
              fontSize: isMobile ? '0.7rem' : '0.75rem'
            },
            '& .MuiSelect-select': {
              fontSize: isMobile ? '0.7rem' : '0.75rem',
              py: 0.75
            }
          }}>
            <InputLabel id="density-select-label">表示密度</InputLabel>
            <Select
              labelId="density-select-label"
              value={density}
              onChange={handleDensityChange}
              label="表示密度"
            >
              <MenuItem value="compact" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>コンパクト</MenuItem>
              <MenuItem value="comfortable" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>標準</MenuItem>
              <MenuItem value="spacious" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>広め</MenuItem>
              <MenuItem value="very-spacious" sx={{ fontSize: isMobile ? '0.7rem' : '0.75rem' }}>さらに広め</MenuItem>
            </Select>
          </FormControl>
        </Box>
      
        {/* Font size adjustment - horizontal compact layout */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          px: 0.5,
          py: 0.75,
          mx: 0.5,
          mt: 0.5,
          borderRadius: 1,
          bgcolor: 'background.default'
        }}>
          <FormatSizeIcon sx={{ 
            color: 'primary.main', 
            fontSize: isMobile ? '1.1rem' : '1.2rem',
            mr: 1
          }} />
          <Typography variant="body2" sx={{ 
            fontSize: isMobile ? '0.75rem' : '0.8rem',
            minWidth: '50px'
          }}>
            文字:
          </Typography>
          
          <Slider
            value={fontSize}
            onChange={handleFontSizeChange}
            min={8}
            max={16}
            step={1}
            valueLabelDisplay="auto"
            sx={{ 
              flex: 1,
              mx: 1,
              '& .MuiSlider-thumb': {
                width: isMobile ? 16 : 14,
                height: isMobile ? 16 : 14,
              },
              '& .MuiSlider-rail, & .MuiSlider-track': {
                height: 2,
              }
            }}
          />
          
          <Typography variant="body2" sx={{ 
            ml: 0.5, 
            minWidth: '26px', 
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: 'medium',
            color: 'primary.main',
            bgcolor: 'action.selected',
            px: 0.75,
            py: 0.25,
            borderRadius: 0.75
          }}>
            {fontSize}
          </Typography>
        </Box>
        
        {/* Column Settings Panel - compact grid layout */}
        {showColumnSettings && (
          <Box sx={{ 
            mt: 1, 
            p: 1, 
            borderTop: 1, 
            borderColor: 'divider',
            borderRadius: '0 0 8px 8px',
            bgcolor: 'background.default'
          }}>
            <Grid container spacing={0.5}>
              <Grid item xs={6} sm={4} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={columnVisibility.artist} onChange={() => handleColumnChange('artist')} />}
                  label="アーティスト"
                  sx={{ 
                    m: 0,
                    '& .MuiFormControlLabel-label': { 
                      fontSize: isMobile ? '0.7rem' : '0.75rem' 
                    },
                    '& .MuiSwitch-root': {
                      mr: 0.5,
                      width: '32px',
                      height: '20px',
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={columnVisibility.bpm} onChange={() => handleColumnChange('bpm')} />}
                  label="BPM"
                  sx={{ 
                    m: 0,
                    '& .MuiFormControlLabel-label': { 
                      fontSize: isMobile ? '0.7rem' : '0.75rem' 
                    },
                    '& .MuiSwitch-root': {
                      mr: 0.5,
                      width: '32px',
                      height: '20px',
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={columnVisibility.duration} onChange={() => handleColumnChange('duration')} />}
                  label="時間"
                  sx={{ 
                    m: 0,
                    '& .MuiFormControlLabel-label': { 
                      fontSize: isMobile ? '0.7rem' : '0.75rem' 
                    },
                    '& .MuiSwitch-root': {
                      mr: 0.5,
                      width: '32px',
                      height: '20px',
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={columnVisibility.addedDate} onChange={() => handleColumnChange('addedDate')} />}
                  label="追加日"
                  sx={{ 
                    m: 0,
                    '& .MuiFormControlLabel-label': { 
                      fontSize: isMobile ? '0.7rem' : '0.75rem' 
                    },
                    '& .MuiSwitch-root': {
                      mr: 0.5,
                      width: '32px',
                      height: '20px',
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={columnVisibility.lyricist} onChange={() => handleColumnChange('lyricist')} />}
                  label="作詞"
                  sx={{ 
                    m: 0,
                    '& .MuiFormControlLabel-label': { 
                      fontSize: isMobile ? '0.7rem' : '0.75rem' 
                    },
                    '& .MuiSwitch-root': {
                      mr: 0.5,
                      width: '32px',
                      height: '20px',
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={columnVisibility.composer} onChange={() => handleColumnChange('composer')} />}
                  label="作曲"
                  sx={{ 
                    m: 0,
                    '& .MuiFormControlLabel-label': { 
                      fontSize: isMobile ? '0.7rem' : '0.75rem' 
                    },
                    '& .MuiSwitch-root': {
                      mr: 0.5,
                      width: '32px',
                      height: '20px',
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <FormControlLabel
                  control={<Switch size="small" checked={columnVisibility.arranger} onChange={() => handleColumnChange('arranger')} />}
                  label="編曲"
                  sx={{ 
                    m: 0,
                    '& .MuiFormControlLabel-label': { 
                      fontSize: isMobile ? '0.7rem' : '0.75rem' 
                    },
                    '& .MuiSwitch-root': {
                      mr: 0.5,
                      width: '32px',
                      height: '20px',
                      '& .MuiSwitch-thumb': {
                        width: 12,
                        height: 12
                      }
                    }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
      
      {/* Table with song data */}
      <TableContainer component={Paper} sx={{ 
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden'
      }}>
        <Table size="small" aria-label="song table">
          <TableHead>
            <TableRow sx={{ bgcolor: 'background.default' }}>
              <TableCell 
                onClick={() => handleSortChange('songNo')}
                sx={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  ...densityStyles,
                  width: '30px',
                  minWidth: '30px',
                  maxWidth: '30px',
                  borderBottom: 2,
                  borderColor: 'divider'
                }}
              >
                No.{renderSortIcon('songNo')}
              </TableCell>
              <TableCell 
                onClick={() => handleSortChange('name')}
                sx={{ 
                  cursor: 'pointer', 
                  fontWeight: 'bold',
                  ...densityStyles,
                  minWidth: '120px',
                  borderBottom: 2,
                  borderColor: 'divider'
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
                    ...densityStyles,
                    minWidth: '80px',
                    borderBottom: 2,
                    borderColor: 'divider'
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
                    ...densityStyles,
                    minWidth: '60px',
                    borderBottom: 2,
                    borderColor: 'divider'
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
                    ...densityStyles,
                    minWidth: '60px',
                    borderBottom: 2,
                    borderColor: 'divider'
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
                    ...densityStyles,
                    minWidth: '60px',
                    borderBottom: 2,
                    borderColor: 'divider'
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
                    width: '50px',
                    minWidth: '50px',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}
                  align="center"
                >
                  時間{renderSortIcon('duration')}
                </TableCell>
              )}
              
              {columnVisibility.bpm && (
                <TableCell 
                  onClick={() => handleSortChange('bpm')}
                  sx={{ 
                    cursor: 'pointer', 
                    fontWeight: 'bold',
                    ...densityStyles,
                    width: '45px',
                    minWidth: '45px',
                    borderBottom: 2,
                    borderColor: 'divider'
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
                    ...densityStyles,
                    width: '70px',
                    minWidth: '70px',
                    borderBottom: 2,
                    borderColor: 'divider'
                  }}
                  align="center"
                >
                  追加日{renderSortIcon('addedDate')}
                </TableCell>
              )}
              
              {/* Difficulty columns */}
              {sortedDifficulties.map(diff => (
                <TableCell 
                  key={diff.id} 
                  align="center"
                  sx={{ 
                    ...densityStyles,
                    padding: '1px 1px',
                    width: '60px',
                    minWidth: '60px',
                    maxWidth: '60px',
                    borderBottom: 2,
                    borderColor: 'divider'
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
                  </Box>
                </TableCell>
              ))}
              
              <TableCell 
                align="center"
                sx={{ 
                  ...densityStyles,
                  width: '80px',
                  minWidth: '80px',
                  maxWidth: '80px',
                  borderBottom: 2,
                  borderColor: 'divider'
                }}
              >
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          
          <TableBody>
            {paginatedSongs.map((song) => (
              <TableRow
                key={song.id}
                hover
                onClick={() => handleSongClick(song.id)}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <TableCell sx={densityStyles}>{song.songNo}</TableCell>
                <TableCell sx={{
                  ...densityStyles,
                  whiteSpace: 'normal',
                  wordBreak: 'break-word'
                }}>
                  <Box sx={{ display: 'flex' }}>
                    <MusicNoteIcon sx={{ 
                      mr: 0.5, 
                      color: 'primary.main', 
                      fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 2}px`,
                      flexShrink: 0
                    }} />
                    <Typography sx={{ 
                      fontSize: densityStyles.fontSize
                    }}>
                      {song.name}
                    </Typography>
                  </Box>
                </TableCell>
                
                {columnVisibility.artist && (
                  <TableCell sx={{
                    ...densityStyles,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}>
                    {song.info.artist || ''}
                  </TableCell>
                )}
                
                {columnVisibility.lyricist && (
                  <TableCell sx={{
                    ...densityStyles,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}>
                    {song.info.lyricist || ''}
                  </TableCell>
                )}
                
                {columnVisibility.composer && (
                  <TableCell sx={{
                    ...densityStyles,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}>
                    {song.info.composer || ''}
                  </TableCell>
                )}
                
                {columnVisibility.arranger && (
                  <TableCell sx={{
                    ...densityStyles,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}>
                    {song.info.arranger || ''}
                  </TableCell>
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
                
                {/* Difficulty cells */}
                {sortedDifficulties.map(diff => {
                  const diffInfo = song.difficulties[diff.id];
                  return (
                    <TableCell 
                      key={diff.id} 
                      align="center"
                      sx={{ 
                        ...densityStyles,
                        padding: '0px',
                      }}
                    >
                      {diffInfo && diffInfo.level ? (
                        <Box sx={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center', 
                          mt: 0.5,
                          px: 0.5
                        }}>
                          {/* Left: Level and combo */}
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <Chip
                              label={diffInfo.level}
                              size="small"
                              sx={{
                                bgcolor: diff.color,
                                color: 'white',
                                fontWeight: 'bold',
                                height: `${Number(densityStyles.fontSize.replace('px', '')) + 2}px`,
                                '& .MuiChip-label': {
                                  px: 0.5,
                                  fontSize: `${Number(densityStyles.fontSize.replace('px', '')) - 1}px`
                                }
                              }}
                            />
                            <Typography 
                              sx={{ 
                                color: 'text.secondary',
                                fontSize: `${Number(densityStyles.fontSize.replace('px', '')) - 2}px`,
                                lineHeight: 1,
                                mt: 0.25,
                                cursor: 'pointer',
                                '&:hover': { textDecoration: 'underline' }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDifficultySort(diff.id, true);
                              }}
                            >
                              {diffInfo.combo || '-'}
                            </Typography>
                          </Box>
                          
                          {/* Right: YouTube button */}
                          {diffInfo.youtubeUrl && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={(e) => handleYouTubeClick(e, diffInfo.youtubeUrl)}
                              sx={{ 
                                p: 0.5,
                                ml: 0.5,
                                '& .MuiSvgIcon-root': {
                                  fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 4}px`
                                }
                              }}
                            >
                              <YouTubeIcon />
                            </IconButton>
                          )}
                        </Box>
                      ) : (
                        <Typography sx={{ ...densityStyles }}>-</Typography>
                      )}
                    </TableCell>
                  );
                })}
                
                {/* Action buttons cell */}
                <TableCell align="center" sx={{ ...densityStyles, padding: '0 4px' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSongClick(song.id);
                      }}
                      sx={{ 
                        p: 0.5,
                        '& .MuiSvgIcon-root': {
                          fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 4}px`
                        }
                      }}
                    >
                      <InfoOutlinedIcon />
                    </IconButton>
                    
                    <IconButton 
                      size="small" 
                      color="secondary"
                      onClick={(e) => handleToggleFavorite(e, song.id)}
                      sx={{ 
                        p: 0.5,
                        '& .MuiSvgIcon-root': {
                          fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 4}px`
                        }
                      }}
                    >
                      {isFavorite(song.id) ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                    </IconButton>
                    
                    {onAddToComparison && (
                      <Tooltip title="比較に追加">
                        <IconButton 
                          size="small" 
                          color="info"
                          onClick={(e) => handleAddToComparison(e, song)}
                          sx={{ 
                            p: 0.5,
                            '& .MuiSvgIcon-root': {
                              fontSize: `${Number(densityStyles.fontSize.replace('px', '')) + 4}px`
                            }
                          }}
                        >
                          <Box sx={{ 
                            width: 18, 
                            height: 18, 
                            border: '2px solid', 
                            borderColor: 'info.main',
                            borderRadius: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Box component="span" sx={{ fontSize: '12px', fontWeight: 'bold' }}>+</Box>
                          </Box>
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Bottom pagination - Improved */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mt: 3,
        mb: 2
      }}>
        <Pagination 
          count={Math.ceil(filteredSongs.length / rowsPerPage)} 
          page={page}
          onChange={handleChangePage}
          color="primary"
          showFirstButton
          showLastButton
          size={isMobile ? "small" : "medium"}
          sx={{
            '& .MuiPaginationItem-root': {
              minWidth: isMobile ? '30px' : '36px',
              height: isMobile ? '30px' : '36px',
              fontSize: isMobile ? '0.8rem' : '0.9rem'
            }
          }}
        />
      </Box>
    </>
  );
};

export default React.memo(SongList);