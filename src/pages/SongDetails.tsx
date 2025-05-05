// src/pages/SongDetails.tsx
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
  const { songs, games, loading, error, refreshSongs } = useSongData();
  const [song, setSong] = useState<Song | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const navigate = useNavigate();
  
  // Find song and game from the context
  useEffect(() => {
    if (!songId || loading) return;
    
    // 楽曲IDからゲームIDを抽出（{gameId}_{songNo}の形式）
    const gameIdMatch = songId.match(/^(.+)_\d+$/);
    const gameId = gameIdMatch ? gameIdMatch[1] : null;
    
    const foundSong = songs.find(s => s.id === songId);
    
    if (foundSong) {
      // 楽曲が見つかった場合
      setSong(foundSong);
      const foundGame = games.find(g => g.id === foundSong.gameId);
      if (foundGame) {
        setGame(foundGame);
      } else {
        setGame(null);
      }
    } else if (gameId) {
      // 楽曲が見つからなかった場合、制限なしで再取得を試みる
      refreshSongs(gameId).then(() => {
        // 再取得後に再度検索
        const refreshedSong = songs.find(s => s.id === songId);
        if (refreshedSong) {
          setSong(refreshedSong);
          const foundGame = games.find(g => g.id === refreshedSong.gameId);
          if (foundGame) {
            setGame(foundGame);
          }
        } else {
          setSong(null);
        }
      });
    } else {
      setSong(null);
    }
  }, [songId, songs, games, loading, refreshSongs]);
  
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
            <SongDetail song={song} game={game} />
          )}
        </Container>
      </ResponsiveLayout>
      <Footer />
    </>
  );
};

export default SongDetails;