// src/contexts/SongDataContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game, DifficultyDefinition } from '../types/Game';
import { Song } from '../types/Song';
import { getGames, getSongs, clearServiceCache } from '../services/songService';
import { useAuth } from './AuthContext';
import { useUpdateStatus } from '../hooks/useLastUpdate';

// デフォルトの難易度設定
export const DEFAULT_DIFFICULTIES: DifficultyDefinition[] = [
  { id: 'EASY', name: 'EASY', color: '#43a047', order: 0 },
  { id: 'NORMAL', name: 'NORMAL', color: '#1976d2', order: 1 },
  { id: 'HARD', name: 'HARD', color: '#ff9800', order: 2 },
  { id: 'EXPERT', name: 'EXPERT', color: '#d32f2f', order: 3 },
  { id: 'MASTER', name: 'MASTER', color: '#9c27b0', order: 4 },
  { id: 'APPEND', name: 'APPEND', color: '#607d8b', order: 5 }
];

interface SongDataContextType {
  games: Game[];
  selectedGameId: string | null;
  songs: Song[];
  loading: boolean;
  error: string | null;
  selectGame: (gameId: string) => void;
  refreshData: () => Promise<void>;
  refreshDataAdmin: () => Promise<void>;
  refreshSongs: (gameId: string) => Promise<void>;
}

const SongDataContext = createContext<SongDataContextType | null>(null);

export function useSongData(): SongDataContextType {
  const context = useContext(SongDataContext);
  if (!context) {
    throw new Error('useSongData must be used within a SongDataProvider');
  }
  return context;
}

interface SongDataProviderProps {
  children: React.ReactNode;
}

export function SongDataProvider({ children }: SongDataProviderProps): JSX.Element {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { checkUpdateStatus, updateLastUpdate } = useUpdateStatus();
  
  // ゲーム一覧を取得
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('[SongDataContext] ゲーム一覧取得を開始します (キャッシュなし)');
        
        // キャッシュ関連ロジックを削除
        const fetchedGames = await getGames();
        console.log('[SongDataContext] Firestoreからゲーム一覧を取得しました (キャッシュなし):', fetchedGames.length, '件');
        
        const gamesWithDifficulties = fetchedGames.map(game => {
          if (!game.difficulties || !Array.isArray(game.difficulties) || game.difficulties.length === 0) {
            return {
              ...game,
              difficulties: [...DEFAULT_DIFFICULTIES]
            };
          }
          return game;
        });
        
        setGames(gamesWithDifficulties);
        console.log('[SongDataContext] setGames (キャッシュなし) 完了', gamesWithDifficulties);
        
        // キャッシュ保存ロジックを削除
        
        if (gamesWithDifficulties.length > 0 && !selectedGameId) {
          setSelectedGameId(gamesWithDifficulties[0].id);
          console.log('[SongDataContext] 最初のゲームを選択 (キャッシュなし):', gamesWithDifficulties[0].id);
        }
      } catch (err) {
        console.error('[SongDataContext] ゲームデータ取得エラー (キャッシュなし):', err);
        setError('ゲーム情報の取得に失敗しました');
      } finally {
        setLoading(false);
        console.log('[SongDataContext] fetchGames 処理完了 (キャッシュなし)');
      }
    };
    
    fetchGames();
  }, [selectedGameId]); // 依存配列を元に戻す (キャッシュ関連の依存を削除)
  
  // 選択したゲームの楽曲一覧を取得
  useEffect(() => {
    const fetchSongs = async () => {
      if (!selectedGameId) {
        setSongs([]);
        console.log('[SongDataContext] selectedGameId がないため、楽曲取得をスキップします (キャッシュなし)');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        console.log(`[SongDataContext] ${selectedGameId}の楽曲一覧取得を開始します (キャッシュなし)`);
        
        // キャッシュ関連ロジックを削除
        const fetchedSongs = await getSongs(selectedGameId);
        console.log(`[SongDataContext] Firestoreから${selectedGameId}の楽曲を取得しました (キャッシュなし):`, fetchedSongs.length, '件');
        setSongs(fetchedSongs);
        console.log(`[SongDataContext] setSongs (キャッシュなし for ${selectedGameId}) 完了`, fetchedSongs);
        
        // キャッシュ保存ロジックを削除
      } catch (err) {
        console.error('[SongDataContext] 楽曲データ取得エラー (キャッシュなし):', err);
        setError('楽曲情報の取得に失敗しました');
      } finally {
        setLoading(false);
        console.log(`[SongDataContext] fetchSongs for ${selectedGameId} 処理完了 (キャッシュなし)`);
      }
    };
    
    fetchSongs();
  }, [selectedGameId]); // 依存配列を元に戻す (キャッシュ関連の依存を削除)
  
  // ゲーム選択
  const selectGame = (gameId: string) => {
    console.log('[SongDataContext] ゲームを選択 (キャッシュなし):', gameId);
    setSelectedGameId(gameId);
  };
  
  // データ更新
  const refreshData = async () => {
    if (!currentUser) {
      console.log('[SongDataContext] refreshData: currentUser がいないためスキップ (キャッシュなし)');
      return;
    }
    
    try {
      console.log('[SongDataContext] refreshData: 更新を開始します (キャッシュなし)');
      const status = await checkUpdateStatus(currentUser.uid);
      
      if (!status.isUpdateAvailable) {
        const nextTime = status.nextAvailableUpdate;
        if (nextTime) {
          const timeString = nextTime.toLocaleString();
          throw new Error(`更新は1日1回までです。次回更新可能時間: ${timeString}`);
        } else {
          throw new Error('現在更新できません。しばらく経ってから再試行してください。');
        }
      }
      
      setLoading(true);
      setError(null);
      
      // キャッシュクリアロジックを削除
      clearServiceCache();
      
      const fetchedGames = await getGames();
      console.log('[SongDataContext] refreshData: ゲーム一覧を再取得しました (キャッシュなし):', fetchedGames.length, '件');
      
      const gamesWithDifficulties = fetchedGames.map(game => {
        if (!game.difficulties || !Array.isArray(game.difficulties) || game.difficulties.length === 0) {
          return {
            ...game,
            difficulties: [...DEFAULT_DIFFICULTIES]
          };
        }
        return game;
      });
      
      setGames(gamesWithDifficulties);
      console.log('[SongDataContext] refreshData: setGames 完了 (キャッシュなし)', gamesWithDifficulties);
      
      // キャッシュ保存ロジックを削除
      
      if (selectedGameId) {
        console.log(`[SongDataContext] refreshData: ${selectedGameId}の楽曲一覧を再取得します (キャッシュなし)`);
        const fetchedSongs = await getSongs(selectedGameId);
        console.log(`[SongDataContext] refreshData: ${selectedGameId}の楽曲を再取得しました (キャッシュなし):`, fetchedSongs.length, '件');
        setSongs(fetchedSongs);
        console.log(`[SongDataContext] refreshData: setSongs for ${selectedGameId} 完了 (キャッシュなし)`, fetchedSongs);
        
        // キャッシュ保存ロジックを削除
      } else {
        console.log('[SongDataContext] refreshData: selectedGameId がないので楽曲は再取得しません (キャッシュなし)');
      }
      
      await updateLastUpdate(currentUser.uid);
      console.log('[SongDataContext] refreshData: 更新日時を記録しました (キャッシュなし)');
    } catch (err: any) {
      console.error('[SongDataContext] データ更新エラー (キャッシュなし):', err);
      setError(err.message || 'データの更新に失敗しました');
    } finally {
      setLoading(false);
      console.log('[SongDataContext] refreshData: 処理完了 (キャッシュなし)');
    }
  };

  const refreshSongs = async (gameId: string) => {
    if (!gameId) {
      console.log('[SongDataContext] refreshSongs: gameId がないためスキップ (キャッシュなし)');
      return;
    }
    
    try {
      console.log(`[SongDataContext] refreshSongs: ${gameId} のデータを更新します (キャッシュなし)`);
      setLoading(true);
      setError(null);
      
      // キャッシュクリアロジックを削除
      clearServiceCache(gameId);
      
      const fetchedSongs = await getSongs(gameId);
      console.log(`[SongDataContext] refreshSongs: ${gameId}の楽曲を再取得しました (キャッシュなし):`, fetchedSongs.length, '件');
      setSongs(fetchedSongs);
      console.log(`[SongDataContext] refreshSongs: setSongs for ${gameId} 完了 (キャッシュなし)`, fetchedSongs);
      
      // キャッシュ保存ロジックを削除
    } catch (err: any) {
      console.error('[SongDataContext] 楽曲データ取得エラー (キャッシュなし):', err);
      setError(err.message || '楽曲情報の取得に失敗しました');
    } finally {
      setLoading(false);
      console.log(`[SongDataContext] refreshSongs for ${gameId}: 処理完了 (キャッシュなし)`);
    }
  };
  
  const refreshDataAdmin = async () => {
    try {
      console.log('[SongDataContext] refreshDataAdmin: 管理者データ更新を開始します (キャッシュなし)');
      setLoading(true);
      setError(null);
      
      // キャッシュクリアロジックを削除
      clearServiceCache();
      
      const fetchedGames = await getGames();
      console.log('[SongDataContext] refreshDataAdmin: ゲーム一覧を再取得しました (キャッシュなし):', fetchedGames.length, '件');
      
      console.log('[SongDataContext] refreshDataAdmin: Fetched games with level ranges (キャッシュなし):', fetchedGames.map(game => ({
        id: game.id,
        title: game.title,
        minLevel: game.minLevel,
        maxLevel: game.maxLevel
      })));
      
      const gamesWithDifficulties = fetchedGames.map(game => {
        return {
          ...game,
          difficulties: game.difficulties && Array.isArray(game.difficulties) && game.difficulties.length > 0
            ? game.difficulties
            : [...DEFAULT_DIFFICULTIES],
          minLevel: game.minLevel !== undefined ? game.minLevel : 1,
          maxLevel: game.maxLevel !== undefined ? game.maxLevel : 37
        };
      });
      
      setGames(gamesWithDifficulties);
      console.log('[SongDataContext] refreshDataAdmin: setGames 完了 (キャッシュなし)', gamesWithDifficulties);
      
      if (selectedGameId) {
        console.log(`[SongDataContext] refreshDataAdmin: ${selectedGameId}の楽曲一覧を再取得します (キャッシュなし)`);
        const fetchedSongs = await getSongs(selectedGameId);
        console.log(`[SongDataContext] refreshDataAdmin: ${selectedGameId}の楽曲を再取得しました (キャッシュなし):`, fetchedSongs.length, '件');
        setSongs(fetchedSongs);
        console.log(`[SongDataContext] refreshDataAdmin: setSongs for ${selectedGameId} 完了 (キャッシュなし)`, fetchedSongs);
        
        // キャッシュ保存ロジックを削除
      } else {
        console.log('[SongDataContext] refreshDataAdmin: selectedGameId がないので楽曲は再取得しません (キャッシュなし)');
      }
      
      // キャッシュ保存ロジックを削除
    } catch (err: any) {
      console.error('[SongDataContext] 管理データ更新エラー (キャッシュなし):', err);
      setError(err.message || '管理データの更新に失敗しました');
    } finally {
      setLoading(false);
      console.log('[SongDataContext] refreshDataAdmin: 処理完了 (キャッシュなし)');
    }
  };
  
  const value: SongDataContextType = {
    games,
    selectedGameId,
    songs,
    loading,
    error,
    selectGame,
    refreshData,
    refreshDataAdmin,
    refreshSongs
  };
  
  return (
    <SongDataContext.Provider value={value}>
      {children}
    </SongDataContext.Provider>
  );
}