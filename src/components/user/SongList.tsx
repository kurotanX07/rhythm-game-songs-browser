// src/components/user/SongList.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tooltip,
  IconButton, Pagination, FormControl, InputLabel, Select,
  MenuItem, SelectChangeEvent, Slider, Switch, FormControlLabel,
  useMediaQuery, useTheme as useMuiTheme, TextField
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
import { Game } from '../../types/Game';
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
  // 一時的にシンプルなコンポーネントに変更
  return (
    <Box>
      <Typography>楽曲リスト（デバッグ中）</Typography>
      <Typography>楽曲数: {songs.length}</Typography>
    </Box>
  );
};

export default React.memo(SongList);