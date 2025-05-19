import React from 'react';
import { 
  FormControl, InputLabel, Select, MenuItem, 
  SelectChangeEvent, Box, Typography
} from '@mui/material';
import { Game } from '../../types/Game';
import { useTheme } from '@mui/material/styles';

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
  
  const theme = useTheme();
  
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
      <Typography
        variant="caption"
        sx={{
          fontSize: '0.8rem',
          display: 'block',
          mb: 0.5,
        }}
      >
        ゲームタイトル
      </Typography>
      <FormControl fullWidth size="small" variant="outlined" sx={{ mt: 0 }}>
        <Select
          id="game-select"
          value={selectedGameId || ''}
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
          MenuProps={{
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'right',
            },
            transformOrigin: {
              vertical: 'top',
              horizontal: 'right',
            },
            PaperProps: {
              sx: {
                zIndex: theme.zIndex.drawer + 2,
                backgroundColor: theme.palette.background.paper,
                minWidth: 200,
              },
            },
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