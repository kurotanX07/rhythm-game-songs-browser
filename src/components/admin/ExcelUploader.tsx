import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, FormControl, InputLabel, Select,
  MenuItem, TextField, Paper, Alert, AlertTitle, CircularProgress,
  Grid, Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useExcelParser } from '../../hooks/useExcelParser';
import { useSongData } from '../../contexts/SongDataContext';
import { Game } from '../../types/Game';
import { Song } from '../../types/Song';
import { FormControlLabel, Checkbox } from '@mui/material';

const ExcelUploader: React.FC = () => {
  const { games, refreshData } = useSongData();
  const { 
    songs, structure, loading, error, 
    analyzeExcel, parseExcel, uploadSongs 
  } = useExcelParser();
  
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 有効な楽曲数を取得 (1曲分少なくする)
  const validSongCount = songs && Array.isArray(songs) ? 
  Math.max(0, songs.filter(song => song && song.name && song.name.trim() !== '').length - 1) : 0;
  
  // ゲーム選択ハンドラ
  const handleGameChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedGameId(event.target.value as string);
    // ゲームを変更したら、ステップとファイル選択をリセット
    setActiveStep(0);
    setFile(null);
    setSuccess(null);
  };
  
  // ファイル選択ハンドラ
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setActiveStep(1);
    }
  };
  
  // ファイル選択ボタンのクリックハンドラ
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const [reanalyzeStructure, setReanalyzeStructure] = useState<boolean>(false);

  // ファイル解析ハンドラ
  const handleParseFile = async () => {
    if (!file || !selectedGameId) return;
    
    try {
      const selectedGame = games.find(g => g.id === selectedGameId);
      if (!selectedGame) {
        throw new Error('選択されたゲームが見つかりません');
      }
      
      // Pass reanalyzeStructure flag to force reanalysis if needed
      const parsedSongs = await parseExcel(file, selectedGameId, reanalyzeStructure);
      
      // Next step...
      setActiveStep(2);
    } catch (err) {
      console.error('ファイル解析エラー:', err);
    }
  };
  
  // アップロードハンドラ
  const handleUpload = async () => {
    if (!file || !selectedGameId || validSongCount === 0) return;
    
    try {
      // 空でない有効な楽曲のみをフィルタリング (最後の1つを除外)
      const validSongs = songs
        .filter(song => song && song.name && song.name.trim() !== '')
        .slice(0, -1); // 最後の1つを除外
      
      // 楽曲データをアップロード (フィルタリングされた曲のみ)
      await uploadSongs(selectedGameId, validSongs, file);
      
      // Check for errors from the upload process
      if (error) {
        // Error will be displayed automatically through the error state
        // but we still advance to the next step since some data was saved
        setActiveStep(3);
        setSuccess(`${validSongCount}曲のデータは保存されましたが、Excelファイルのアップロードに問題がありました。`);
      } else {
        // Full success
        setSuccess(`${validSongCount}曲のデータをアップロードしました`);
        // 最終ステップへ
        setActiveStep(3);
      }
      
      // データを更新
      await refreshData();
    } catch (err: any) {
      console.error('アップロードエラー:', err);
      // Don't advance the step if a critical error occurred
    }
  };
  
  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        楽曲データアップロード
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>エラー</AlertTitle>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
          <AlertTitle>成功</AlertTitle>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
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
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="contained"
                component="label"
                startIcon={<CloudUploadIcon />}
                disabled={!selectedGameId || loading}
                onClick={handleSelectFileClick}
                sx={{ mr: 2 }}
              >
                Excelファイルを選択
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {file && (
                <Typography variant="body2" color="text.secondary">
                  {file.name}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Stepper activeStep={activeStep} orientation="vertical">
        <Step key="select">
          <StepLabel>ゲームとファイルを選択</StepLabel>
          <StepContent>
            <Typography variant="body2" color="text.secondary">
              アップロードしたいゲームタイトルとExcelファイルを選択してください。
            </Typography>
          </StepContent>
        </Step>
        
        <Step key="parse">
          <StepLabel>ファイルを解析</StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              選択したExcelファイルを解析して楽曲データを取得します。
            </Typography>
            
            {/* ここに新しいチェックボックスを追加 */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={reanalyzeStructure}
                  onChange={(e) => setReanalyzeStructure(e.target.checked)}
                  disabled={loading}
                />
              }
              label="Excel構造を再解析する（列の変更がある場合）"
            />
            
            <Button
              variant="contained"
              onClick={handleParseFile}
              disabled={loading}
              sx={{ mt: 1, mr: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'ファイルを解析'}
            </Button>
          </StepContent>
        </Step>
        
        <Step key="confirm">
          <StepLabel>データを確認してアップロード</StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              {validSongCount}曲のデータが取得されました。
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={loading}
                sx={{ mt: 1, mr: 1 }}
              >
                {loading ? <CircularProgress size={24} /> : 'アップロード'}
              </Button>
            </Box>
          </StepContent>
        </Step>
        
        <Step key="complete">
          <StepLabel>アップロード完了</StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              データのアップロードが完了しました。
            </Typography>
            <Button
              onClick={() => {
                setActiveStep(0);
                setFile(null);
                setSuccess(null);
              }}
              sx={{ mt: 1, mr: 1 }}
            >
              新しいファイルをアップロード
            </Button>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
};

export default ExcelUploader;