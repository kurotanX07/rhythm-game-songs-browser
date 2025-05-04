import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper, Divider,
  List, ListItem, ListItemIcon, ListItemText, Chip, CircularProgress
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import UpdateIcon from '@mui/icons-material/Update';
import PeopleIcon from '@mui/icons-material/People';
import { useSongData } from '../../contexts/SongDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';

const AdminDashboard: React.FC = () => {
  const { games, songs } = useSongData();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalGames: 0,
    totalSongs: 0,
    recentUpdates: [] as { title: string, date: Date }[]
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // 統計データを集計
        const gameCount = games.length;
        const songCount = songs.length;
        
        // 最近の更新情報を取得
        const recentUpdates: { title: string, date: Date }[] = [];
        
        // Firestoreからデータが取得できたら処理
        setStats({
          totalGames: gameCount,
          totalSongs: songCount,
          recentUpdates
        });
      } catch (error) {
        console.error('統計情報の取得に失敗しました:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [games, songs]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>管理ダッシュボード</Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SportsEsportsIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    ゲーム数
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalGames}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MusicNoteIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    楽曲数
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalSongs}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <UpdateIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    最終更新
                  </Typography>
                  <Typography variant="h6">
                    {stats.recentUpdates.length > 0 
                      ? stats.recentUpdates[0].date.toLocaleDateString() 
                      : '未更新'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PeopleIcon sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    管理者
                  </Typography>
                  <Typography variant="h6" noWrap>
                    {currentUser?.email || 'Unknown'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              ゲーム一覧
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {games.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                登録されているゲームはありません。
              </Typography>
            ) : (
              <List>
                {games.map((game) => (
                  <ListItem key={game.id}>
                    <ListItemIcon>
                      <SportsEsportsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={game.title}
                      secondary={`楽曲数: ${game.songCount}曲`}
                    />
                    <Chip label={`ID: ${game.id}`} size="small" variant="outlined" />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              最近の更新
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {stats.recentUpdates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                最近の更新はありません。
              </Typography>
            ) : (
              <List>
                {stats.recentUpdates.map((update, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <UpdateIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={update.title}
                      secondary={update.date.toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;