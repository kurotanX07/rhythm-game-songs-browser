import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, FormControl, 
  InputLabel, Select, MenuItem, SelectChangeEvent,
  Chip, IconButton, Slider, Stack, Paper, Button,
  Collapse
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
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
}

const FilterControls: React.FC<FilterControlsProps> = ({ 
  onFilterChange, 
  game 
}) => {
  const [searchText, setSearchText] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>('ALL');
  const [levelRange, setLevelRange] = useState<number[]>([1, 15]);
  const [tag, setTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  
  // フィルター開閉状態の追加
  const [expanded, setExpanded] = useState<boolean>(false);
  
  const difficulties = game?.difficulties || [];
  
  // Get min and max levels from the game - デフォルト値を修正
  const minLevel = game?.minLevel || 1;
  const maxLevel = game?.maxLevel || 37; // デフォルト最大値を37に変更
  
  useEffect(() => {
    // Reset difficulty when game changes
    setDifficulty('ALL');
    
    // Reset level range when game changes
    if (game) {
      // ゲームの設定値またはデフォルト値を使用
      const gameMinLevel = game.minLevel || 1;
      const gameMaxLevel = game.maxLevel || 37; // 最大値のデフォルトを37に設定
      setLevelRange([gameMinLevel, gameMaxLevel]);
    }
  }, [game]);
  
  // Input handlers and filter updates remain the same
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
  
  const updateFilters = (partialFilters: Partial<FilterOptions>) => {
    onFilterChange({
      searchText,
      difficulty,
      minLevel: levelRange[0],
      maxLevel: levelRange[1],
      tags,
      ...partialFilters
    });
  };
  
  // フィルター開閉ハンドラー
  const toggleExpanded = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Paper sx={{ mb: 2, overflow: 'hidden' }}>
      {/* 検索バーとフィルター開閉ボタン - 常に表示 */}
      <Box sx={{ 
        p: 1.5, 
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
          sx={{ mr: 1 }}
        />
        
        <Button
          onClick={toggleExpanded}
          color="primary"
          startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          endIcon={<FilterListIcon />}
          variant="outlined"
          size="small"
        >
          フィルター
        </Button>
      </Box>
      
      {/* 詳細フィルター - 開閉可能 */}
      <Collapse in={expanded}>
        <Box sx={{ p: 1.5, pt: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 1 }}>
            <FormControl sx={{ minWidth: 120, flexGrow: 0 }}>
              <InputLabel id="difficulty-select-label" size="small">難易度</InputLabel>
              <Select
                labelId="difficulty-select-label"
                id="difficulty-select"
                value={difficulty}
                label="難易度"
                onChange={handleDifficultyChange}
                size="small"
              >
                <MenuItem value="ALL">すべて</MenuItem>
                {difficulties.map(diff => (
                  <MenuItem key={diff.id} value={diff.id}>{diff.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ flexGrow: 1, minWidth: 200 }}>
              <Typography variant="body2" id="level-range-slider" gutterBottom>
                レベル範囲: {levelRange[0]} - {levelRange[1]}
              </Typography>
              <Slider
                value={levelRange}
                onChange={handleLevelRangeChange}
                valueLabelDisplay="auto"
                min={minLevel}
                max={maxLevel}
                aria-labelledby="level-range-slider"
                marks={[
                  { value: minLevel, label: minLevel.toString() },
                  { value: maxLevel, label: maxLevel.toString() }
                ]}
                size="small"
              />
            </Box>
          </Box>
          
          <Box sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="タグ（Enter で追加）"
              value={tag}
              onChange={handleTagInputChange}
              onKeyDown={handleTagInputKeyDown}
              variant="outlined"
              size="small"
              helperText="タグを入力して Enter キーを押すと追加されます"
            />
            
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleTagDelete(tag)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
              {tags.length > 0 && (
                <IconButton 
                  size="small" 
                  onClick={() => {
                    setTags([]);
                    updateFilters({ tags: [] });
                  }} 
                  color="error"
                >
                  <ClearIcon fontSize="small" />
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    全てクリア
                  </Typography>
                </IconButton>
              )}
            </Stack>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default FilterControls;