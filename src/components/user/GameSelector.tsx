import React from 'react';
import { 
  FormControl, InputLabel, Select, MenuItem, 
  SelectChangeEvent, Box, Typography
} from '@mui/material';
import { Game } from '../../types/Game';

interface GameSelectorProps {
  games: Game[];
  selectedGameId: string | null;
  onGameSelect: (gameId: string) => void;
}

const GameSelector: React.FC<GameSelectorProps> = ({ 
  games, 
  selectedGameId, 
  onGameSelect 
}) => {
  const handleChange = (event: SelectChangeEvent) => {
    onGameSelect(event.target.value);
  };
  
  if (games.length === 0) {
    return (
      <Box my={1}>
        <Typography variant="body1">
          ゲームデータがありません。
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small" variant="outlined">
        <InputLabel id="game-select-label" sx={{ fontSize: '0.85rem' }}>ゲームタイトル</InputLabel>
        <Select
          labelId="game-select-label"
          id="game-select"
          value={selectedGameId || ''}
          label="ゲームタイトル"
          onChange={handleChange}
          sx={{
            '& .MuiSelect-select': {
              fontSize: '0.85rem',
              py: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }
          }}
        >
          {games.map((game) => (
            <MenuItem key={game.id} value={game.id} sx={{ fontSize: '0.85rem' }}>
              {game.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default GameSelector;