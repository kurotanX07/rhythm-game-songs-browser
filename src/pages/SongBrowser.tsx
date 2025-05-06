// src/pages/SongBrowser.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Paper, Button, Tooltip
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import SEO from '../components/common/SEO';
import GameSelector from '../components/user/GameSelector';
import FilterControls, { FilterOptions } from '../components/user/FilterControls';
import SongList from '../components/user/SongList';
import ExportDialog from '../components/user/ExportDialog';
import { useSongData } from '../contexts/SongDataContext';
import { Game } from '../types/Game';
import ErrorBoundary from '../components/common/ErrorBoundary';

const SongBrowser: React.FC = () => {
  const { games, selectedGameId, songs, loading, error, selectGame } = useSongData();
  const [filteredSongs, setFilteredSongs] = useState(songs);
  const [filters, setFilters] = useState<FilterOptions>({
    searchText: '',
    difficulty: 'ALL',
    minLevel: 1,
    maxLevel: 15,
    tags: [],
    favoritesOnly: false
  });
  
  // Export dialog state
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  
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
  
  // Update the filteredSongs state when filters or songs change
  useEffect(() => {
    if (!songs.length) {
      setFilteredSongs([]);
      return;
    }
    
    // Apply filters
    const filtered = songs.filter(song => {
      // Search text filter
      if (filters.searchText) {
        const searchTermLower = filters.searchText.toLowerCase();
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
      
      // Tag filter
      if (filters.tags.length > 0) {
        if (!song.info.tags || song.info.tags.length === 0) {
          return false;
        }
        
        const songTagsLower = song.info.tags.map(tag => tag.toLowerCase());
        const tagFiltersLower = filters.tags.map(tag => tag.toLowerCase());
        
        const hasMatchingTag = tagFiltersLower.some(filterTag => {
          return songTagsLower.some(songTag => songTag.includes(filterTag));
        });
        
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      // Favorites filter
      if (filters.favoritesOnly) {
        // This will be handled by the SongList component with useFavorites hook
      }
      
      return true;
    });
    
    setFilteredSongs(filtered);
  }, [songs, filters]);
  
  const handleGameSelect = (gameId: string) => {
    if (gameId !== selectedGameId) {
      selectGame(gameId);
    }
  };
  
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };
  
  // Handle export button click
  const handleExportClick = () => {
    setExportDialogOpen(true);
  };
  
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
            
            <GameSelector 
              games={games} 
              selectedGameId={selectedGameId} 
              onGameSelect={handleGameSelect} 
            />
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}
          
          <ErrorBoundary>
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
                
                {/* Export Button */}
                {filteredSongs.length > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Tooltip title="表示中の楽曲をエクスポート">
                      <Button
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportClick}
                      >
                        エクスポート ({filteredSongs.length}曲)
                      </Button>
                    </Tooltip>
                  </Box>
                )}
                
                <SongList 
                  songs={songs} 
                  filters={filters} 
                  game={selectedGame}
                />
                
                {/* Export Dialog */}
                <ExportDialog 
                  open={exportDialogOpen}
                  onClose={() => setExportDialogOpen(false)}
                  songs={filteredSongs}
                  game={selectedGame}
                  filteredCount={filteredSongs.length}
                />
              </>
            )}
          </ErrorBoundary>
        </Container>
      </ResponsiveLayout>
      <Footer />
    </>
  );
};

export default SongBrowser;