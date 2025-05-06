// src/components/user/ExportDialog.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, FormControl, FormControlLabel, RadioGroup,
  Radio, Typography, Checkbox, TextField, CircularProgress,
  Box, Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { Song } from '../../types/Song';
import { Game } from '../../types/Game';
import { exportSongData } from '../../services/exportService';

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
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'json'>('xlsx');
  const [includeDetailedInfo, setIncludeDetailedInfo] = useState(true);
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
      
      // Close the dialog after successful export
      onClose();
    } catch (err) {
      console.error('Export error:', err);
      setError('エクスポート中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Dialog open={open} onClose={isExporting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>楽曲データをエクスポート</DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          {filteredCount}曲のデータをエクスポートします。ファイル形式を選択してください。
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
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
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="inherit"
          disabled={isExporting}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleExport}
          color="primary"
          variant="contained"
          startIcon={isExporting ? <CircularProgress size={20} /> : <DownloadIcon />}
          disabled={isExporting}
        >
          {isExporting ? 'エクスポート中...' : 'エクスポート'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;