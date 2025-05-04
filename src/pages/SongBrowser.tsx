import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert
} from '@mui/material';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import SEO from '../components/common/SEO';
import GameSelector from '../components/user/GameSelector';
import FilterControls, { FilterOptions } from '../components/user/FilterControls';
import SongList from '../components/user/SongList';
import { useSongData } from '../contexts/SongDataContext';

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
  
  // Handle URL query params for game selection
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const gameParam = params.get('game');
    
    if (gameParam && games.some(g => g.id === gameParam)) {
      selectGame(gameParam);
    }
  }, [location, games, selectGame]);
  
  // Update URL when game changes
  useEffect(() => {
    if (selectedGameId) {
      const params = new URLSearchParams(location.search);
      params.set('game', selectedGameId);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [selectedGameId, navigate, location]);
  
  const handleGameSelect = (gameId: string) => {
    selectGame(gameId);
  };
  
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
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
          <Typography variant="h4" component="h1" gutterBottom>
            楽曲一覧
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}
          
          <GameSelector 
            games={games}
            selectedGameId={selectedGameId}
            onGameSelect={handleGameSelect}
          />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <FilterControls onFilterChange={handleFilterChange} />
              <SongList songs={songs} filters={filters} />
            </>
          )}
        </Container>
      </ResponsiveLayout>
      <Footer />
    </>
  );
};

export default SongBrowser;