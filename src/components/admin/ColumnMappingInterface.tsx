import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Select, MenuItem, FormControl,
  Switch, Chip, Accordion, AccordionSummary, AccordionDetails,
  Alert, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Tooltip, FormControlLabel, Checkbox
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import InfoIcon from '@mui/icons-material/Info';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Game } from '../../types/Game';
import { DetectedColumn, FlexibleColumnMapping, DisplaySettings, UploadPreset, CustomField } from '../../types/ExcelStructure';
import { ColumnMappingService, PresetManager } from '../../services/columnMappingService';
import { UserProfile } from '../../types/User';
import { UserPermissionService } from '../../services/userPermissionService';

interface ColumnMappingInterfaceProps {
  headers: string[];
  sampleData: any[][];
  game: Game;
  onMappingChange: (mapping: FlexibleColumnMapping) => void;
  onDisplaySettingsChange: (settings: DisplaySettings) => void;
  initialMapping?: FlexibleColumnMapping;
  initialDisplaySettings?: DisplaySettings;
  currentUser?: UserProfile | null;
}

const ColumnMappingInterface: React.FC<ColumnMappingInterfaceProps> = ({
  headers,
  sampleData,
  game,
  onMappingChange,
  onDisplaySettingsChange,
  initialMapping,
  initialDisplaySettings,
  currentUser
}) => {
  const [detectedColumns, setDetectedColumns] = useState<{[columnIndex: number]: DetectedColumn}>({});
  const [userMappings, setUserMappings] = useState<{[columnIndex: number]: string}>({});
  const [visibilitySettings, setVisibilitySettings] = useState<{[columnIndex: number]: boolean}>({});
  const [adminOnlySettings, setAdminOnlySettings] = useState<{[columnIndex: number]: boolean}>({});
  const [customFieldSettings, setCustomFieldSettings] = useState<{[columnIndex: number]: CustomField}>({});
  const [presets, setPresets] = useState<UploadPreset[]>([]);
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');
  
  // 権限チェック
  const permissions = UserPermissionService.getPermissions(currentUser || null);
  const isAdmin = UserPermissionService.isAdmin(currentUser || null);
  
  // 初期化
  useEffect(() => {
    if (headers.length > 0) {
      // 自動検出を実行
      const detected = ColumnMappingService.suggestColumnMapping(headers, sampleData, game);
      setDetectedColumns(detected);
      
      // 初期マッピングがある場合は適用、なければ自動検出結果を使用
      if (initialMapping) {
        applyMappingToState(initialMapping);
      } else {
        applyDetectedMappings(detected);
      }
      
      // 初期表示設定を適用
      if (initialDisplaySettings) {
        applyDisplaySettings(initialDisplaySettings);
      } else {
        // デフォルトで全て表示
        const defaultVisibility: {[columnIndex: number]: boolean} = {};
        const defaultAdminOnly: {[columnIndex: number]: boolean} = {};
        headers.forEach((_, index) => {
          defaultVisibility[index] = true;
          defaultAdminOnly[index] = detected[index]?.isCustomField || false;
        });
        setVisibilitySettings(defaultVisibility);
        setAdminOnlySettings(defaultAdminOnly);
      }
    }
  }, [headers, sampleData, game, initialMapping, initialDisplaySettings]);
  
  // プリセット読み込み
  useEffect(() => {
    loadPresets();
  }, [game.id]);
  
  const loadPresets = async () => {
    try {
      const gamePresets = await PresetManager.getPresetsForGame(game.id);
      setPresets(gamePresets);
    } catch (error) {
      console.error('プリセット読み込みエラー:', error);
    }
  };
  
  const applyDetectedMappings = (detected: {[columnIndex: number]: DetectedColumn}) => {
    const mappings: {[columnIndex: number]: string} = {};
    const customFields: {[columnIndex: number]: CustomField} = {};
    
    Object.entries(detected).forEach(([columnIndex, detection]) => {
      const index = parseInt(columnIndex);
      mappings[index] = detection.suggestedField;
      
      // カスタムフィールドの場合は設定を保存
      if (detection.isCustomField) {
        customFields[index] = ColumnMappingService.createCustomField(
          index,
          detection.headerName,
          'string',
          false
        );
      }
    });
    
    setUserMappings(mappings);
    setCustomFieldSettings(customFields);
    updateMappingFromState(mappings, customFields);
  };
  
  const applyMappingToState = (mapping: FlexibleColumnMapping) => {
    const mappings: {[columnIndex: number]: string} = {};
    const customFields: {[columnIndex: number]: CustomField} = {};
    
    // 基本フィールド
    if (mapping.name >= 0) mappings[mapping.name] = 'name';
    if (mapping.songNo >= 0) mappings[mapping.songNo] = 'songNo';
    if (mapping.implementationNo !== undefined && mapping.implementationNo >= 0) mappings[mapping.implementationNo] = 'implementationNo';
    
    // info フィールド
    Object.entries(mapping.info).forEach(([field, columnIndex]) => {
      if (columnIndex !== undefined && columnIndex >= 0) {
        mappings[columnIndex] = `info.${field}`;
      }
    });
    
    // 難易度フィールド
    Object.entries(mapping.difficulties).forEach(([diffId, columnIndex]) => {
      if (columnIndex >= 0) {
        mappings[columnIndex] = `difficulties.${diffId}.level`;
      }
    });
    
    Object.entries(mapping.combos).forEach(([diffId, columnIndex]) => {
      if (columnIndex >= 0) {
        mappings[columnIndex] = `difficulties.${diffId}.combo`;
      }
    });
    
    // YouTube URL フィールド
    Object.entries(mapping.youtubeUrls).forEach(([diffId, columnIndex]) => {
      if (columnIndex >= 0) {
        mappings[columnIndex] = `youtubeUrls.${diffId}`;
      }
    });
    
    // カスタムフィールド
    if (mapping.customFields) {
      Object.entries(mapping.customFields).forEach(([fieldId, customField]) => {
        mappings[customField.columnIndex] = `custom.${fieldId}`;
        customFields[customField.columnIndex] = customField;
      });
    }
    
    setUserMappings(mappings);
    setCustomFieldSettings(customFields);
  };
  
  const applyDisplaySettings = (settings: DisplaySettings) => {
    const visibility: {[columnIndex: number]: boolean} = {};
    const adminOnly: {[columnIndex: number]: boolean} = {};
    
    headers.forEach((_, index) => {
      // デフォルトで表示
      visibility[index] = true;
      adminOnly[index] = false;
    });
    
    // 設定から非表示項目を適用
    Object.entries(settings).forEach(([field, setting]) => {
      const columnIndex = findColumnIndexByField(field);
      if (columnIndex >= 0) {
        visibility[columnIndex] = setting.visible;
        adminOnly[columnIndex] = setting.adminOnly || false;
      }
    });
    
    setVisibilitySettings(visibility);
    setAdminOnlySettings(adminOnly);
  };
  
  const findColumnIndexByField = (field: string): number => {
    for (const [columnIndex, mappedField] of Object.entries(userMappings)) {
      if (mappedField === field) {
        return parseInt(columnIndex);
      }
    }
    return -1;
  };
  
  const updateMappingFromState = (mappings: {[columnIndex: number]: string}, customFields: {[columnIndex: number]: CustomField} = {}) => {
    const flexibleMapping: FlexibleColumnMapping = {
      songNo: -1,
      implementationNo: -1,
      name: -1,
      difficulties: {},
      combos: {},
      youtubeUrls: {},
      info: {},
      customFields: {}
    };
    
    Object.entries(mappings).forEach(([columnIndex, field]) => {
      const index = parseInt(columnIndex);
      
      if (field === 'name') {
        flexibleMapping.name = index;
      } else if (field === 'songNo') {
        flexibleMapping.songNo = index;
      } else if (field === 'implementationNo') {
        flexibleMapping.implementationNo = index;
      } else if (field.startsWith('info.')) {
        const infoField = field.replace('info.', '') as keyof typeof flexibleMapping.info;
        flexibleMapping.info[infoField] = index;
      } else if (field.startsWith('difficulties.')) {
        const parts = field.split('.');
        const diffId = parts[1];
        const type = parts[2];
        
        if (type === 'level') {
          flexibleMapping.difficulties[diffId] = index;
        } else if (type === 'combo') {
          flexibleMapping.combos[diffId] = index;
        }
      } else if (field.startsWith('youtubeUrls.')) {
        const diffId = field.replace('youtubeUrls.', '');
        flexibleMapping.youtubeUrls[diffId] = index;
      } else if (field.startsWith('custom.')) {
        const customFieldId = field.replace('custom.', '');
        const customField = customFields[index];
        if (customField) {
          flexibleMapping.customFields![customFieldId] = {
            ...customField,
            adminOnly: adminOnlySettings[index] || false
          };
        }
      }
    });
    
    onMappingChange(flexibleMapping);
  };
  
  const updateDisplaySettingsFromState = () => {
    const settings: DisplaySettings = {};
    
    Object.entries(userMappings).forEach(([columnIndex, field]) => {
      const index = parseInt(columnIndex);
      settings[field] = {
        visible: visibilitySettings[index] !== false,
        order: index,
        label: headers[index] || field,
        adminOnly: adminOnlySettings[index] || false
      };
    });
    
    onDisplaySettingsChange(settings);
  };
  
  const handleMappingChange = (columnIndex: number, field: string) => {
    const newMappings = { ...userMappings };
    const newCustomFields = { ...customFieldSettings };
    
    if (field === '') {
      delete newMappings[columnIndex];
      delete newCustomFields[columnIndex];
    } else {
      newMappings[columnIndex] = field;
      
      // カスタムフィールドの場合は設定を作成
      if (field.startsWith('custom.')) {
        newCustomFields[columnIndex] = ColumnMappingService.createCustomField(
          columnIndex,
          headers[columnIndex],
          'string',
          adminOnlySettings[columnIndex] || false
        );
      }
    }
    
    setUserMappings(newMappings);
    setCustomFieldSettings(newCustomFields);
    updateMappingFromState(newMappings, newCustomFields);
  };
  
  const handleVisibilityChange = (columnIndex: number, visible: boolean) => {
    const newVisibility = { ...visibilitySettings, [columnIndex]: visible };
    setVisibilitySettings(newVisibility);
    updateDisplaySettingsFromState();
  };
  
  const handleAdminOnlyChange = (columnIndex: number, adminOnly: boolean) => {
    const newAdminOnly = { ...adminOnlySettings, [columnIndex]: adminOnly };
    setAdminOnlySettings(newAdminOnly);
    
    // カスタムフィールドの設定も更新
    if (customFieldSettings[columnIndex]) {
      const newCustomFields = {
        ...customFieldSettings,
        [columnIndex]: {
          ...customFieldSettings[columnIndex],
          adminOnly
        }
      };
      setCustomFieldSettings(newCustomFields);
      updateMappingFromState(userMappings, newCustomFields);
    }
    
    updateDisplaySettingsFromState();
  };
  
  const handleAutoDetect = () => {
    applyDetectedMappings(detectedColumns);
  };
  
  const handleSavePreset = async () => {
    if (!presetName.trim()) return;
    
    try {
      const currentMapping: FlexibleColumnMapping = {
        songNo: -1,
        implementationNo: -1,
        name: -1,
        difficulties: {},
        combos: {},
        youtubeUrls: {},
        info: {},
        customFields: {}
      };
      
      updateMappingFromState(userMappings, customFieldSettings);
      
      const displaySettings: DisplaySettings = {};
      updateDisplaySettingsFromState();
      
      await PresetManager.savePreset({
        name: presetName.trim(),
        gameId: game.id,
        description: presetDescription.trim() || '手動作成プリセット',
        columnMappings: currentMapping,
        displaySettings
      });
      
      setSavePresetDialogOpen(false);
      setPresetName('');
      setPresetDescription('');
      await loadPresets();
    } catch (error) {
      console.error('プリセット保存エラー:', error);
    }
  };
  
  const applyPreset = (preset: UploadPreset) => {
    applyMappingToState(preset.columnMappings);
    applyDisplaySettings(preset.displaySettings);
  };
  
  // フィールドオプションの生成
  const getFieldOptions = () => {
    const options = [
      { value: '', label: '未設定' },
      { value: 'songNo', label: '楽曲番号' },
      { value: 'implementationNo', label: '実装番号' },
      { value: 'name', label: '楽曲名' },
      { value: 'info.artist', label: 'アーティスト' },
      { value: 'info.composer', label: '作曲者' },
      { value: 'info.arranger', label: '編曲者' },
      { value: 'info.lyricist', label: '作詞者' },
      { value: 'info.duration', label: '時間' },
      { value: 'info.bpm', label: 'BPM' },
      { value: 'info.addedDate', label: '追加日' },
      { value: 'info.tags', label: 'タグ' },
    ];
    
    // 難易度レベル、コンボ数、YouTube URLを追加
    game.difficulties.forEach(diff => {
      options.push(
        { value: `difficulties.${diff.id}.level`, label: `${diff.name} レベル` },
        { value: `difficulties.${diff.id}.combo`, label: `${diff.name} コンボ数` },
        { value: `youtubeUrls.${diff.id}`, label: `${diff.name} YouTube URL` }
      );
    });
    
    // カスタムフィールドオプション
    options.push({
      value: `custom.${ColumnMappingService.generateCustomFieldId('custom')}`,
      label: 'カスタムフィールド（列名をそのまま使用）'
    });
    
    return options;
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'default';
  };
  
  return (
    <Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">列マッピング設定</Typography>
            <Chip 
              size="small" 
              label={`${Object.keys(userMappings).length}/${headers.length} 列設定済み`}
              color={Object.keys(userMappings).length > 0 ? 'primary' : 'default'}
            />
            {isAdmin && (
              <Chip 
                size="small" 
                icon={<AdminPanelSettingsIcon />}
                label="管理者モード"
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* コントロールボタン */}
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              startIcon={<AutoFixHighIcon />}
              onClick={handleAutoDetect}
              variant="outlined"
              size="small"
            >
              自動検出を適用
            </Button>
            <Button
              startIcon={<SaveIcon />}
              onClick={() => setSavePresetDialogOpen(true)}
              variant="outlined"
              size="small"
              disabled={Object.keys(userMappings).length === 0}
            >
              プリセット保存
            </Button>
          </Box>
          
          {/* プリセット選択 */}
          {presets.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                保存済みプリセット:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {presets.map(preset => (
                  <Chip
                    key={preset.id}
                    label={preset.name}
                    onClick={() => applyPreset(preset)}
                    variant="outlined"
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
          
          {/* マッピングテーブル */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>列番号</TableCell>
                  <TableCell>ヘッダー名</TableCell>
                  <TableCell>サンプルデータ</TableCell>
                  <TableCell>マッピング先</TableCell>
                  <TableCell>自動検出</TableCell>
                  <TableCell>表示</TableCell>
                  {isAdmin && <TableCell>管理者専用</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {headers.map((header, index) => {
                  const detection = detectedColumns[index];
                  const currentMapping = userMappings[index] || '';
                  const isVisible = visibilitySettings[index] !== false;
                  const isAdminOnly = adminOnlySettings[index] || false;
                  const isCustomField = currentMapping.startsWith('custom.');
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {header}
                          </Typography>
                          {isCustomField && (
                            <Chip size="small" label="カスタム" color="info" variant="outlined" />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {sampleData[0] && sampleData[0][index] 
                            ? String(sampleData[0][index]).substring(0, 20) + 
                              (String(sampleData[0][index]).length > 20 ? '...' : '')
                            : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={currentMapping}
                            onChange={(e) => handleMappingChange(index, e.target.value as string)}
                            displayEmpty
                          >
                            {getFieldOptions().map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </TableCell>
                      <TableCell>
                        {detection && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Chip
                              size="small"
                              label={detection.suggestedField}
                              color={getConfidenceColor(detection.confidence)}
                              variant="outlined"
                            />
                            <Tooltip title={`信頼度: ${Math.round(detection.confidence * 100)}%`}>
                              <InfoIcon fontSize="small" color="action" />
                            </Tooltip>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={isVisible}
                          onChange={(e) => handleVisibilityChange(index, e.target.checked)}
                          size="small"
                          icon={<VisibilityOffIcon />}
                          checkedIcon={<VisibilityIcon />}
                        />
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={isAdminOnly}
                                onChange={(e) => handleAdminOnlyChange(index, e.target.checked)}
                                size="small"
                              />
                            }
                            label=""
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          
          {Object.keys(detectedColumns).length > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              自動検出により {Object.keys(detectedColumns).length} 個の列が識別されました。
              「自動検出を適用」ボタンで一括適用できます。
              {isAdmin && ' 管理者として、カスタムフィールドの表示権限を設定できます。'}
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* プリセット保存ダイアログ */}
      <Dialog open={savePresetDialogOpen} onClose={() => setSavePresetDialogOpen(false)}>
        <DialogTitle>プリセットを保存</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="プリセット名"
            fullWidth
            variant="outlined"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="説明（オプション）"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            value={presetDescription}
            onChange={(e) => setPresetDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSavePresetDialogOpen(false)}>キャンセル</Button>
          <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ColumnMappingInterface; 