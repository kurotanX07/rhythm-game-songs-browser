// src/components/user/ExportDialog.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, FormControlLabel, RadioGroup,
  Radio, Typography, Checkbox, TextField, CircularProgress,
  Box, Alert, Paper, Divider
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckIcon from '@mui/icons-material/Check';
import WarningIcon from '@mui/icons-material/Warning';
import LockIcon from '@mui/icons-material/Lock';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Song } from '../../types/Song';
import { Game } from '../../types/Game';
import { exportSongData } from '../../services/exportService';
import { useAuth } from '../../contexts/AuthContext';

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  songs: Song[];
  game: Game | null;
  filteredCount: number;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onClose,
  songs,
  game,
  filteredCount
}) => {
  const { isPremium, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'json'>('xlsx');
  const [includeDetailedInfo, setIncludeDetailedInfo] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if the user has permission to export
  const hasExportPermission = isPremium || isAdmin;
  
  const handleFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormat(event.target.value as 'csv' | 'xlsx' | 'json');
  };
  
  const handleDetailedInfoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeDetailedInfo(event.target.checked);
  };
  
  const handleCustomFilenameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomFilename(event.target.value);
  };
  
  const handleExport = async () => {
    // Double-check permission
    if (!hasExportPermission) {
      setError('エクスポート権限がありません。プレミアム会員にアップグレードしてください。');
      return;
    }
    
    try {
      setIsExporting(true);
      setError(null);
      
      // Generate default filename if not provided
      const filename = customFilename.trim() || 
        `${game?.title || 'rhythm-game'}_songs_${new Date().toISOString().split('T')[0]}`;
      
      // Export the data
      await exportSongData(songs, game, {
        format,
        includeDetailedInfo,
        filename
      });
      
      setSuccess('エクスポートが完了しました');
      
      // Close the dialog after a short delay
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Export error:', err);
      setError('エクスポート中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Handle upgrade click
  const handleUpgradeClick = () => {
    onClose();
    navigate('/membership');
  };
  
  return (
    <Dialog open={open} onClose={isExporting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>楽曲データをエクスポート</DialogTitle>
      
      <DialogContent>
        {hasExportPermission ? (
          <>
            <Typography variant="body2" color="text.secondary" paragraph>
              {filteredCount}曲のデータをエクスポートします。ファイル形式を選択してください。
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }} icon={<CheckIcon />}>
                {success}
              </Alert>
            )}
            
            <FormControl component="fieldset" sx={{ my: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                ファイル形式
              </Typography>
              <RadioGroup
                aria-label="export-format"
                name="export-format"
                value={format}
                onChange={handleFormatChange}
              >
                <FormControlLabel 
                  value="xlsx" 
                  control={<Radio />} 
                  label="Excel (.xlsx)" 
                />
                <FormControlLabel 
                  value="csv" 
                  control={<Radio />} 
                  label="CSV (.csv)" 
                />
                <FormControlLabel 
                  value="json" 
                  control={<Radio />} 
                  label="JSON (.json)" 
                />
              </RadioGroup>
            </FormControl>
            
            <Box sx={{ my: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeDetailedInfo}
                    onChange={handleDetailedInfoChange}
                  />
                }
                label="詳細情報を含める (作詞者、BPM、追加日など)"
              />
            </Box>
            
            <TextField
              fullWidth
              label="ファイル名"
              variant="outlined"
              size="small"
              value={customFilename}
              onChange={handleCustomFilenameChange}
              placeholder={`${game?.title || 'rhythm-game'}_songs_${new Date().toISOString().split('T')[0]}`}
              helperText="空白の場合は自動生成されます"
              sx={{ mt: 2 }}
            />
          </>
        ) : (
          // Premium-only message
          <Box sx={{ textAlign: 'center' }}>
            <LockIcon color="primary" sx={{ fontSize: 60, mb: 2, opacity: 0.7 }} />
            
            <Typography variant="h6" gutterBottom>
              プレミアム会員限定機能
            </Typography>
            
            <Typography variant="body2" paragraph>
              楽曲データのエクスポート機能はプレミアム会員限定です。
              プレミアム会員になると、好きな形式でデータをエクスポートできます。
            </Typography>
            
            <Alert severity="info" sx={{ mb: 3, textAlign: 'left' }}>
              プレミアム会員の特典：
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                <li>楽曲データのエクスポート (Excel, CSV, JSON)</li>
                <li>広告表示なし</li>
                <li>お気に入り曲の制限なし</li>
                <li>プレミアムサポート</li>
              </ul>
            </Alert>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                料金プラン
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">月額プラン</Typography>
                <Typography variant="body2" fontWeight="bold">¥980 / 月</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">年額プラン (お得)</Typography>
                <Typography variant="body2" fontWeight="bold">¥9,800 / 年</Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="inherit"
          disabled={isExporting}
        >
          キャンセル
        </Button>
        
        {hasExportPermission ? (
          <Button
            onClick={handleExport}
            color="primary"
            variant="contained"
            startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
            disabled={isExporting}
          >
            {isExporting ? 'エクスポート中...' : 'エクスポート'}
          </Button>
        ) : (
          <Button
            onClick={handleUpgradeClick}
            color="primary"
            variant="contained"
            startIcon={<WorkspacePremiumIcon />}
          >
            会員プランを見る
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;