// src/components/admin/GameTitleManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Card, CardContent,
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Alert, Snackbar, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Game, DifficultyDefinition } from '../../types/Game';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSongData } from '../../contexts/SongDataContext';

const GAMES_COLLECTION = 'games';

// 標準の難易度設定
const DEFAULT_DIFFICULTIES: DifficultyDefinition[] = [
  { id: 'EASY', name: 'EASY', color: '#43a047', order: 0 },
  { id: 'NORMAL', name: 'NORMAL', color: '#1976d2', order: 1 },
  { id: 'HARD', name: 'HARD', color: '#ff9800', order: 2 },
  { id: 'EXPERT', name: 'EXPERT', color: '#d32f2f', order: 3 },
  { id: 'MASTER', name: 'MASTER', color: '#9c27b0', order: 4 }
];

const GameTitleManager: React.FC = () => {
  const { games, refreshDataAdmin } = useSongData();
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
  const [difficulties, setDifficulties] = useState<DifficultyDefinition[]>([...DEFAULT_DIFFICULTIES]);
  
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
      setDifficulties(game.difficulties || [...DEFAULT_DIFFICULTIES]);
    } else {
      // 新規作成モード
      setIsEditing(false);
      setCurrentGame(null);
      setGameId('');
      setTitle('');
      setDescription('');
      setImageUrl('');
      setDifficulties([...DEFAULT_DIFFICULTIES]);
    }
    
    setDialogOpen(true);
  };
  
  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setDialogOpen(false);
  };
  
  // 難易度追加
  const addDifficulty = () => {
    setDifficulties([
      ...difficulties,
      { id: '', name: '', color: '#888888', order: difficulties.length }
    ]);
  };
  
  // 難易度削除
  const removeDifficulty = (index: number) => {
    setDifficulties(difficulties.filter((_, i) => i !== index));
  };
  
  // 難易度変更
  const handleDifficultyChange = (index: number, field: keyof DifficultyDefinition, value: string | number) => {
    const newDifficulties = [...difficulties];
    newDifficulties[index] = { ...newDifficulties[index], [field]: value };
    setDifficulties(newDifficulties);
  };
  
  // ゲームの保存
  const handleSaveGame = async () => {
    if (!title.trim()) {
      setError('ゲームタイトルを入力してください');
      return;
    }
    
    // 難易度IDが重複していないか確認
    const diffIds = difficulties.map(d => d.id);
    if (diffIds.some(id => !id.trim())) {
      setError('難易度IDを入力してください');
      return;
    }
    if (new Set(diffIds).size !== diffIds.length) {
      setError('難易度IDが重複しています');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const customId = gameId.trim() || `game_${Date.now()}`;
      const gameData = {
        id: isEditing ? currentGame!.id : customId,
        title: title.trim(),
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        songCount: isEditing ? currentGame?.songCount || 0 : 0,
        lastUpdated: new Date(),
        difficulties: difficulties
      };
      
      if (isEditing && currentGame) {
        // 既存ゲームの更新
        await setDoc(doc(db, GAMES_COLLECTION, currentGame.id), gameData);
        setSuccess('ゲーム情報を更新しました');
      } else {
        // 新規ゲームの作成
        await setDoc(doc(db, GAMES_COLLECTION, customId), gameData);
        setSuccess('新しいゲームを追加しました');
      }
      
      // ダイアログを閉じる
      handleCloseDialog();
      
      // ゲーム一覧を更新（管理者特権で更新制限をバイパス）
      await refreshDataAdmin();
    } catch (err: any) {
      console.error('ゲーム保存エラー:', err);
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
      
      // ゲーム一覧を更新（管理者特権で更新制限をバイパス）
      await refreshDataAdmin();
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
                  
                  {/* 難易度バッジの表示 */}
                  {game.difficulties && game.difficulties.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {game.difficulties.map((diff, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            bgcolor: diff.color,
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 'bold'
                          }}
                        >
                          {diff.name}
                        </Box>
                      ))}
                    </Box>
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
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
          
          <Divider sx={{ my: 3 }} />
          
          {/* 難易度設定セクション */}
          <Typography variant="h6" gutterBottom>
            難易度設定
          </Typography>
          <Box sx={{ mb: 2 }}>
            {difficulties.map((diff, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  label="ID"
                  size="small"
                  value={diff.id}
                  onChange={(e) => handleDifficultyChange(index, 'id', e.target.value)}
                  sx={{ mr: 1, width: '100px' }}
                />
                <TextField
                  label="表示名"
                  size="small"
                  value={diff.name}
                  onChange={(e) => handleDifficultyChange(index, 'name', e.target.value)}
                  sx={{ mr: 1, width: '120px' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <Box sx={{ mr: 1 }}>色:</Box>
                  <input
                    type="color"
                    value={diff.color}
                    onChange={(e) => handleDifficultyChange(index, 'color', e.target.value)}
                  />
                </Box>
                <TextField
                  label="順序"
                  size="small"
                  type="number"
                  value={diff.order}
                  onChange={(e) => handleDifficultyChange(index, 'order', parseInt(e.target.value) || 0)}
                  sx={{ mr: 1, width: '70px' }}
                />
                <IconButton onClick={() => removeDifficulty(index)} color="error" disabled={difficulties.length <= 1}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={addDifficulty}
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            >
              難易度を追加
            </Button>
          </Box>
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