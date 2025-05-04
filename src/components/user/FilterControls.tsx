import React, { useState } from 'react';
import { 
  Box, Typography, TextField, FormControl, 
  InputLabel, Select, MenuItem, SelectChangeEvent,
  Chip, IconButton, Slider, Stack
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { DifficultyLevel } from '../../types/Song';

interface FilterControlsProps {
  onFilterChange: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  searchText: string;
  difficulty: DifficultyLevel | 'ALL';
  minLevel: number;
  maxLevel: number;
  tags: string[];
}

const FilterControls: React.FC<FilterControlsProps> = ({ onFilterChange }) => {
  const [searchText, setSearchText] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'ALL'>('ALL');
  const [levelRange, setLevelRange] = useState<number[]>([1, 15]);
  const [tag, setTag] = useState<string>('');
  const [tags, setTags] = useState<string[]>([]);
  
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchText = event.target.value;
    setSearchText(newSearchText);
    updateFilters({ searchText: newSearchText });
  };
  
  const handleDifficultyChange = (event: SelectChangeEvent) => {
    const newDifficulty = event.target.value as DifficultyLevel | 'ALL';
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
  
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        フィルター
      </Typography>
      
      <TextField
        fullWidth
        label="楽曲名・アーティスト名で検索"
        value={searchText}
        onChange={handleSearchChange}
        margin="normal"
        variant="outlined"
        size="small"
      />
      
      <Box sx={{ display: 'flex', gap: 2, my: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="difficulty-select-label">難易度</InputLabel>
          <Select
            labelId="difficulty-select-label"
            id="difficulty-select"
            value={difficulty}
            label="難易度"
            onChange={handleDifficultyChange}
            size="small"
          >
            <MenuItem value="ALL">すべて</MenuItem>
            <MenuItem value="EASY">EASY</MenuItem>
            <MenuItem value="NORMAL">NORMAL</MenuItem>
            <MenuItem value="HARD">HARD</MenuItem>
            <MenuItem value="EXPERT">EXPERT</MenuItem>
            <MenuItem value="MASTER">MASTER</MenuItem>
            <MenuItem value="APPEND">APPEND</MenuItem>
          </Select>
        </FormControl>
        
        <Box sx={{ flexGrow: 1, ml: 2 }}>
          <Typography id="level-range-slider" gutterBottom>
            レベル範囲: {levelRange[0]} - {levelRange[1]}
          </Typography>
          <Slider
            value={levelRange}
            onChange={handleLevelRangeChange}
            valueLabelDisplay="auto"
            min={1}
            max={15}
            aria-labelledby="level-range-slider"
          />
        </Box>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="タグ（Enter で追加）"
          value={tag}
          onChange={handleTagInputChange}
          onKeyDown={handleTagInputKeyDown}
          margin="normal"
          variant="outlined"
          size="small"
          helperText="タグを入力して Enter キーを押すと追加されます"
        />
        
        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
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
              sx={{ ml: 1 }}
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
  );
};

export default FilterControls;