// src/components/user/SongDetail.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Grid, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Tabs, Tab
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpeedIcon from '@mui/icons-material/Speed';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import YouTubePlayer from './YouTubePlayer';
import { Song } from '../../types/Song';
import { Game, DifficultyDefinition } from '../../types/Game';

interface SongDetailProps {
  song: Song;
  game: Game | null;
}

const SongDetail: React.FC<SongDetailProps> = ({ song, game }) => {
  const navigate = useNavigate();
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<string>('');
  
  // ゲームの難易度を順序でソート
  const sortedDifficulties = React.useMemo(() => {
    if (!game?.difficulties) return [];
    return [...game.difficulties].sort((a, b) => a.order - b.order);
  }, [game]);
  
  // 有効な難易度を取得
  const availableDifficulties = React.useMemo(() => {
    return sortedDifficulties.filter(diff => 
      song.difficulties[diff.id] && song.difficulties[diff.id].level !== null
    );
  }, [song, sortedDifficulties]);
  
  // 最初に利用可能な難易度を選択
  React.useEffect(() => {
    if (availableDifficulties.length > 0 && 
        (!selectedDifficulty || !song.difficulties[selectedDifficulty])) {
      setSelectedDifficulty(availableDifficulties[0].id);
    }
  }, [song, availableDifficulties, selectedDifficulty]);
  
  // 難易度タブ変更ハンドラ
  const handleDifficultyChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedDifficulty(newValue);
  };
  
  // 難易度定義を取得
  const getDifficultyDefinition = (id: string): DifficultyDefinition | undefined => {
    return game?.difficulties.find(d => d.id === id);
  };
  
  // 一覧に戻るハンドラ
  const handleBackClick = () => {
    navigate('/songs');
  };
  
  // 現在選択されている難易度情報
  const currentDiffInfo = selectedDifficulty ? song.difficulties[selectedDifficulty] : null;
  const currentDiffDef = selectedDifficulty ? getDifficultyDefinition(selectedDifficulty) : null;
  
  return (
    <Box sx={{ my: 3 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBackClick}
        sx={{ mb: 2 }}
        variant="outlined"
      >
        楽曲一覧に戻る
      </Button>
      
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MusicNoteIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" component="h1">
                {song.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {game?.title || ''} - No.{song.songNo}
                {song.implementationNo && ` (実装No.${song.implementationNo})`}
              </Typography>
            </Box>
          </Box>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  楽曲情報
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell component="th" scope="row">アーティスト</TableCell>
                        <TableCell>{song.info.artist || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">作詞</TableCell>
                        <TableCell>{song.info.lyricist || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">作曲</TableCell>
                        <TableCell>{song.info.composer || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">編曲</TableCell>
                        <TableCell>{song.info.arranger || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <AccessTimeIcon sx={{ mr: 1, fontSize: 'small' }} />
                            再生時間
                          </Box>
                        </TableCell>
                        <TableCell>{song.info.duration || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <SpeedIcon sx={{ mr: 1, fontSize: 'small' }} />
                            BPM
                          </Box>
                        </TableCell>
                        <TableCell>{song.info.bpm || '-'}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell component="th" scope="row">
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarTodayIcon sx={{ mr: 1, fontSize: 'small' }} />
                            追加日
                          </Box>
                        </TableCell>
                        <TableCell>
                          {song.info.addedDate 
                            ? song.info.addedDate.toLocaleDateString() 
                            : '-'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
              
              {song.info.tags && song.info.tags.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    タグ
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {song.info.tags.map((tag, index) => (
                      <Chip 
                        key={index} 
                        label={tag} 
                        color="primary" 
                        variant="outlined" 
                        size="small" 
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                難易度情報
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>難易度</TableCell>
                      <TableCell align="center">レベル</TableCell>
                      <TableCell align="center">コンボ数</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sortedDifficulties.filter(diff => {
                      const diffInfo = song.difficulties[diff.id];
                      return diffInfo && diffInfo.level !== null;
                    }).map(diff => {
                      const diffInfo = song.difficulties[diff.id];
                      return (
                        <TableRow key={diff.id}>
                          <TableCell>
                            <Chip
                              label={diff.name}
                              size="small"
                              sx={{
                                bgcolor: diff.color,
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">{diffInfo.level}</TableCell>
                          <TableCell align="center">{diffInfo.combo || '-'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              プレイ動画
            </Typography>
            
            <Tabs
              value={selectedDifficulty}
              onChange={handleDifficultyChange}
              aria-label="difficulty tabs"
              sx={{ mb: 2 }}
            >
              {availableDifficulties.map(diff => {
                const diffInfo = song.difficulties[diff.id];
                return (
                  <Tab 
                    key={diff.id} 
                    label={diff.name} 
                    value={diff.id} 
                    disabled={!diffInfo || !diffInfo.youtubeUrl}
                    sx={{
                      color: diffInfo && diffInfo.youtubeUrl 
                        ? diff.color 
                        : 'text.disabled',
                      fontWeight: 'bold'
                    }}
                  />
                );
              })}
            </Tabs>
            
            {currentDiffInfo && currentDiffInfo.youtubeUrl ? (
              <Box sx={{ mt: 2 }}>
                <YouTubePlayer url={currentDiffInfo.youtubeUrl} />
              </Box>
            ) : (
              <Typography variant="body1" color="text.secondary">
                この難易度のプレイ動画はありません。
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SongDetail;