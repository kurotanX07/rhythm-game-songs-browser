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
      <Box my={2}>
        <Typography variant="body1">
          ゲームデータがありません。
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box my={2}>
      <FormControl fullWidth>
        <InputLabel id="game-select-label">ゲームタイトル</InputLabel>
        <Select
          labelId="game-select-label"
          id="game-select"
          value={selectedGameId || ''}
          label="ゲームタイトル"
          onChange={handleChange}
        >
          {games.map((game) => (
            <MenuItem key={game.id} value={game.id}>
              {game.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default GameSelector;