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
import ColumnMappingInterface from './ColumnMappingInterface';
import DataPreview from './DataPreview';
import { FlexibleColumnMapping, DisplaySettings } from '../../types/ExcelStructure';
import { UserProfile } from '../../types/User';
import { UserPermissionService } from '../../services/userPermissionService';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../services/firebase';
import * as XLSX from 'xlsx';

interface ExcelUploaderProps {
  currentUser?: UserProfile | null;
}

const ExcelUploader: React.FC<ExcelUploaderProps> = ({ currentUser }) => {
  const { games, refreshData } = useSongData();
  const { 
    songs, structure, loading, error, uploadProgress,
    analyzeExcel, parseExcel, uploadSongs 
  } = useExcelParser();
  
  const [selectedGameId, setSelectedGameId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 新規追加: 列マッピング関連の状態
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelSampleData, setExcelSampleData] = useState<any[][]>([]);
  const [customColumnMapping, setCustomColumnMapping] = useState<FlexibleColumnMapping | null>(null);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({});
  const [useCustomMapping, setUseCustomMapping] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 権限チェック
  const permissions = UserPermissionService.getPermissions(currentUser || null);
  const isAdmin = UserPermissionService.isAdmin(currentUser || null);
  
  // Get valid song count
  const validSongCount = songs && Array.isArray(songs) ? 
    Math.max(0, songs.filter(song => song && song.name && song.name.trim() !== '').length) : 0;
  
  // Game selection handler
  const handleGameChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedGameId(event.target.value as string);
    // Reset step and file selection when game is changed
    setActiveStep(0);
    setFile(null);
    setSuccess(null);
    // Reset mapping states
    setExcelHeaders([]);
    setExcelSampleData([]);
    setCustomColumnMapping(null);
    setDisplaySettings({});
    setUseCustomMapping(false);
  };
  
  // File selection handler
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0];
      setFile(selectedFile);
      
      // ファイル選択時にヘッダーとサンプルデータを読み取り
      analyzeFileStructure(selectedFile);
      
      setActiveStep(1);
    }
  };
  
  // 新規追加: ファイル構造の解析
  const analyzeFileStructure = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (!e.target?.result) return;
        
        const data = new Uint8Array(e.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // ヘッダー行とサンプルデータを取得
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1, 
          range: 0, // 最初の行から
          defval: null 
        }) as any[][];
        
        if (jsonData.length > 0) {
          setExcelHeaders(jsonData[0] || []);
          setExcelSampleData(jsonData.slice(1, 4)); // 最初の3行のサンプルデータ
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('ファイル構造解析エラー:', error);
    }
  };
  
  // File selection button click handler
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const [reanalyzeStructure, setReanalyzeStructure] = useState<boolean>(false);

  // File analysis handler - 修正版
  const handleParseFile = async () => {
    if (!file || !selectedGameId) return;
    
    try {
      const selectedGame = games.find(g => g.id === selectedGameId);
      if (!selectedGame) {
        throw new Error('選択されたゲームが見つかりません');
      }
      
      // カスタムマッピングを使用する場合は次のステップへ
      if (useCustomMapping && excelHeaders.length > 0) {
        setActiveStep(2); // 列マッピング設定ステップへ
      } else {
        // 従来の自動解析を実行
        const parsedSongs = await parseExcel(file, selectedGameId, reanalyzeStructure);
        setActiveStep(3); // データ確認ステップへ
      }
    } catch (err) {
      console.error('ファイル解析エラー:', err);
    }
  };
  
  // 新規追加: カスタムマッピングでの解析
  const handleParseWithCustomMapping = async () => {
    if (!file || !selectedGameId || !customColumnMapping) return;
    
    try {
      const selectedGame = games.find(g => g.id === selectedGameId);
      if (!selectedGame) {
        throw new Error('選択されたゲームが見つかりません');
      }
      
      // カスタムマッピングを使用してファイルを解析
      // TODO: parseExcelWithCustomMapping 関数を実装する必要があります
      // 現在は従来の方法で解析
      const parsedSongs = await parseExcel(file, selectedGameId, true);
      setActiveStep(3); // データ確認ステップへ
    } catch (err) {
      console.error('カスタムマッピング解析エラー:', err);
    }
  };

  // Upload handler - modified to pass file as optional
  const handleUpload = async () => {
    if (!selectedGameId || validSongCount === 0) return;
    
    try {
      // Filter only valid songs with non-empty names
      const validSongs = songs
        .filter(song => song && song.name && song.name.trim() !== '');
      
      // Upload song data without the file parameter
      await uploadSongs(selectedGameId, validSongs);
      
      // Check for errors from the upload process
      if (error) {
        // Error will be displayed automatically through the error state
        // but we still advance to the next step since some data was saved
        setActiveStep(4);
        setSuccess(`${validSongCount}曲のデータは保存されましたが、アップロードに問題がありました。`);
      } else {
        // Full success
        setSuccess(`${validSongCount}曲のデータをアップロードしました`);
        // Move to final step
        setActiveStep(4);
      }
      
      // Refresh data
      await refreshData();
    } catch (err: any) {
      console.error('アップロードエラー:', err);
      // Don't advance the step if a critical error occurred
    }
  };

  // New function to render progress information without showing file upload percentage
  const renderProgress = () => {
    if (!uploadProgress || uploadProgress.phase === 'idle') {
      return null;
    }

    const { phase, songsProgress, message } = uploadProgress;
    
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
                処理中...
              </Typography>
            </Box>
            <LinearProgress 
              variant="indeterminate" 
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
            
            {/* 新規追加: カスタムマッピングオプション */}
            {excelHeaders.length > 0 && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useCustomMapping}
                    onChange={(e) => setUseCustomMapping(e.target.checked)}
                    disabled={loading}
                  />
                }
                label="列マッピングを手動で設定する（推奨）"
              />
            )}
            
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
        
        {/* 新規追加: 列マッピング設定ステップ */}
        <Step key="mapping">
          <StepLabel>列マッピング設定</StepLabel>
          <StepContent>
            <Typography variant="body2" paragraph>
              Excelファイルの列と楽曲データのフィールドを対応付けてください。
              自動検出された結果を確認し、必要に応じて調整できます。
            </Typography>
            
            {excelHeaders.length > 0 && selectedGameId && (
              <Box sx={{ mb: 2 }}>
                <ColumnMappingInterface
                  headers={excelHeaders}
                  sampleData={excelSampleData}
                  game={games.find(g => g.id === selectedGameId)!}
                  onMappingChange={setCustomColumnMapping}
                  onDisplaySettingsChange={setDisplaySettings}
                  currentUser={currentUser}
                />
              </Box>
            )}
            
            <Button
              variant="contained"
              onClick={handleParseWithCustomMapping}
              disabled={loading || !customColumnMapping}
              sx={{ mt: 1, mr: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'マッピングを適用して解析'}
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
                  
                  {/* 新しいデータプレビュー */}
                  {songs.length > 0 && selectedGameId && (
                    <Box sx={{ mb: 2 }}>
                      <DataPreview
                        songs={songs}
                        game={games.find(g => g.id === selectedGameId)!}
                        displaySettings={displaySettings}
                        maxPreviewRows={10}
                      />
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
                // Reset mapping states
                setExcelHeaders([]);
                setExcelSampleData([]);
                setCustomColumnMapping(null);
                setDisplaySettings({});
                setUseCustomMapping(false);
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