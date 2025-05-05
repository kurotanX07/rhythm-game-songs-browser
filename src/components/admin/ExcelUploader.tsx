import React, { useState, useRef } from 'react';
import {
  Box, Typography, Button, FormControl, InputLabel, Select,
  MenuItem, TextField, Paper, Alert, AlertTitle, CircularProgress,
  Grid, Stepper, Step, StepLabel, StepContent, LinearProgress,
  Chip, Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import { useExcelParser } from '../../hooks/useExcelParser';
import { useSongData } from '../../contexts/SongDataContext';
import { Game } from '../../types/Game';
import { Song } from '../../types/Song';
import { FormControlLabel, Checkbox } from '@mui/material';

const ExcelUploader: React.FC = () => {
  const { games, refreshData } = useSongData();
  const { 
    songs, structure, loading, error, uploadProgress,
    analyzeExcel, parseExcel, uploadSongs 
  } = useExcelParser();
  
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get valid song count (no longer subtracting 1)
  const validSongCount = songs && Array.isArray(songs) ? 
    Math.max(0, songs.filter(song => song && song.name && song.name.trim() !== '').length) : 0;
  
  // Game selection handler
  const handleGameChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedGameId(event.target.value as string);
    // Reset step and file selection when game is changed
    setActiveStep(0);
    setFile(null);
    setSuccess(null);
  };
  
  // File selection handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setActiveStep(1);
    }
  };
  
  // File selection button click handler
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const [reanalyzeStructure, setReanalyzeStructure] = useState<boolean>(false);

  // File analysis handler
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
  
  // Upload handler
  const handleUpload = async () => {
    if (!file || !selectedGameId || validSongCount === 0) return;
    
    try {
      // Filter only valid songs with non-empty names
      const validSongs = songs
        .filter(song => song && song.name && song.name.trim() !== '');
      
      // Upload song data (filtered songs only)
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
        // Move to final step
        setActiveStep(3);
      }
      
      // Refresh data
      await refreshData();
    } catch (err: any) {
      console.error('アップロードエラー:', err);
      // Don't advance the step if a critical error occurred
    }
  };

  // New function to render progress information
  const renderProgress = () => {
    if (!uploadProgress || uploadProgress.phase === 'idle') {
      return null;
    }

    const { phase, fileProgress, songsProgress, message } = uploadProgress;
    
    let progressColor = 'primary';
    let icon = <CloudUploadIcon sx={{ mr: 1 }} />;
    
    if (phase === 'complete') {
      progressColor = 'success';
      icon = <CheckCircleIcon sx={{ mr: 1 }} />;
    } else if (error) {
      progressColor = 'error';
      icon = <WarningIcon sx={{ mr: 1 }} />;
    }

    return (
      <Paper sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {icon}
          <Typography variant="subtitle1">{message}</Typography>
        </Box>
        
        {songsProgress.total > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                楽曲データ ({songsProgress.current}/{songsProgress.total})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {songsProgress.percentage}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={songsProgress.percentage} 
              color={progressColor as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
        
        {phase === 'uploading' && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Excelファイル
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fileProgress.toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={fileProgress} 
              color={progressColor as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
        )}
      </Paper>
    );
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
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {file.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
        
        {/* Large file warning */}
        {file && file.size > 10 * 1024 * 1024 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            ファイルサイズが大きい（{(file.size / (1024 * 1024)).toFixed(2)} MB）ため、解析に時間がかかる場合があります。
            処理中はブラウザを閉じないでください。
          </Alert>
        )}

        {/* Progress display */}
        {renderProgress()}
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
            <Box sx={{ mb: 2 }}>
              {validSongCount > 0 ? (
                <Box>
                  <Typography variant="body2" paragraph sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip 
                      label={validSongCount} 
                      color="primary" 
                      sx={{ mr: 1, fontWeight: 'bold' }} 
                    />
                    曲のデータが取得されました
                  </Typography>
                  
                  {/* サンプルデータ表示 */}
                  {songs.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>データサンプル:</Typography>
                      <Paper variant="outlined" sx={{ p: 1, mb: 2, maxHeight: '150px', overflow: 'auto' }}>
                        {songs.slice(0, 5).map((song, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body2">
                              {song.songNo}. <strong>{song.name}</strong>
                              {song.info.artist ? ` - ${song.info.artist}` : ''}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              {Object.entries(song.difficulties)
                                .filter(([_, diff]) => diff.level !== null)
                                .map(([diffId, diff]) => {
                                  const difficultyDef = games.find(g => g.id === selectedGameId)?.difficulties.find(d => d.id === diffId);
                                  return (
                                    <Chip
                                      key={diffId}
                                      label={`${difficultyDef?.name || diffId} ${diff.level}`}
                                      size="small"
                                      sx={{ 
                                        bgcolor: difficultyDef?.color || '#757575',
                                        color: 'white',
                                        fontSize: '0.7rem'
                                      }}
                                    />
                                  );
                                })}
                            </Box>
                            {index < songs.slice(0, 5).length - 1 && <Divider sx={{ my: 1 }} />}
                          </Box>
                        ))}
                        {songs.length > 5 && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                            他 {songs.length - 5} 曲...
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}
                  
                  <Button
                    variant="contained"
                    onClick={handleUpload}
                    disabled={loading}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'アップロード'}
                  </Button>
                </Box>
              ) : (
                <Alert severity="warning">
                  有効な楽曲データが見つかりませんでした。ファイルを確認してください。
                </Alert>
              )}
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