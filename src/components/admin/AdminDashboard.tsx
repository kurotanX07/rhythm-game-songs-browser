import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Paper, Divider,
  List, ListItem, ListItemIcon, ListItemText, Chip, CircularProgress,
  Button, Alert, Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import UpdateIcon from '@mui/icons-material/Update';
import PeopleIcon from '@mui/icons-material/People';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import CloseIcon from '@mui/icons-material/Close';
import { useSongData } from '../../contexts/SongDataContext';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { updateGameSongCount } from '../../services/songService';
import { getUpdateHistory, getAllUpdateHistory } from '../../services/updateService';

const AdminDashboard: React.FC = () => {
  const { games, songs, refreshDataAdmin } = useSongData();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalGames: 0,
    totalSongs: 0,
    recentUpdates: [] as { id?: string, title: string, description: string, date: Date }[]
  });
  
  // 履歴ダイアログの状態管理
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [allUpdates, setAllUpdates] = useState<{ id?: string, title: string, description: string, date: Date }[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        // Count games
        const gameCount = games.length;
        
        // Count songs directly from the songs collection
        let songCount = 0;
        
        // For each game, get the actual song count
        for (const game of games) {
          const songsQuery = query(
            collection(db, 'songs'),
            where('gameId', '==', game.id)
          );
          const snapshot = await getDocs(songsQuery);
          const actualSongCount = snapshot.docs.length;
          
          // If the game's songCount doesn't match the actual count, update it
          if (game.songCount !== actualSongCount) {
            console.warn(`Game ${game.id} has songCount=${game.songCount} but actually has ${actualSongCount} songs`);
          }
          
          songCount += actualSongCount;
        }
        
        // Get recent updates - 更新履歴の取得（最新5件のみ）
        const recentUpdates = await getUpdateHistory(5);
        
        // Set stats
        setStats({
          totalGames: gameCount,
          totalSongs: songCount,
          recentUpdates
        });
      } catch (error) {
        console.error('統計情報の取得に失敗しました:', error);
        setError('統計情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [games, songs]);

  // 全履歴データを取得する
  const fetchAllHistory = async () => {
    setLoadingHistory(true);
    try {
      const updates = await getAllUpdateHistory();
      setAllUpdates(updates);
    } catch (error) {
      console.error('履歴データの取得に失敗しました:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // 履歴ダイアログを開く
  const handleOpenHistoryDialog = () => {
    setHistoryDialogOpen(true);
    fetchAllHistory();
  };

  // 履歴ダイアログを閉じる
  const handleCloseHistoryDialog = () => {
    setHistoryDialogOpen(false);
  };

  // Function to refresh song counts manually
  const refreshSongCounts = async () => {
    try {
      setRefreshing(true);
      setError(null);
      setSuccess(null);
      
      // For each game, update the song count
      for (const game of games) {
        // Query for songs with this gameId
        const songsQuery = query(
          collection(db, 'songs'),
          where('gameId', '==', game.id)
        );
        
        const snapshot = await getDocs(songsQuery);
        const actualSongCount = snapshot.docs.length;
        
        // If the counts don't match, update it
        if (game.songCount !== actualSongCount) {
          console.log(`Updating game ${game.id} song count from ${game.songCount} to ${actualSongCount}`);
          await updateGameSongCount(game.id, actualSongCount);
        }
      }
      
      // Refresh the data
      await refreshDataAdmin();
      
      // Show success message
      setSuccess('楽曲数を更新しました');
    } catch (error: any) {
      console.error('楽曲数更新エラー:', error);
      setError(error?.message || '楽曲数の更新に失敗しました');
    } finally {
      setRefreshing(false);
    }
  };

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
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
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
      
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={refreshSongCounts}
          disabled={refreshing}
          startIcon={refreshing ? <CircularProgress size={20} /> : <UpdateIcon />}
        >
          楽曲数を更新
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          各ゲームの実際の楽曲数と表示されている楽曲数が一致しない場合は、このボタンをクリックして更新してください。
        </Typography>
      </Box>
      
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
                      secondary={`楽曲数: ${game.songCount}曲 / レベル範囲: ${game.minLevel || 1}-${game.maxLevel || 37}`}
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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" gutterBottom>
                最近の更新
              </Typography>
              <Button 
                size="small" 
                color="primary"
                onClick={handleOpenHistoryDialog}
                startIcon={<MoreHorizIcon />}
              >
                すべて表示
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {stats.recentUpdates.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                最近の更新はありません。
              </Typography>
            ) : (
              <List>
                {stats.recentUpdates.map((update, index) => (
                  <ListItem key={update.id || index}>
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
      
      {/* 履歴詳細ダイアログ */}
      <Dialog 
        open={historyDialogOpen} 
        onClose={handleCloseHistoryDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            更新履歴一覧
            <IconButton onClick={handleCloseHistoryDialog}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : allUpdates.length === 0 ? (
            <Typography>更新履歴がありません。</Typography>
          ) : (
            <List>
              {allUpdates.map((update, index) => (
                <React.Fragment key={update.id || index}>
                  <ListItem alignItems="flex-start">
                    <ListItemIcon>
                      <UpdateIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" component="span">
                          {update.title}
                        </Typography>
                      }
                      secondary={
                        <React.Fragment>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {update.date.toLocaleString()}
                          </Typography>
                          {update.description && (
                            <Typography
                              component="p"
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {update.description}
                            </Typography>
                          )}
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                  {index < allUpdates.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistoryDialog} color="primary">
            閉じる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminDashboard;