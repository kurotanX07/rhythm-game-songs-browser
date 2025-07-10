// src/components/user/SongList.tsx
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Chip, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tooltip,
  IconButton, Pagination, FormControl, InputLabel, Select,
  MenuItem, SelectChangeEvent, Slider, Switch, FormControlLabel,
  useMediaQuery, useTheme as useMuiTheme, TextField
} from '@mui/material';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Song } from '../../types/Song';
import { Game } from '../../types/Game';
import { FilterOptions } from './FilterControls';
import { useFavorites } from '../../hooks/useFavorites';

interface SongListProps {
  songs: Song[];
  filters: FilterOptions;
  game: Game | null;
  onAddToComparison?: (song: Song) => void;
}

// Column visibility state interface
interface ColumnVisibility {
  artist: boolean;
  lyricist: boolean;
  composer: boolean;
  arranger: boolean;
  duration: boolean;
  bpm: boolean;
  addedDate: boolean;
}

// Display density settings
type DisplayDensity = 'compact' | 'comfortable' | 'spacious' | 'very-spacious';

const SongList: React.FC<SongListProps> = ({ 
  songs, 
  filters, 
  game,
  onAddToComparison
}) => {
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  
  // ソート状態 - デフォルトは楽曲No.順
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({
    key: 'songNo',
    direction: 'asc'
  });
  
  // ページネーション
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  
  // 表示設定
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  
  // お気に入り機能
  const { favorites, toggleFavorite } = useFavorites();
  
  console.log('[SongList] Rendering with:', { 
    songsCount: songs.length, 
    filters, 
    game: game?.title 
  });
  
  // フィルタリングされた楽曲を計算
  const filteredSongs = useMemo(() => {
    let filtered = songs.filter(song => {
      // 検索テキストフィルタ
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const nameMatch = song.name.toLowerCase().includes(searchLower);
        const artistMatch = song.info.artist?.toLowerCase().includes(searchLower) || false;
        if (!nameMatch && !artistMatch) return false;
      }
      
      // 難易度フィルタ
      if (filters.difficulty !== 'ALL') {
        const difficulty = song.difficulties[filters.difficulty];
        if (!difficulty || !difficulty.level) return false;
        
        // レベル範囲フィルタ
        if (difficulty.level < filters.minLevel || difficulty.level > filters.maxLevel) {
          return false;
        }
      }
      
      // タグフィルタ
      if (filters.tags.length > 0) {
        if (!song.info.tags || song.info.tags.length === 0) return false;
        const songTagsLower = song.info.tags.map(tag => tag.toLowerCase());
        const hasMatchingTag = filters.tags.some(filterTag =>
          songTagsLower.some(songTag => songTag.includes(filterTag.toLowerCase()))
        );
        if (!hasMatchingTag) return false;
      }
      
      // お気に入りフィルタ
      if (filters.favoritesOnly) {
        if (!favorites.includes(song.id)) return false;
      }
      
      return true;
    });
    
    // ソート適用
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any = a;
        let bValue: any = b;
        
        // ネストしたプロパティへのアクセス
        const keys = sortConfig.key.split('.');
        for (const key of keys) {
          aValue = aValue?.[key];
          bValue = bValue?.[key];
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [songs, filters, favorites, sortConfig]);
  
  // ページネーション用のデータ
  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  const paginatedSongs = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredSongs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSongs, page, itemsPerPage]);
  
  // ソートハンドラ
  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };
  
  // ページ変更ハンドラ
  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };
  
  // 楽曲がない場合の表示
  if (songs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          楽曲データがありません
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ゲームを選択してください
        </Typography>
      </Box>
    );
  }
  
  // フィルタ結果が空の場合
  if (filteredSongs.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          条件に一致する楽曲がありません
        </Typography>
        <Typography variant="body2" color="text.secondary">
          フィルタ条件を変更してください
        </Typography>
      </Box>
    );
  }
  
  return (
    <Box>
      {/* 楽曲数表示と表示設定 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="subtitle1" sx={{ fontSize: isMobile ? '0.9rem' : '1rem' }}>
          {filteredSongs.length}曲 / {songs.length}曲
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {/* 表示件数設定 */}
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>件数</InputLabel>
            <Select
              value={itemsPerPage}
              label="件数"
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setPage(1); // ページをリセット
              }}
            >
              <MenuItem value={10}>10件</MenuItem>
              <MenuItem value={20}>20件</MenuItem>
              <MenuItem value={50}>50件</MenuItem>
              <MenuItem value={100}>100件</MenuItem>
              <MenuItem value={200}>200件</MenuItem>
            </Select>
          </FormControl>
          
          {/* 詳細表示切り替え */}
          <FormControlLabel
            control={
              <Switch
                checked={showDetailedInfo}
                onChange={(e) => setShowDetailedInfo(e.target.checked)}
                size="small"
              />
            }
            label="詳細"
            sx={{ 
              margin: 0,
              '& .MuiFormControlLabel-label': {
                fontSize: isMobile ? '0.75rem' : '0.875rem'
              }
            }}
          />
          
          <Typography variant="body2" color="text.secondary">
            {game?.title}
          </Typography>
        </Box>
      </Box>
      
      {/* 楽曲テーブル */}
      <TableContainer component={Paper} sx={{ mb: 2, overflowX: 'auto' }}>
        <Table 
          size="small" 
          sx={{ 
            minWidth: isMobile 
              ? (showDetailedInfo ? 1000 : 500)  // モバイル：YouTube複数対応で幅調整
              : 1400,  // PC：YouTube複数対応で幅調整
            '& .MuiTableCell-root': {
              padding: isMobile ? '4px 8px' : '6px 12px',  // 縦幅を圧縮
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              border: '1px solid rgba(224, 224, 224, 1)'  // 列の区分線を追加
            },
            '& .MuiTableCell-head': {
              fontWeight: 'bold',
              backgroundColor: 'grey.50',
              border: '1px solid rgba(224, 224, 224, 1)'
            },
            '& .MuiTableRow-root': {
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)'
              }
            }
          }}
        >
          <TableHead>
            <TableRow>
              {/* お気に入り列を一番左に追加 */}
              <TableCell align="center" sx={{ minWidth: '40px', padding: '4px' }}>
                <FavoriteIcon sx={{ fontSize: '1rem' }} />
              </TableCell>
              <TableCell sx={{ minWidth: isMobile ? '40px' : '50px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                     onClick={() => handleSort('songNo')}>
                  No.
                  {sortConfig?.key === 'songNo' && (
                    sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                  )}
                </Box>
              </TableCell>
              <TableCell sx={{ minWidth: isMobile ? '120px' : '200px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                     onClick={() => handleSort('name')}>
                  楽曲名
                  {sortConfig?.key === 'name' && (
                    sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                  )}
                </Box>
              </TableCell>
              
              {/* PC版：全ての列を表示 - 新しい順番 */}
              {!isMobile && (
                <>
                  {/* 難易度・レベル・YouTube を楽曲名の次に配置 */}
                  <TableCell align="center" sx={{ minWidth: '280px' }}>難易度・レベル・YouTube</TableCell>
                  
                  {/* 時間とBPM */}
                  <TableCell sx={{ minWidth: '100px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                         onClick={() => handleSort('info.duration')}>
                      時間
                      {sortConfig?.key === 'info.duration' && (
                        sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: '80px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                         onClick={() => handleSort('info.bpm')}>
                      BPM
                      {sortConfig?.key === 'info.bpm' && (
                        sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                      )}
                    </Box>
                  </TableCell>
                  
                  {/* アーティスト関連情報 */}
                  <TableCell sx={{ minWidth: '150px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                         onClick={() => handleSort('info.artist')}>
                      アーティスト
                      {sortConfig?.key === 'info.artist' && (
                        sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: '120px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                         onClick={() => handleSort('info.lyricist')}>
                      作詞
                      {sortConfig?.key === 'info.lyricist' && (
                        sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: '120px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                         onClick={() => handleSort('info.composer')}>
                      作曲
                      {sortConfig?.key === 'info.composer' && (
                        sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: '100px' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                         onClick={() => handleSort('info.arranger')}>
                      編曲
                      {sortConfig?.key === 'info.arranger' && (
                        sortConfig.direction === 'asc' ? <ArrowDropUpIcon /> : <ArrowDropDownIcon />
                      )}
                    </Box>
                  </TableCell>
                </>
              )}
              
              {/* モバイル版：詳細表示の切り替えによる列の表示 - 新しい順番 */}
              {isMobile && (
                <>
                  {/* 難易度・レベル・YouTube を楽曲名の次に配置 */}
                  <TableCell align="center" sx={{ minWidth: '200px' }}>難易度・レベル・YouTube</TableCell>
                  {showDetailedInfo && (
                    <>
                      {/* 時間とBPM */}
                      <TableCell sx={{ minWidth: '80px' }}>時間</TableCell>
                      <TableCell sx={{ minWidth: '70px' }}>BPM</TableCell>
                      {/* アーティスト関連情報 */}
                      <TableCell sx={{ minWidth: '120px' }}>アーティスト</TableCell>
                      <TableCell sx={{ minWidth: '100px' }}>作詞</TableCell>
                      <TableCell sx={{ minWidth: '100px' }}>作曲</TableCell>
                      <TableCell sx={{ minWidth: '100px' }}>編曲</TableCell>
                    </>
                  )}
                </>
              )}
              
              <TableCell align="center" sx={{ minWidth: isMobile ? '80px' : '100px' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedSongs.map((song) => {
              // 各難易度のYouTube URLを収集
              const getYouTubeUrls = (song: any) => {
                if (!song.difficulties) return [];
                const urls: {diffId: string, url: string, name: string, color: string}[] = [];
                
                if (game?.difficulties) {
                  game.difficulties.forEach(gameDiff => {
                    const songDiff = song.difficulties[gameDiff.id];
                    if (songDiff?.youtubeUrl) {
                      urls.push({
                        diffId: gameDiff.id,
                        url: songDiff.youtubeUrl,
                        name: gameDiff.name,
                        color: gameDiff.color
                      });
                    }
                  });
                }
                return urls;
              };
              
              const youtubeUrls = getYouTubeUrls(song);
              const primaryYoutubeUrl = youtubeUrls.length > 0 ? youtubeUrls[0].url : null;
              
              return (
                <TableRow key={song.id} hover>
                  {/* お気に入りボタンを一番左に追加 */}
                  <TableCell align="center" sx={{ padding: '4px' }}>
                    <IconButton
                      size="small"
                      onClick={() => toggleFavorite(song.id)}
                      sx={{ padding: '4px' }}
                    >
                      {favorites.includes(song.id) ? (
                        <FavoriteIcon sx={{ fontSize: '1rem', color: 'error.main' }} />
                      ) : (
                        <FavoriteBorderIcon sx={{ fontSize: '1rem' }} />
                      )}
                    </IconButton>
                  </TableCell>
                  
                  {/* 楽曲No. */}
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium" sx={{ fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                      {song.songNo || '-'}
                    </Typography>
                  </TableCell>
                  
                  {/* 楽曲名 */}
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      fontWeight="medium"
                      sx={{ 
                        cursor: 'pointer',
                        fontSize: isMobile ? '0.7rem' : '0.8rem',
                        lineHeight: 1.2,
                        '&:hover': { 
                          color: 'primary.main',
                          textDecoration: 'underline'
                        }
                      }}
                      onClick={() => navigate(`/songs/${song.id}`)}
                    >
                      {song.name}
                    </Typography>
                  </TableCell>
                  
                  {/* PC版：全ての情報を表示 - 新しい順番 */}
                  {!isMobile && (
                    <>
                      {/* 難易度・レベル・YouTubeを楽曲名の次に配置 */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 0.5, justifyContent: 'center', alignItems: 'center' }}>
                          {game?.difficulties.map((diff) => {
                            const songDiff = song.difficulties?.[diff.id];
                            const hasLevel = songDiff && (songDiff.level || songDiff.level === 0);
                            const hasYoutube = hasLevel && !!songDiff.youtubeUrl;
                            
                            return (
                              <Box key={diff.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                                {hasLevel ? (
                                  <Chip
                                    label={songDiff.level}
                                    size="small"
                                    sx={{
                                      backgroundColor: diff.color,
                                      color: 'white',
                                      fontWeight: 'bold',
                                      fontSize: '0.65rem',
                                      minWidth: '28px',
                                      height: '20px',
                                      cursor: 'pointer',
                                      '&:hover': {
                                        opacity: 0.8,
                                        transform: 'scale(1.05)'
                                      }
                                    }}
                                    onClick={() => handleSort(`difficulties.${diff.id}.level`)}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: '28px',
                                      height: '20px',
                                      borderRadius: '12px',
                                      backgroundColor: 'grey.200',
                                      border: `1px solid ${diff.color}`,
                                      opacity: 0.3
                                    }}
                                  />
                                )}
                                {hasYoutube && (
                                  <Tooltip title={`${diff.name} YouTube`}>
                                    <IconButton 
                                      size="small"
                                      onClick={() => songDiff.youtubeUrl && window.open(songDiff.youtubeUrl, '_blank')}
                                      sx={{
                                        color: diff.color,
                                        padding: '2px',
                                        '&:hover': {
                                          backgroundColor: 'rgba(255,0,0,0.1)'
                                        }
                                      }}
                                    >
                                      <YouTubeIcon sx={{ fontSize: '14px' }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      </TableCell>
                      
                      {/* 時間とBPM */}
                      <TableCell>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {song.info?.duration || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {song.info?.bpm || '-'}
                        </Typography>
                      </TableCell>
                      
                      {/* アーティスト関連情報 */}
                      <TableCell>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {song.info?.artist || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {song.info?.lyricist || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {song.info?.composer || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2"
                          sx={{ fontSize: '0.8rem' }}
                        >
                          {song.info?.arranger || '-'}
                        </Typography>
                      </TableCell>
                    </>
                  )}
                  
                  {/* モバイル版：基本情報 + 詳細表示での追加情報 */}
                  {isMobile && (
                    <>
                      {/* 難易度・レベル・YouTube（モバイル版） */}
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 0.3, justifyContent: 'center', alignItems: 'center' }}>
                          {game?.difficulties.map((diff) => {
                            const songDiff = song.difficulties?.[diff.id];
                            const hasLevel = songDiff && (songDiff.level || songDiff.level === 0);
                            const hasYoutube = hasLevel && !!songDiff.youtubeUrl;
                            
                            return (
                              <Box key={diff.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
                                {hasLevel ? (
                                  <Chip
                                    label={songDiff.level}
                                    size="small"
                                    sx={{
                                      backgroundColor: diff.color,
                                      color: 'white',
                                      fontWeight: 'bold',
                                      fontSize: '0.6rem',
                                      minWidth: '24px',
                                      height: '18px',
                                      cursor: 'pointer',
                                      '&:hover': {
                                        opacity: 0.8,
                                        transform: 'scale(1.05)'
                                      }
                                    }}
                                    onClick={() => handleSort(`difficulties.${diff.id}.level`)}
                                  />
                                ) : (
                                  <Box
                                    sx={{
                                      width: '24px',
                                      height: '18px',
                                      borderRadius: '9px',
                                      backgroundColor: 'grey.200',
                                      border: `1px solid ${diff.color}`,
                                      opacity: 0.3
                                    }}
                                  />
                                )}
                                {hasYoutube && (
                                  <Tooltip title={`${diff.name} YouTube`}>
                                    <IconButton 
                                      size="small"
                                      onClick={() => songDiff.youtubeUrl && window.open(songDiff.youtubeUrl, '_blank')}
                                      sx={{
                                        color: diff.color,
                                        padding: '1px',
                                        '&:hover': {
                                          backgroundColor: 'rgba(255,0,0,0.1)'
                                        }
                                      }}
                                    >
                                      <YouTubeIcon sx={{ fontSize: '12px' }} />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            );
                          })}
                        </Box>
                      </TableCell>
                      
                      {/* 詳細表示時の追加情報 - 新しい順番 */}
                      {showDetailedInfo && (
                        <>
                          {/* 時間 */}
                          <TableCell>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {song.info?.duration || '-'}
                            </Typography>
                          </TableCell>
                          
                          {/* BPM */}
                          <TableCell>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {song.info?.bpm || '-'}
                            </Typography>
                          </TableCell>
                          
                          {/* アーティスト関連情報 */}
                          <TableCell>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {song.info?.artist || '-'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {song.info?.lyricist || '-'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {song.info?.composer || '-'}
                            </Typography>
                          </TableCell>
                          
                          <TableCell>
                            <Typography 
                              variant="body2"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {song.info?.arranger || '-'}
                            </Typography>
                          </TableCell>
                        </>
                      )}
                    </>
                  )}
                  
                  {/* 操作 - お気に入りボタンを左に移動したので詳細ボタンのみ */}
                  <TableCell align="center">
                    <Tooltip title="詳細情報">
                      <IconButton 
                        size="small"
                        onClick={() => navigate(`/songs/${song.id}`)}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: isMobile ? '1rem' : '1.2rem' }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      
      
      {/* ページネーション */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? 'small' : 'medium'}
          />
        </Box>
      )}
    </Box>
  );
};

export default React.memo(SongList);