// src/components/admin/GameTitleManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Grid, Card, CardContent,
  CardActions, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Alert, Snackbar, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  FormControl, InputLabel, Select, MenuItem, Collapse
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Game, DifficultyDefinition } from '../../types/Game';
import { collection, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useSongData } from '../../contexts/SongDataContext';
import { useExcelParser } from '../../hooks/useExcelParser';
import { ExcelStructure, ColumnMapping } from '../../types/ExcelStructure';
import * as XLSX from 'xlsx';

const GAMES_COLLECTION = 'games';

// 標準の難易度設定
const DEFAULT_DIFFICULTIES: DifficultyDefinition[] = [
  { id: 'EASY', name: 'EASY', color: '#43a047', order: 0, minLevel: 1, maxLevel: 10 },
  { id: 'NORMAL', name: 'NORMAL', color: '#1976d2', order: 1, minLevel: 5, maxLevel: 20 },
  { id: 'HARD', name: 'HARD', color: '#ff9800', order: 2, minLevel: 15, maxLevel: 25 },
  { id: 'EXPERT', name: 'EXPERT', color: '#d32f2f', order: 3, minLevel: 20, maxLevel: 30 },
  { id: 'MASTER', name: 'MASTER', color: '#9c27b0', order: 4, minLevel: 25, maxLevel: 37 }
];

