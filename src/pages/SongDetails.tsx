import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, CircularProgress, Alert,
  Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import SEO from '../components/common/SEO';
import SongDetail from '../components/user/SongDetail';
import { useSongData } from '../contexts/SongDataContext';
import { Song } from '../types/Song';
import { Game } from '../types/Game';

const SongDetails: React.FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const { songs, games, loading, error } = useSongData();
  const [song, setSong] = useState<Song | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const navigate = useNavigate();
  
  // Find song and game from the context
  useEffect(() => {
    if (!songId || loading) return;
    
    const foundSong = songs.find(s => s.id === songId);
    
    if (foundSong) {
      setSong(foundSong);
      const foundGame = games.find(g => g.id === foundSong.gameId);
      if (foundGame) {
        setGame(foundGame);
      }
    }
  }, [songId, songs, games, loading]);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  return (
    <>
      <SEO 
        title={song ? `${song.name} | 楽曲詳細` : '楽曲詳細'}
        description={song ? `${song.name} - ${game?.title || ''} の楽曲詳細情報` : '楽曲詳細情報'}
      />
      <Header />
      <ResponsiveLayout>
        <Container maxWidth="lg">
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mb: 2 }}
            variant="outlined"
          >
            戻る
          </Button>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          ) : !song ? (
            <Alert severity="warning" sx={{ my: 2 }}>
              楽曲が見つかりませんでした。
            </Alert>
          ) : (
            <SongDetail song={song} gameName={game?.title || ''} />
          )}
        </Container>
      </ResponsiveLayout>
      <Footer />
    </>
  );
};

export default SongDetails;