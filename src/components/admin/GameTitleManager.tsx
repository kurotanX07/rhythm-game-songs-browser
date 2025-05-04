import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Card, CardContent,
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Alert, Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Game } from '../../types/Game';
import { collection, addDoc, doc, setDoc, deleteDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSongData } from '../../contexts/SongDataContext';

const GAMES_COLLECTION = 'games';

const GameTitleManager: React.FC = () => {
  const { games, refreshData } = useSongData();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 新規/編集用のダイアログの状態
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  
  // フォームフィールド
  const [gameId, setGameId] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  
  // 削除確認ダイアログ
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  
  // ダイアログを開く
  const handleOpenDialog = (game?: Game) => {
    if (game) {
      // 編集モード
      setIsEditing(true);
      setCurrentGame(game);
      setGameId(game.id);
      setTitle(game.title);
      setDescription(game.description || '');
      setImageUrl(game.imageUrl || '');
    } else {
      // 新規作成モード
      setIsEditing(false);
      setCurrentGame(null);
      setGameId('');
      setTitle('');
      setDescription('');
      setImageUrl('');
    }
    
    setDialogOpen(true);
  };
  
  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // ゲームの保存
  const handleSaveGame = async () => {
    if (!title.trim()) {
      setError('ゲームタイトルを入力してください');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const customId = gameId.trim() || `game_${Date.now()}`;
      const gameData = {
        title: title.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        songCount: isEditing ? currentGame?.songCount || 0 : 0,
        lastUpdated: new Date()
      };
      
      if (isEditing && currentGame) {
        // 既存ゲームの更新
        await setDoc(doc(db, GAMES_COLLECTION, currentGame.id), {
          ...gameData,
          id: currentGame.id
        });
        setSuccess('ゲーム情報を更新しました');
      } else {
        // 新規ゲームの作成
        await setDoc(doc(db, GAMES_COLLECTION, customId), {
          ...gameData,
          id: customId
        });
        setSuccess('新しいゲームを追加しました');
      }
      
      // ダイアログを閉じる
      handleCloseDialog();
      
      // ゲーム一覧を更新
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'ゲームの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // 削除確認ダイアログを開く
  const handleOpenDeleteDialog = (game: Game) => {
    setGameToDelete(game);
    setDeleteDialogOpen(true);
  };
  
  // 削除確認ダイアログを閉じる
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setGameToDelete(null);
  };
  
  // ゲームの削除
  const handleDeleteGame = async () => {
    if (!gameToDelete) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await deleteDoc(doc(db, GAMES_COLLECTION, gameToDelete.id));
      setSuccess(`${gameToDelete.title}を削除しました`);
      
      // ダイアログを閉じる
      handleCloseDeleteDialog();
      
      // ゲーム一覧を更新
      await refreshData();
    } catch (err: any) {
      setError(err.message || 'ゲームの削除に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // 成功メッセージをクリア
  const handleClearSuccess = () => {
    setSuccess(null);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">ゲームタイトル管理</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新規ゲーム追加
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : games.length === 0 ? (
        <Alert severity="info">
          ゲームが登録されていません。「新規ゲーム追加」ボタンをクリックして、最初のゲームを追加してください。
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {games.map(game => (
            <Grid item xs={12} sm={6} md={4} key={game.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {game.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {game.id}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    楽曲数: {game.songCount}曲
                  </Typography>
                  {game.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {game.description}
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <IconButton
                    color="primary"
                    onClick={() => handleOpenDialog(game)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    color="error"
                    onClick={() => handleOpenDeleteDialog(game)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* 新規/編集ダイアログ */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{isEditing ? 'ゲーム情報の編集' : '新規ゲーム追加'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            label="ゲームID（一意の識別子）"
            fullWidth
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
            disabled={isEditing}
            helperText={isEditing ? "既存のゲームIDは変更できません" : "空の場合は自動生成されます"}
          />
          <TextField
            margin="normal"
            label="ゲームタイトル"
            fullWidth
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            margin="normal"
            label="説明"
            fullWidth
            multiline
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            margin="normal"
            label="画像URL"
            fullWidth
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            helperText="ゲームの画像URLを入力（オプション）"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            キャンセル
          </Button>
          <Button
            onClick={handleSaveGame}
            color="primary"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '保存'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>削除の確認</DialogTitle>
        <DialogContent>
          <Typography>
            {gameToDelete?.title}を削除してもよろしいですか？
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>
            この操作は元に戻せません。このゲームに関連するすべての楽曲データも削除されます。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteGame}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : '削除'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 成功メッセージ */}
      <Snackbar
        open={!!success}
        autoHideDuration={5000}
        onClose={handleClearSuccess}
        message={success}
      />
    </Box>
  );
};

export default GameTitleManager;