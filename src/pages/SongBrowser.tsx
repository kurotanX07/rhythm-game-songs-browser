import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Paper, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent
} from '@mui/material';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import SEO from '../components/common/SEO';
import GameSelector from '../components/user/GameSelector';
import FilterControls, { FilterOptions } from '../components/user/FilterControls';
import SongList from '../components/user/SongList';
import { useSongData } from '../contexts/SongDataContext';
import { Game } from '../types/Game';

const SongBrowser: React.FC = () => {
  const { games, selectedGameId, songs, loading, error, selectGame } = useSongData();
  const [filters, setFilters] = useState<FilterOptions>({
    searchText: '',
    difficulty: 'ALL',
    minLevel: 1,
    maxLevel: 15,
    tags: []
  });
  
  const location = useLocation();
  const navigate = useNavigate();
  
  // URLから初期化する状態を追跡
  const initializedFromUrl = useRef(false);
  // URL更新中であることを追跡するフラグ
  const isUpdatingUrl = useRef(false);
  
  // 現在選択中のゲーム
  const selectedGame: Game | null = selectedGameId 
    ? games.find(g => g.id === selectedGameId) || null 
    : null;
  
  // Handle URL query params for game selection - ONLY ON INITIAL LOAD
  useEffect(() => {
    // まだURLから初期化していない場合のみ実行
    if (!initializedFromUrl.current && games.length > 0) {
      const params = new URLSearchParams(location.search);
      const gameParam = params.get('game');
      
      if (gameParam && games.some(g => g.id === gameParam)) {
        // URLからゲームを選択
        selectGame(gameParam);
      } else if (games.length > 0 && !selectedGameId) {
        // ゲームが選択されていない場合、最初のゲームを選択
        selectGame(games[0].id);
      }
      
      // 初期化済みとマーク
      initializedFromUrl.current = true;
    }
  }, [location, games, selectGame, selectedGameId]);
  
  // Update URL when game changes - PREVENT LOOPS
  useEffect(() => {
    // ゲームIDが選択され、URL更新中でない場合のみ実行
    if (selectedGameId && !isUpdatingUrl.current && initializedFromUrl.current) {
      isUpdatingUrl.current = true; // URL更新中フラグをセット
      
      const params = new URLSearchParams(location.search);
      const currentGameParam = params.get('game');
      
      // 現在のURLパラメータと異なる場合のみ更新
      if (currentGameParam !== selectedGameId) {
        params.set('game', selectedGameId);
        navigate({ search: params.toString() }, { replace: true });
      }
      
      // 少し遅延してフラグをリセット（非同期処理の競合を防止）
      setTimeout(() => {
        isUpdatingUrl.current = false;
      }, 50);
    }
  }, [selectedGameId, navigate, location]);
  
  const handleGameSelect = (gameId: string) => {
    if (gameId !== selectedGameId) {
      selectGame(gameId);
    }
  };
  
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };
  
  // より効率的なゲームセレクター（コンパクト化）
  const CompactGameSelector = () => (
    <FormControl size="small" sx={{ minWidth: 200, mb: 1 }}>
      <InputLabel id="compact-game-select-label">ゲームタイトル</InputLabel>
      <Select
        labelId="compact-game-select-label"
        value={selectedGameId || ''}
        label="ゲームタイトル"
        onChange={(e: SelectChangeEvent<string>) => handleGameSelect(e.target.value)}
      >
        {games.map((game) => (
          <MenuItem key={game.id} value={game.id}>
            {game.title}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
  
  return (
    <>
      <SEO 
        title="楽曲一覧" 
        description="リズムゲームの楽曲一覧と詳細情報"
      />
      <Header />
      <ResponsiveLayout>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" component="h1">
              楽曲一覧
            </Typography>
            
            <CompactGameSelector />
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <FilterControls 
                onFilterChange={handleFilterChange} 
                game={selectedGame}
              />
              <SongList 
                songs={songs} 
                filters={filters} 
                game={selectedGame}
              />
            </>
          )}
        </Container>
      </ResponsiveLayout>
      <Footer />
    </>
  );
};

export default SongBrowser;