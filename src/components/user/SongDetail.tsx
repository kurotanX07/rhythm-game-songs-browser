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
import { Song, DifficultyLevel } from '../../types/Song';

interface SongDetailProps {
  song: Song;
  gameName: string;
}

const SongDetail: React.FC<SongDetailProps> = ({ song, gameName }) => {
  const navigate = useNavigate();
  const [selectedDifficulty, setSelectedDifficulty] = React.useState<DifficultyLevel>('EXPERT');
  
  // 有効な難易度を取得
  const availableDifficulties = Object.entries(song.difficulties)
    .filter(([_, info]) => info.level !== null)
    .map(([diff, _]) => diff as DifficultyLevel);
  
  // 最初に利用可能な難易度を選択
  React.useEffect(() => {
    if (availableDifficulties.length > 0 && !song.difficulties[selectedDifficulty].level) {
      setSelectedDifficulty(availableDifficulties[0]);
    }
  }, [song]);
  
  // 難易度タブ変更ハンドラ
  const handleDifficultyChange = (_: React.SyntheticEvent, newValue: DifficultyLevel) => {
    setSelectedDifficulty(newValue);
  };
  
  // 難易度表示のバッジの色設定
  const getDifficultyColor = (difficulty: DifficultyLevel): string => {
    switch (difficulty) {
      case 'EASY':
        return '#43a047';
      case 'NORMAL':
        return '#1976d2';
      case 'HARD':
        return '#ff9800';
      case 'EXPERT':
        return '#d32f2f';
      case 'MASTER':
        return '#9c27b0';
      case 'APPEND':
        return '#607d8b';
      default:
        return '#9e9e9e';
    }
  };
  
  // 一覧に戻るハンドラ
  const handleBackClick = () => {
    navigate('/songs');
  };
  
  // 現在選択されている難易度情報
  const currentDiffInfo = song.difficulties[selectedDifficulty];
  
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
                {gameName} - No.{song.songNo}
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
                    {(['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER', 'APPEND'] as DifficultyLevel[])
                      .filter(diff => song.difficulties[diff].level !== null)
                      .map(diff => (
                        <TableRow key={diff}>
                          <TableCell>
                            <Chip
                              label={diff}
                              size="small"
                              sx={{
                                bgcolor: getDifficultyColor(diff),
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">{song.difficulties[diff].level}</TableCell>
                          <TableCell align="center">{song.difficulties[diff].combo || '-'}</TableCell>
                        </TableRow>
                      ))}
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
              {availableDifficulties.map(diff => (
                <Tab 
                  key={diff} 
                  label={diff} 
                  value={diff} 
                  disabled={!song.difficulties[diff].youtubeUrl}
                  sx={{
                    color: song.difficulties[diff].youtubeUrl 
                      ? getDifficultyColor(diff) 
                      : 'text.disabled',
                    fontWeight: 'bold'
                  }}
                />
              ))}
            </Tabs>
            
            {currentDiffInfo.youtubeUrl ? (
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