const GameTitleManager: React.FC = () => {
  const { games, refreshDataAdmin } = useSongData();
  const { 
    analyzeExcelFirstRow, 
    saveStructure, 
    updateMapping,
    loading: excelLoading, 
    error: excelError 
  } = useExcelParser();
  
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
  const [gameMinLevel, setGameMinLevel] = useState<number>(1);
  const [gameMaxLevel, setGameMaxLevel] = useState<number>(15);
  
  // Excelファイル選択関連
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelStructure, setExcelStructure] = useState<ExcelStructure | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelFirstRow, setExcelFirstRow] = useState<any[]>([]);
  const [excelAnalysisComplete, setExcelAnalysisComplete] = useState<boolean>(false);
  const [showColumnMappings, setShowColumnMappings] = useState<boolean>(false);
  
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
      setGameMinLevel(game.minLevel !== undefined ? game.minLevel : 1);
      setGameMaxLevel(game.maxLevel !== undefined ? game.maxLevel : 37); // デフォルト値を37に変更
      
      // 修正: difficulties が存在することを確認
      if (game.difficulties && Array.isArray(game.difficulties) && game.difficulties.length > 0) {
        setDifficulties([...game.difficulties]);
      } else {
        // デフォルト値を使用
        setDifficulties([...DEFAULT_DIFFICULTIES]);
      }
    } else {
      // 新規作成モード
      setIsEditing(false);
      setCurrentGame(null);
      setGameId('');
      setTitle('');
      setDescription('');
      setImageUrl('');
      setGameMinLevel(1);
      setGameMaxLevel(37); // デフォルト値を37に変更
      setDifficulties([...DEFAULT_DIFFICULTIES]);
    }
    
    // Excelファイル関連のリセット
    setExcelFile(null);
    setExcelStructure(null);
    setExcelHeaders([]);
    setExcelFirstRow([]);
    setExcelAnalysisComplete(false);
    setShowColumnMappings(false);
    
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
      { 
        id: '', 
        name: '', 
        color: '#888888', 
        order: difficulties.length,
        minLevel: 1,
        maxLevel: 37 // デフォルト値を37に変更
      }
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

  // Excelファイルハンドラ
  const handleExcelFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setExcelFile(event.target.files[0]);
      setExcelAnalysisComplete(false);
      setExcelStructure(null);
      setExcelHeaders([]);
      setExcelFirstRow([]);
      setShowColumnMappings(false);
    }
  };

  // Excel構造解析ハンドラ
  const handleAnalyzeExcel = async () => {
    if (!excelFile || !gameId.trim()) {
      setError('ExcelファイルとゲームIDが必要です');
      return;
    }

    try {
      setLoading(true);
      
      // ヘッダー行とデータを読み取る
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (!e.target?.result) {
            throw new Error('ファイル読み込みエラー');
          }
          
          const data = new Uint8Array(e.target.result as ArrayBuffer);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellDates: true,
            cellNF: true
          });
          
          // シート名を決定（指定がなければ最初のシート）
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // ヘッダー行（最初の行）のデータを取得
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
          const headers: string[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            headers.push(cell && cell.v ? String(cell.v).trim() : `Column ${col+1}`);
          }
          
          // 最初のデータ行を取得
          const firstRow: any[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
            const cell = worksheet[cellAddress];
            firstRow.push(cell ? cell.v : null);
          }
          
          // ヘッダーとデータ行をセット
          setExcelHeaders(headers);
          setExcelFirstRow(firstRow);
          
          // 実際に構造を解析
          const customId = gameId.trim() || `game_${Date.now()}`;
          const gameObj: Game = {
            id: customId,
            title: title || '新しいゲーム',
            songCount: 0,
            lastUpdated: new Date(),
            difficulties: difficulties,
            minLevel: gameMinLevel,
            maxLevel: gameMaxLevel
          };
          
          const structure = await analyzeExcelFirstRow(excelFile, customId, gameObj);
          
          setExcelStructure(structure);
          setExcelAnalysisComplete(true);
          setShowColumnMappings(true);
          setSuccess('Excelファイルの構造を解析しました');
        } catch (err: any) {
          console.error('Excel解析エラー:', err);
          setError(err.message || 'Excelファイルの解析に失敗しました');
        } finally {
          setLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('ファイル読み込みエラー');
        setLoading(false);
      };
      
      reader.readAsArrayBuffer(excelFile);
    } catch (err: any) {
      console.error('Excel解析エラー:', err);
      setError(err.message || 'Excelファイルの解析に失敗しました');
      setLoading(false);
    }
  };
  
  // 列マッピング更新ハンドラ
  const handleUpdateMapping = (field: string, subField: string | null, columnIndex: number) => {
    if (!excelStructure) return;
    
    // 更新関数を取得
    const updater = updateMapping(excelStructure, field, subField);
    
    // 更新関数を実行して結果を取得
    const updated = updater(columnIndex);
    
    // 状態を更新
    setExcelStructure(updated);
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
      
      // 各難易度のminLevelとmaxLevelを確保
      const formattedDifficulties = difficulties.map((diff, index) => ({
        id: diff.id,
        name: diff.name,
        color: diff.color,
        order: diff.order !== undefined ? diff.order : index,
        minLevel: diff.minLevel !== undefined ? diff.minLevel : 1,
        maxLevel: diff.maxLevel !== undefined ? diff.maxLevel : 15
      }));
      
      // 重要: 空の文字列は null に変換
      const descriptionValue = description.trim() || null;
      const imageUrlValue = imageUrl.trim() || null;
      
      // Firestoreに保存するデータを作成
      const firestoreData = {
        title: title.trim(),
        description: descriptionValue,
        imageUrl: imageUrlValue,
        songCount: isEditing ? currentGame?.songCount || 0 : 0,
        difficulties: formattedDifficulties,
        minLevel: gameMinLevel || 1,
        maxLevel: gameMaxLevel || 15,
        lastUpdated: serverTimestamp()
      };
      
      // デバッグ用にコンソールに表示
      console.log('Saving game with data:', firestoreData);
      
      if (isEditing && currentGame) {
        // 既存ゲームの更新
        await setDoc(doc(db, GAMES_COLLECTION, currentGame.id), firestoreData);
        setSuccess('ゲーム情報を更新しました');
      } else {
        // 新規ゲームの作成
        await setDoc(doc(db, GAMES_COLLECTION, customId), firestoreData);
        setSuccess('新しいゲームを追加しました');
      }

      // Excelファイルが選択され、解析が完了していれば構造情報も保存
      if (excelFile && excelStructure) {
        await saveStructure(excelStructure);
        setSuccess(prev => prev + ' / Excelファイル構造も保存しました');
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
  
  // 列インデックスを選択するためのメニューコンポーネント
  const ColumnSelector = ({ 
    currentValue, 
    onChange 
  }: { 
    currentValue: number, 
    onChange: (newValue: number) => void 
  }) => {
    return (
      <Select
        value={currentValue >= 0 ? currentValue : ''}
        onChange={(e) => onChange(Number(e.target.value))}
        size="small"
        sx={{ minWidth: 100 }}
      >
        <MenuItem value="">未設定</MenuItem>
        {excelHeaders.map((header, index) => (
          <MenuItem key={index} value={index}>
            {index+1}: {header}
          </MenuItem>
        ))}
      </Select>
    );
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
                  <Typography variant="body2" color="text.secondary">
                    レベル範囲: {game.minLevel || 1} - {game.maxLevel || 15}
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{isEditing ? 'ゲーム情報の編集' : '新規ゲーム追加'}</DialogTitle>
        <DialogContent>
          {/* 基本情報セクション */}
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            基本情報
          </Typography>
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
          
          {/* ゲーム全体のレベル範囲設定 */}
          <Box sx={{ mb: 2, mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              ゲーム全体のレベル範囲
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="最小レベル"
                size="small"
                type="number"
                value={gameMinLevel !== undefined ? gameMinLevel : 1}
                onChange={(e) => setGameMinLevel(parseInt(e.target.value) || 1)}
                sx={{ width: '120px' }}
              />
              <TextField
                label="最大レベル"
                size="small"
                type="number"
                value={gameMaxLevel !== undefined ? gameMaxLevel : 15}
                onChange={(e) => setGameMaxLevel(parseInt(e.target.value) || 15)}
                sx={{ width: '120px' }}
              />
              <Typography variant="body2" color="text.secondary">
                * フィルターのレベル範囲のデフォルト値として使用されます
              </Typography>
            </Box>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          {/* 難易度設定セクション */}
          <Typography variant="h6" gutterBottom>
            難易度設定
          </Typography>
          <Box sx={{ mb: 2 }}>
            {difficulties.map((diff, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <TextField
                  label="ID"
                  size="small"
                  value={diff.id}
                  onChange={(e) => handleDifficultyChange(index, 'id', e.target.value)}
                  sx={{ width: '100px' }}
                />
                <TextField
                  label="表示名"
                  size="small"
                  value={diff.name}
                  onChange={(e) => handleDifficultyChange(index, 'name', e.target.value)}
                  sx={{ width: '120px' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
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
                  value={diff.order !== undefined ? diff.order : index}
                  onChange={(e) => handleDifficultyChange(index, 'order', parseInt(e.target.value) || 0)}
                  sx={{ width: '70px' }}
                />
                <TextField
                  label="最小Lv"
                  size="small"
                  type="number"
                  value={diff.minLevel !== undefined ? diff.minLevel : 1}
                  onChange={(e) => handleDifficultyChange(index, 'minLevel', parseInt(e.target.value) || 1)}
                  sx={{ width: '80px' }}
                />
                <TextField
                  label="最大Lv"
                  size="small"
                  type="number"
                  value={diff.maxLevel !== undefined ? diff.maxLevel : 15}
                  onChange={(e) => handleDifficultyChange(index, 'maxLevel', parseInt(e.target.value) || 15)}
                  sx={{ width: '80px' }}
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

          <Divider sx={{ my: 3 }} />

          {/* Excelファイル構造解析セクション */}
          <Typography variant="h6" gutterBottom>
            楽曲リストExcelファイル構造解析 (オプション)
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              ゲーム作成時にExcelファイルをアップロードすると、自動的に楽曲データの構造を解析します。
              これにより、楽曲データのアップロード時に構造解析のステップをスキップできます。
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadIcon />}
                sx={{ mr: 2 }}
                disabled={!gameId.trim() || loading || excelLoading}
              >
                Excelファイルを選択
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={handleExcelFileChange}
                />
              </Button>
              {excelFile && (
                <Typography variant="body2">
                  {excelFile.name}
                </Typography>
              )}
            </Box>

            {excelFile && !excelAnalysisComplete && (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleAnalyzeExcel}
                disabled={loading || excelLoading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={24} /> : '構造を解析'}
              </Button>
            )}

            {excelAnalysisComplete && excelStructure && (
              <>
                <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                  Excelファイルの構造解析が完了しました。ゲーム保存時に一緒に構造情報も保存します。
                </Alert>
                
                {/* 列マッピング表示トグル */}
                <Button
                  variant="outlined"
                  onClick={() => setShowColumnMappings(!showColumnMappings)}
                  endIcon={showColumnMappings ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ mb: 2 }}
                >
                  {showColumnMappings ? '列マッピングを隠す' : '列マッピングを表示'}
                </Button>
                
                {/* 列マッピング表示セクション */}
                <Collapse in={showColumnMappings}>
                  <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Excel列マッピング調整
                    </Typography>
                    
                    {/* ヘッダー行とサンプルデータの表示 */}
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>列番号</TableCell>
                            {excelHeaders.map((header, index) => (
                              <TableCell key={index}>{index + 1}</TableCell>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>ヘッダー</TableCell>
                            {excelHeaders.map((header, index) => (
                              <TableCell key={index}>{header}</TableCell>
                            ))}
                          </TableRow>
                          <TableRow>
                            <TableCell>サンプル</TableCell>
                            {excelFirstRow.map((value, index) => (
                              <TableCell key={index}>
                                {value !== null && value !== undefined ? String(value) : ''}
                              </TableCell>
                            ))}
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* 基本フィールドのマッピング */}
                    <Typography variant="subtitle2" gutterBottom>
                      基本情報
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>フィールド</TableCell>
                            <TableCell>列番号</TableCell>
                            <TableCell>現在の値</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>楽曲番号 (Song No)</TableCell>
                            <TableCell>
                              <ColumnSelector
                                currentValue={excelStructure.columnMapping.songNo}
                                onChange={(value) => handleUpdateMapping('songNo', null, value)}
                              />
                            </TableCell>
                            <TableCell>
                              {excelStructure.columnMapping.songNo >= 0 && 
                               excelFirstRow[excelStructure.columnMapping.songNo] !== undefined ? 
                                String(excelFirstRow[excelStructure.columnMapping.songNo]) : ''}
                            </TableCell>
                          </TableRow>
                          
                          <TableRow>
                            <TableCell>楽曲名 (Name)</TableCell>
                            <TableCell>
                              <ColumnSelector
                                currentValue={excelStructure.columnMapping.name}
                                onChange={(value) => handleUpdateMapping('name', null, value)}
                              />
                            </TableCell>
                            <TableCell>
                              {excelStructure.columnMapping.name >= 0 && 
                               excelFirstRow[excelStructure.columnMapping.name] !== undefined ? 
                                String(excelFirstRow[excelStructure.columnMapping.name]) : ''}
                            </TableCell>
                          </TableRow>
                          
                          <TableRow>
                            <TableCell>実装番号 (Implementation No)</TableCell>
                            <TableCell>
                              <ColumnSelector
                                currentValue={excelStructure.columnMapping.implementationNo !== undefined ? 
                                  excelStructure.columnMapping.implementationNo : -1}
                                onChange={(value) => handleUpdateMapping('implementationNo', null, value)}
                              />
                            </TableCell>
                            <TableCell>
                              {excelStructure.columnMapping.implementationNo !== undefined && 
                               excelStructure.columnMapping.implementationNo >= 0 && 
                               excelFirstRow[excelStructure.columnMapping.implementationNo] !== undefined ? 
                                String(excelFirstRow[excelStructure.columnMapping.implementationNo]) : ''}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* 難易度レベルのマッピング */}
                    <Typography variant="subtitle2" gutterBottom>
                      難易度レベル
                    </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>難易度</TableCell>
                            <TableCell>レベル列</TableCell>
                            <TableCell>サンプル</TableCell>
                            <TableCell>コンボ数列</TableCell>
                            <TableCell>サンプル</TableCell>
                            <TableCell>YouTube URL列</TableCell>
                            <TableCell>サンプル</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {difficulties.map((diff) => {
                            const diffId = diff.id;
                            // 各難易度に対する列マッピングを取得
                            const levelCol = excelStructure.columnMapping.difficulties[diffId] !== undefined ? 
                              excelStructure.columnMapping.difficulties[diffId] : -1;
                              
                            const comboCol = excelStructure.columnMapping.combos[diffId] !== undefined ? 
                              excelStructure.columnMapping.combos[diffId] : -1;
                              
                            const ytCol = excelStructure.columnMapping.youtubeUrls[diffId] !== undefined ? 
                              excelStructure.columnMapping.youtubeUrls[diffId] : -1;
                            
                            return (
                              <TableRow key={diffId}>
                                <TableCell>
                                  <Box sx={{ 
                                    bgcolor: diff.color,
                                    color: 'white',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    display: 'inline-block',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold' 
                                  }}>
                                    {diff.name}
                                  </Box>
                                </TableCell>
                                
                                {/* レベル列 */}
                                <TableCell>
                                  <ColumnSelector
                                    currentValue={levelCol}
                                    onChange={(value) => handleUpdateMapping('difficulties', diffId, value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  {levelCol >= 0 && excelFirstRow[levelCol] !== undefined ? 
                                    String(excelFirstRow[levelCol]) : ''}
                                </TableCell>
                                
                                {/* コンボ数列 */}
                                <TableCell>
                                  <ColumnSelector
                                    currentValue={comboCol}
                                    onChange={(value) => handleUpdateMapping('combos', diffId, value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  {comboCol >= 0 && excelFirstRow[comboCol] !== undefined ? 
                                    String(excelFirstRow[comboCol]) : ''}
                                </TableCell>
                                
                                {/* YouTube URL列 */}
                                <TableCell>
                                  <ColumnSelector
                                    currentValue={ytCol}
                                    onChange={(value) => handleUpdateMapping('youtubeUrls', diffId, value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  {ytCol >= 0 && excelFirstRow[ytCol] !== undefined ? 
                                    String(excelFirstRow[ytCol]) : ''}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    
                    {/* 楽曲情報のマッピング */}
                    <Typography variant="subtitle2" gutterBottom>
                      楽曲情報
                    </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>フィールド</TableCell>
                            <TableCell>列番号</TableCell>
                            <TableCell>サンプル</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(excelStructure.columnMapping.info).map(([field, colIndex]) => {
                            // フィールド名の日本語表示用マッピング
                            const fieldDisplayNames: {[key: string]: string} = {
                              artist: 'アーティスト',
                              lyricist: '作詞',
                              composer: '作曲',
                              arranger: '編曲',
                              duration: '時間',
                              bpm: 'BPM',
                              addedDate: '追加日',
                              tags: 'タグ'
                            };
                            
                            return (
                              <TableRow key={field}>
                                <TableCell>{fieldDisplayNames[field] || field}</TableCell>
                                <TableCell>
                                  <ColumnSelector
                                    currentValue={colIndex !== undefined ? colIndex as number : -1}
                                    onChange={(value) => handleUpdateMapping('info', field, value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  {colIndex !== undefined && (colIndex as number) >= 0 && 
                                   excelFirstRow[(colIndex as number)] !== undefined ? 
                                    String(excelFirstRow[(colIndex as number)]) : ''}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Paper>
                </Collapse>
              </>
            )}

            {excelError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {excelError}
              </Alert>
            )}
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
            disabled={loading || excelLoading}
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