import React from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Alert, Accordion,
  AccordionSummary, AccordionDetails, Link
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Song } from '../../types/Song';
import { Game } from '../../types/Game';
import { DisplaySettings } from '../../types/ExcelStructure';
import { UserProfile } from '../../types/User';
import { UserPermissionService } from '../../services/userPermissionService';

interface DataPreviewProps {
  songs: Song[];
  game: Game;
  displaySettings?: DisplaySettings;
  maxPreviewRows?: number;
  currentUser?: UserProfile | null;
}

const DataPreview: React.FC<DataPreviewProps> = ({
  songs,
  game,
  displaySettings = {},
  maxPreviewRows = 10,
  currentUser
}) => {
  const previewSongs = songs.slice(0, maxPreviewRows);
  
  // 権限チェック
  const permissions = UserPermissionService.getPermissions(currentUser || null);
  const isAdmin = UserPermissionService.isAdmin(currentUser || null);
  
  // 表示する列を決定
  const getVisibleColumns = () => {
    const columns = [
      { key: 'songNo', label: '楽曲番号', visible: true, adminOnly: false },
      { key: 'implementationNo', label: '実装番号', visible: false, adminOnly: false },
      { key: 'name', label: '楽曲名', visible: true, adminOnly: false },
      { key: 'artist', label: 'アーティスト', visible: true, adminOnly: false },
      { key: 'composer', label: '作曲者', visible: false, adminOnly: false },
      { key: 'arranger', label: '編曲者', visible: false, adminOnly: false },
      { key: 'lyricist', label: '作詞者', visible: false, adminOnly: false },
      { key: 'duration', label: '時間', visible: false, adminOnly: false },
      { key: 'bpm', label: 'BPM', visible: false, adminOnly: false },
      { key: 'addedDate', label: '追加日', visible: false, adminOnly: false },
      { key: 'tags', label: 'タグ', visible: false, adminOnly: false },
    ];
    
    // 難易度列を追加
    game.difficulties.forEach(diff => {
      columns.push({
        key: `difficulty_${diff.id}`,
        label: `${diff.name}`,
        visible: true,
        adminOnly: false
      });
    });
    
    // YouTube URL列を追加
    game.difficulties.forEach(diff => {
      columns.push({
        key: `youtube_${diff.id}`,
        label: `${diff.name} YouTube`,
        visible: false,
        adminOnly: false
      });
    });
    
    // カスタムフィールド列を追加（表示設定から）
    Object.entries(displaySettings).forEach(([fieldName, setting]) => {
      if (fieldName.startsWith('custom.')) {
        columns.push({
          key: fieldName,
          label: setting.label,
          visible: setting.visible,
          adminOnly: setting.adminOnly || false
        });
      }
    });
    
    // 表示設定を適用し、権限チェック
    return columns.filter(col => {
      const setting = displaySettings[col.key];
      const shouldShow = setting ? setting.visible : col.visible;
      
      // 管理者専用フィールドの権限チェック
      const adminOnlyField = setting?.adminOnly || col.adminOnly;
      if (adminOnlyField && !isAdmin) {
        return false;
      }
      
      return shouldShow;
    });
  };
  
  const visibleColumns = getVisibleColumns();
  
  // 時間を適切な形式に変換する関数
  const formatDuration = (duration: string | number | null | undefined): string => {
    if (!duration) return '';
    
    const durationStr = String(duration).trim();
    
    // 既に分:秒形式の場合はそのまま返す（0埋めのみ調整）
    if (/^\d{1,2}:\d{1,2}$/.test(durationStr)) {
      const parts = durationStr.split(':');
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 時:分:秒 形式の場合
    if (/^\d{1,2}:\d{1,2}:\d{1,2}$/.test(durationStr)) {
      const parts = durationStr.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const seconds = parseInt(parts[2], 10);
      
      // 時間が小さい値（例：2:10:00）の場合、これは分:秒:ミリ秒の可能性
      // または単純に分:秒として扱うべき場合
      if (hours <= 59 && minutes <= 59 && seconds === 0) {
        // 2:10:00 のような場合は 2:10 として扱う
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
      } else {
        // 通常の時:分:秒を分:秒に変換
        const totalMinutes = hours * 60 + minutes;
        return `${totalMinutes}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    // 小数点を含む分.秒形式（例：2.24 = 2分24秒）
    if (/^\d{1,2}\.\d{1,2}$/.test(durationStr)) {
      const parts = durationStr.split('.');
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 数値のみの場合の処理を改善
    const numericValue = parseFloat(durationStr.replace(/[^\d.]/g, ''));
    if (!isNaN(numericValue)) {
      // 100以下の場合は分.秒形式として扱う（例：2.24 = 2分24秒）
      if (numericValue < 100 && durationStr.includes('.')) {
        const integerPart = Math.floor(numericValue);
        const decimalPart = Math.round((numericValue - integerPart) * 100);
        return `${integerPart}:${decimalPart.toString().padStart(2, '0')}`;
      }
      // 100以上の場合は秒として扱う
      else if (numericValue >= 100) {
        const totalSeconds = Math.round(numericValue);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      // 100未満で小数点がない場合は分として扱う
      else {
        const minutes = Math.floor(numericValue);
        return `${minutes}:00`;
      }
    }
    
    // その他の形式は元の文字列をそのまま返す
    return durationStr;
  };
  
  // 日付を適切な形式に変換する関数
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return String(date);
      
      return dateObj.toLocaleDateString('ja-JP');
    } catch {
      return String(date);
    }
  };
  
  // タグを適切な形式に変換する関数
  const formatTags = (tags: string[] | string | null | undefined): React.ReactNode => {
    if (!tags) return '';
    
    let tagArray: string[];
    if (Array.isArray(tags)) {
      tagArray = tags;
    } else if (typeof tags === 'string') {
      // カンマ区切りの文字列をタグ配列に変換
      tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    } else {
      return String(tags);
    }
    
    if (tagArray.length === 0) return '';
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {tagArray.map((tag, index) => (
          <Chip
            key={index}
            label={tag}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />
        ))}
      </Box>
    );
  };
  
  const getCellValue = (song: Song, columnKey: string) => {
    switch (columnKey) {
      case 'songNo':
        return song.songNo;
      case 'implementationNo':
        return song.implementationNo || '';
      case 'name':
        return song.name;
      case 'artist':
        return song.info.artist || '';
      case 'composer':
        return song.info.composer || '';
      case 'arranger':
        return song.info.arranger || '';
      case 'lyricist':
        return song.info.lyricist || '';
      case 'duration':
        return formatDuration(song.info.duration);
      case 'bpm':
        return song.info.bpm || '';
      case 'addedDate':
        return formatDate(song.info.addedDate);
      case 'tags':
        return formatTags(song.info.tags);
      default:
        if (columnKey.startsWith('difficulty_')) {
          const diffId = columnKey.replace('difficulty_', '');
          const difficulty = song.difficulties[diffId];
          return difficulty ? difficulty.level : '';
        } else if (columnKey.startsWith('youtube_')) {
          const diffId = columnKey.replace('youtube_', '');
          const youtubeUrl = song.youtubeUrls?.[diffId];
          return youtubeUrl ? (
            <Link href={youtubeUrl} target="_blank" rel="noopener noreferrer">
              YouTube
            </Link>
          ) : '';
        } else if (columnKey.startsWith('custom.')) {
          // カスタムフィールドの値を取得
          // TODO: Songオブジェクトにカスタムフィールドのサポートを追加する必要があります
          return (song as any).customFields?.[columnKey] || '';
        }
        return '';
    }
  };
  
  const renderDifficultyChips = (song: Song) => {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {Object.entries(song.difficulties)
          .filter(([_, diff]) => diff.level !== null && diff.level !== undefined)
          .map(([diffId, diff]) => {
            const difficultyDef = game.difficulties.find(d => d.id === diffId);
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
    );
  };
  
  if (songs.length === 0) {
    return (
      <Alert severity="warning">
        プレビューできるデータがありません。
      </Alert>
    );
  }
  
  return (
    <Box>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">
              データプレビュー ({previewSongs.length}/{songs.length} 件表示)
            </Typography>
            {isAdmin && (
              <Chip 
                size="small" 
                icon={<AdminPanelSettingsIcon />}
                label="管理者ビュー"
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {/* 統計情報 */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Chip 
              label={`総楽曲数: ${songs.length}`} 
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              label={`有効データ: ${songs.filter(s => s.name && s.name.trim()).length}`} 
              color="success" 
              variant="outlined" 
            />
            <Chip 
              label={`表示列数: ${visibleColumns.length}`} 
              color="info" 
              variant="outlined" 
            />
            {songs.length > maxPreviewRows && (
              <Chip 
                label={`他 ${songs.length - maxPreviewRows} 件...`} 
                color="default" 
                variant="outlined" 
              />
            )}
          </Box>
          
          {/* データテーブル */}
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {visibleColumns.map(column => (
                    <TableCell key={column.key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {column.label}
                        </Typography>
                        {column.adminOnly && isAdmin && (
                          <AdminPanelSettingsIcon fontSize="small" color="secondary" />
                        )}
                      </Box>
                    </TableCell>
                  ))}
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      難易度
                    </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewSongs.map((song, index) => (
                  <TableRow key={index} hover>
                    {visibleColumns.map(column => (
                      <TableCell key={column.key}>
                        <Typography variant="body2">
                          {getCellValue(song, column.key)}
                        </Typography>
                      </TableCell>
                    ))}
                    <TableCell>
                      {renderDifficultyChips(song)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* データ品質チェック */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              データ品質チェック:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {(() => {
                const emptyNames = songs.filter(s => !s.name || !s.name.trim()).length;
                const emptyArtists = songs.filter(s => !s.info.artist || !s.info.artist.trim()).length;
                const noDifficulties = songs.filter(s => 
                  Object.values(s.difficulties).every(d => d.level === null || d.level === undefined)
                ).length;
                const hasYouTubeUrls = songs.filter(s => 
                  s.youtubeUrls && Object.keys(s.youtubeUrls).length > 0
                ).length;
                
                return [
                  { label: '楽曲名なし', count: emptyNames, severity: 'error' as const },
                  { label: 'アーティストなし', count: emptyArtists, severity: 'warning' as const },
                  { label: '難易度なし', count: noDifficulties, severity: 'warning' as const },
                  { label: 'YouTube URL有り', count: hasYouTubeUrls, severity: 'success' as const },
                ].map(item => (
                  (item.count > 0 || item.severity === 'success') && (
                    <Chip
                      key={item.label}
                      label={`${item.label}: ${item.count}件`}
                      color={item.severity}
                      size="small"
                      variant="outlined"
                    />
                  )
                ));
              })()}
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default DataPreview; 