// src/components/user/FilterControls.tsx 
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, FormControl, 
  InputLabel, Select, MenuItem, SelectChangeEvent,
  Chip, IconButton, Slider, Stack, Paper, Button,
  Collapse, FormControlLabel, Checkbox, Tooltip,
  useMediaQuery, useTheme, Grid
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useSongData } from '../../contexts/SongDataContext';
import { Game } from '../../types/Game';

interface FilterControlsProps {
  onFilterChange: (filters: FilterOptions) => void;
  game: Game | null;
}

export interface FilterOptions {
  searchText: string;
  difficulty: string;
  minLevel: number;
  maxLevel: number;
  tags: string[];
  favoritesOnly: boolean;
}

const FilterControls: React.FC<FilterControlsProps> = ({ 
  onFilterChange, 
  game 
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Get saved filter settings if available
  const loadSavedFilters = (): Partial<FilterOptions> => {
    try {
      const savedFilters = localStorage.getItem('songFilters');
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.error('Error loading saved filters:', error);
    }
    return {};
  };
  
  const savedFilters = loadSavedFilters();
  
  const [searchText, setSearchText] = useState<string>(savedFilters.searchText || '');
  const [difficulty, setDifficulty] = useState<string>(savedFilters.difficulty || 'ALL');
  const [levelRange, setLevelRange] = useState<number[]>([
    savedFilters.minLevel || (game?.minLevel || 1), 
    savedFilters.maxLevel || (game?.maxLevel || 37)
  ]);
  const [tag, setTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>(savedFilters.tags || []);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(savedFilters.favoritesOnly || false);
  
  // Filter panel expansion state
  const [expanded, setExpanded] = useState<boolean>(false);
  
  const difficulties = game?.difficulties || [];
  
  // Get min and max levels from the game - デフォルト値を修正
  const minLevel = game?.minLevel || 1;
  const maxLevel = game?.maxLevel || 37;
  
  useEffect(() => {
    // Reset difficulty when game changes
    setDifficulty('ALL');
    
    // Reset level range when game changes
    if (game) {
      // ゲームの設定値またはデフォルト値を使用
      const gameMinLevel = game.minLevel || 1;
      const gameMaxLevel = game.maxLevel || 37;
      setLevelRange([gameMinLevel, gameMaxLevel]);
    }
  }, [game]);
  
  // Save filters to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('songFilters', JSON.stringify({
        searchText,
        difficulty,
        minLevel: levelRange[0],
        maxLevel: levelRange[1],
        tags,
        favoritesOnly
      }));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, [searchText, difficulty, levelRange, tags, favoritesOnly]);
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchText = event.target.value;
    setSearchText(newSearchText);
    updateFilters({ searchText: newSearchText });
  };
  
  const handleDifficultyChange = (event: SelectChangeEvent) => {
    const newDifficulty = event.target.value;
    setDifficulty(newDifficulty);
    updateFilters({ difficulty: newDifficulty });
  };
  
  const handleLevelRangeChange = (_event: Event, newValue: number | number[]) => {
    const newRange = newValue as number[];
    setLevelRange(newRange);
    updateFilters({ minLevel: newRange[0], maxLevel: newRange[1] });
  };
  
  const handleTagInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTag(event.target.value);
  };
  
  const handleTagInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && tag.trim() !== '') {
      event.preventDefault();
      if (!tags.includes(tag.trim())) {
        const newTags = [...tags, tag.trim()];
        setTags(newTags);
        updateFilters({ tags: newTags });
      }
      setTag('');
    }
  };
  
  const handleTagDelete = (tagToDelete: string) => {
    const newTags = tags.filter((t) => t !== tagToDelete);
    setTags(newTags);
    updateFilters({ tags: newTags });
  };
  
  const handleFavoritesOnlyChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setFavoritesOnly(newValue);
    updateFilters({ favoritesOnly: newValue });
  };
  
  const updateFilters = (partialFilters: Partial<FilterOptions>) => {
    onFilterChange({
      searchText,
      difficulty,
      minLevel: levelRange[0],
      maxLevel: levelRange[1],
      tags,
      favoritesOnly,
      ...partialFilters
    });
  };
  
  // Filter panel expansion toggle
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  // Clear all filters
  const handleClearAllFilters = () => {
    setSearchText('');
    setDifficulty('ALL');
    setLevelRange([minLevel, maxLevel]);
    setTags([]);
    setFavoritesOnly(false);
    
    onFilterChange({
      searchText: '',
      difficulty: 'ALL',
      minLevel: minLevel,
      maxLevel: maxLevel,
      tags: [],
      favoritesOnly: false
    });
  };
  
  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      {/* Search bar and filter expansion toggle */}
      <Box sx={{ 
        p: isMobile ? 1 : 1.5, 
        display: 'flex', 
        alignItems: 'center',
        borderBottom: expanded ? 1 : 0,
        borderColor: 'divider'
      }}>
        <TextField
          fullWidth
          label="楽曲名・アーティスト名で検索"
          value={searchText}
          onChange={handleSearchChange}
          variant="outlined"
          size="small"
          sx={{ 
            mr: 1,
            '& .MuiInputBase-input': {
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              padding: isMobile ? '8px 10px' : '10px 14px',
            },
            '& .MuiInputLabel-root': {
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              transform: isMobile ? 'translate(10px, 9px) scale(1)' : undefined,
              '&.MuiInputLabel-shrink': {
                transform: isMobile ? 'translate(10px, -6px) scale(0.75)' : undefined,
              }
            }
          }}
        />
        
        {/* Favorites checkbox and filter button in one line */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="お気に入りのみ">
            <Checkbox
              icon={<FavoriteIcon />}
              checkedIcon={<FavoriteIcon />}
              checked={favoritesOnly}
              onChange={handleFavoritesOnlyChange}
              color="secondary"
              sx={{
                mr: 0.5,
                color: favoritesOnly ? 'secondary.main' : 'rgba(0, 0, 0, 0.3)',
                '&.Mui-checked': {
                  color: 'secondary.main',
                },
                padding: isMobile ? '4px' : '8px',
                '& .MuiSvgIcon-root': {
                  fontSize: isMobile ? '1.2rem' : '1.5rem'
                }
              }}
            />
          </Tooltip>
          
          <IconButton
            onClick={toggleExpanded}
            color="primary"
            size="small"
            sx={{ 
              padding: isMobile ? '4px' : '8px',
              borderRadius: '4px',
              bgcolor: 'rgba(63, 81, 181, 0.08)',
              '&:hover': {
                bgcolor: 'rgba(63, 81, 181, 0.12)'
              }
            }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>
      
      {/* Expanded filter panel - reimagined for mobile */}
      <Collapse in={expanded}>
        <Box sx={{ p: isMobile ? 1 : 1.5, pt: 0.5 }}>
          {/* Title and clear button */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: isMobile ? 0.5 : 1 
          }}>
            <Typography variant="subtitle2" sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
              フィルター設定
            </Typography>
            
            <Button 
              size="small" 
              variant="text" 
              color="inherit"
              onClick={handleClearAllFilters}
              startIcon={<ClearIcon sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }} />}
              sx={{ 
                fontSize: isMobile ? '0.65rem' : '0.7rem',
                padding: '2px 6px',
                minWidth: 'auto'
              }}
            >
              クリア
            </Button>
          </Box>
          
          {/* Mobile optimized grid layout */}
          <Grid container spacing={1} sx={{ mb: 0.5 }}>
            {/* Difficulty select - 50% width on mobile */}
            <Grid item xs={6} sm={4}>
              <FormControl fullWidth size="small" sx={{ 
                '& .MuiInputLabel-root': {
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  transform: isMobile ? 'translate(10px, 8px) scale(1)' : undefined,
                  '&.MuiInputLabel-shrink': {
                    transform: isMobile ? 'translate(10px, -6px) scale(0.75)' : undefined,
                  }
                },
                '& .MuiSelect-select': {
                  fontSize: isMobile ? '0.7rem' : '0.8rem',
                  padding: isMobile ? '5px 10px' : '8px 14px',
                }
              }}>
                <InputLabel id="difficulty-select-label">難易度</InputLabel>
                <Select
                  labelId="difficulty-select-label"
                  value={difficulty}
                  label="難易度"
                  onChange={handleDifficultyChange}
                >
                  <MenuItem value="ALL" sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>すべて</MenuItem>
                  {difficulties.map(diff => (
                    <MenuItem key={diff.id} value={diff.id} sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                      <Box component="span" sx={{ 
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: diff.color,
                        mr: 1
                      }} />
                      {diff.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Favorites checkbox - 50% width on mobile */}
            <Grid item xs={6} sm={4}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={favoritesOnly}
                    onChange={handleFavoritesOnlyChange}
                    color="secondary"
                    size="small"
                  />
                }
                label="お気に入りのみ"
                sx={{ 
                  margin: 0, 
                  height: '100%', 
                  display: 'flex',
                  alignItems: 'center',
                  '& .MuiFormControlLabel-label': {
                    fontSize: isMobile ? '0.7rem' : '0.8rem'
                  }
                }}
              />
            </Grid>
            
            {/* Level range - full width */}
            <Grid item xs={12}>
              <Box sx={{ px: 1 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  mb: 0.5
                }}>
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}>
                    レベル範囲:
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: isMobile ? '0.65rem' : '0.7rem' }}>
                    {levelRange[0]} - {levelRange[1]}
                  </Typography>
                </Box>
                <Slider
                  value={levelRange}
                  onChange={handleLevelRangeChange}
                  valueLabelDisplay="auto"
                  min={minLevel}
                  max={maxLevel}
                  marks={[
                    { value: minLevel, label: minLevel.toString() },
                    { value: maxLevel, label: maxLevel.toString() }
                  ]}
                  size="small"
                  sx={{
                    '& .MuiSlider-markLabel': {
                      fontSize: isMobile ? '0.6rem' : '0.65rem'
                    },
                    // スライダーを操作しやすく
                    '& .MuiSlider-thumb': {
                      width: isMobile ? 16 : 12,
                      height: isMobile ? 16 : 12,
                    },
                    '& .MuiSlider-rail, & .MuiSlider-track': {
                      height: isMobile ? 4 : 2,
                    },
                    pt: 1,
                    pb: 0
                  }}
                />
              </Box>
            </Grid>
            
            {/* Tag input - full width */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                placeholder="タグ入力 (Enter で追加)"
                value={tag}
                onChange={handleTagInputChange}
                onKeyDown={handleTagInputKeyDown}
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiInputBase-input': {
                    fontSize: isMobile ? '0.7rem' : '0.75rem',
                    padding: isMobile ? '6px 10px' : '8px 14px',
                  }
                }}
              />
            </Grid>
          </Grid>
          
          {/* Tags display - if any exist */}
          {tags.length > 0 && (
            <Box sx={{ mt: 0.5, ml: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleTagDelete(tag)}
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ 
                    fontSize: isMobile ? '0.65rem' : '0.7rem',
                    height: isMobile ? '18px' : '24px',
                    '& .MuiChip-label': {
                      px: 0.5,
                      paddingLeft: 0.5,
                      paddingRight: 0.5
                    },
                    '& .MuiChip-deleteIcon': {
                      fontSize: isMobile ? '0.75rem' : '0.85rem',
                      margin: '0 2px 0 -4px'
                    }
                  }}
                />
              ))}
              
              {tags.length > 0 && (
                <Chip
                  label="タグをクリア"
                  size="small"
                  color="default"
                  onDelete={() => {
                    setTags([]);
                    updateFilters({ tags: [] });
                  }}
                  deleteIcon={<ClearIcon fontSize="small" />}
                  sx={{ 
                    fontSize: isMobile ? '0.65rem' : '0.7rem',
                    height: isMobile ? '18px' : '24px',
                    '& .MuiChip-label': {
                      px: 0.5
                    }
                  }}
                />
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default React.memo(FilterControls);