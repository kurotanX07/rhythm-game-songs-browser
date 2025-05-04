// src/components/admin/StructureAnalyzer.tsx
import React, { useState } from 'react';
import {
  Box, Typography, Button, FormControl, InputLabel, Select,
  MenuItem, Paper, Alert, CircularProgress, Grid, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
  Snackbar
} from '@mui/material';
import { useExcelParser } from '../../hooks/useExcelParser';
import { useSongData } from '../../contexts/SongDataContext';
import { ExcelStructure } from '../../types/ExcelStructure';
import { DifficultyLevel } from '../../types/Song';

const StructureAnalyzer: React.FC = () => {
  const { games } = useSongData();
  const { 
    structure, loading, error, 
    analyzeExcel, saveStructure, updateMapping 
  } = useExcelParser();
  
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // ゲーム選択ハンドラ
  const handleGameChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedGameId(event.target.value as string);
    setFile(null);
  };
  
  // ファイル選択ハンドラ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };
  
  // ファイル解析ハンドラ
  const handleAnalyzeFile = async () => {
    if (!file || !selectedGameId) return;
    
    try {
      // ファイル構造を解析
      await analyzeExcel(file, selectedGameId);
    } catch (err: any) {
      console.error('ファイル構造解析エラー:', err);
    }
  };
  
  // 構造保存ハンドラ
  const handleSaveStructure = async () => {
    if (!structure) return;
    
    try {
      await saveStructure();
      setSuccess('Excelファイルの構造情報を保存しました');
    } catch (err: any) {
      console.error('構造保存エラー:', err);
    }
  };
  
  // 列マッピング更新ハンドラ
  const handleUpdateMapping = (field: string, subField: string | null, columnIndex: number) => {
    if (!structure) return;
    
    // 更新関数を取得して実行
    const updater = updateMapping(structure, field, subField);
    // 列番号を渡して構造を更新
    updater(columnIndex);
  };
  
  // 成功メッセージをクリア
  const handleClearSuccess = () => {
    setSuccess(null);
  };
  
  // difficulty レベルを安全に表示するヘルパー関数
  const getDifficultyValue = (diff: string, type: 'difficulties' | 'combos' | 'youtubeUrls'): number | undefined => {
    if (!structure) return undefined;
    
    // 型アサーションを使用してTypeScriptに型を教える
    const difficultyLevel = diff as DifficultyLevel;
    return structure.columnMapping[type][difficultyLevel];
  };
  
  // 列番号を表示する関数
  const renderColumnNumber = (value: number | undefined): string => {
    return value !== undefined && value >= 0 ? `${value + 1}` : 'なし';
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Excelファイル構造解析
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel id="game-select-label">ゲームタイトル</InputLabel>
              <Select
                labelId="game-select-label"
                id="game-select"
                value={selectedGameId}
                label="ゲームタイトル"
                onChange={handleGameChange as any}
                disabled={loading}
              >
                {games.length === 0 ? (
                  <MenuItem value="" disabled>
                    ゲームが登録されていません
                  </MenuItem>
                ) : (
                  games.map((game) => (
                    <MenuItem key={game.id} value={game.id}>
                      {game.title}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              component="label"
              disabled={!selectedGameId || loading}
              sx={{ mr: 2 }}
            >
              Excelファイルを選択
              <input
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleFileChange}
              />
            </Button>
            {file && (
              <Typography variant="body2" component="span">
                {file.name}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={12} sm={12} md={4}>
            <Button
              variant="contained"
              onClick={handleAnalyzeFile}
              disabled={!file || loading}
              sx={{ mr: 2 }}
            >
              {loading ? <CircularProgress size={24} /> : '構造を解析'}
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleSaveStructure}
              disabled={!structure || loading}
            >
              構造を保存
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {structure && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            解析結果
          </Typography>
          
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                ゲームID:
              </Typography>
              <Typography variant="body1">
                {structure.gameId}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                シート名:
              </Typography>
              <Typography variant="body1">
                {structure.sheetName}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                ヘッダー行:
              </Typography>
              <Typography variant="body1">
                {structure.headerRow + 1}
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">
                データ開始行:
              </Typography>
              <Typography variant="body1">
                {structure.dataStartRow + 1}
              </Typography>
            </Grid>
          </Grid>
          
          <Typography variant="h6" gutterBottom>
            列マッピング
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ my: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>フィールド</TableCell>
                  <TableCell>列番号</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>楽曲番号 (Song No)</TableCell>
                  <TableCell>{structure.columnMapping.songNo >= 0 ? structure.columnMapping.songNo + 1 : 'なし'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>楽曲名 (Name)</TableCell>
                  <TableCell>{structure.columnMapping.name >= 0 ? structure.columnMapping.name + 1 : 'なし'}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>実装番号 (Implementation No)</TableCell>
                  <TableCell>{structure.columnMapping.implementationNo && structure.columnMapping.implementationNo >= 0 ? structure.columnMapping.implementationNo + 1 : 'なし'}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle1" gutterBottom>
            難易度レベル
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ my: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>難易度</TableCell>
                  <TableCell>レベル列</TableCell>
                  <TableCell>コンボ数列</TableCell>
                  <TableCell>YouTube URL列</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(['EASY', 'NORMAL', 'HARD', 'EXPERT', 'MASTER', 'APPEND'] as const).map((diff) => {
                  // 値を一度だけ取得
                  const difficultyValue = getDifficultyValue(diff, 'difficulties');
                  const comboValue = getDifficultyValue(diff, 'combos');
                  const youtubeValue = getDifficultyValue(diff, 'youtubeUrls');
                  
                  return (
                    <TableRow key={diff}>
                      <TableCell>{diff}</TableCell>
                      <TableCell>
                        {renderColumnNumber(difficultyValue)}
                      </TableCell>
                      <TableCell>
                        {renderColumnNumber(comboValue)}
                      </TableCell>
                      <TableCell>
                        {renderColumnNumber(youtubeValue)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="subtitle1" gutterBottom>
            楽曲情報
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ my: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>フィールド</TableCell>
                  <TableCell>列番号</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(structure.columnMapping.info).map(([field, colIndex]) => (
                  <TableRow key={field}>
                    <TableCell>
                      {field === 'artist' ? 'アーティスト' :
                       field === 'lyricist' ? '作詞' :
                       field === 'composer' ? '作曲' :
                       field === 'arranger' ? '編曲' :
                       field === 'duration' ? '時間' :
                       field === 'bpm' ? 'BPM' :
                       field === 'addedDate' ? '追加日' :
                       field === 'tags' ? 'タグ' : field}
                    </TableCell>
                    <TableCell>
                      {colIndex !== undefined && (colIndex as number) >= 0 ? (colIndex as number) + 1 : 'なし'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      
      <Snackbar
        open={!!success}
        autoHideDuration={5000}
        onClose={handleClearSuccess}
        message={success}
      />
    </Box>
  );
};

export default StructureAnalyzer;