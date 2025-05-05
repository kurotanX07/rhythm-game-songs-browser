// src/contexts/SongDataContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game, DifficultyDefinition } from '../types/Game';
import { Song } from '../types/Song';
import { getGames, getSongs } from '../services/songService';
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
  refreshSongs: (gameId: string) => Promise<void>; // 追加: 楽曲取得専用の関数
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
        
        const fetchedGames = await getGames();
        
        // 修正: 必ず difficulties プロパティを持つことを確認
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
        
        // 最初のゲームを選択
        if (gamesWithDifficulties.length > 0 && !selectedGameId) {
          setSelectedGameId(gamesWithDifficulties[0].id);
        }
      } catch (err) {
        console.error('ゲームデータ取得エラー:', err);
        setError('ゲーム情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGames();
  }, []);
  
  // 選択したゲームの楽曲一覧を取得
  useEffect(() => {
    const fetchSongs = async () => {
      if (!selectedGameId) {
        setSongs([]);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const fetchedSongs = await getSongs(selectedGameId);
        setSongs(fetchedSongs);
      } catch (err) {
        console.error('楽曲データ取得エラー:', err);
        setError('楽曲情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSongs();
  }, [selectedGameId]);
  
  // ゲーム選択
  const selectGame = (gameId: string) => {
    setSelectedGameId(gameId);
  };
  
  // データ更新
  const refreshData = async () => {
    if (!currentUser) {
      return;
    }
    
    try {
      // 更新可能かチェック
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
      
      // ゲーム一覧を再取得
      const fetchedGames = await getGames();
      
      // 修正: 必ず difficulties プロパティを持つことを確認
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
      
      // 楽曲一覧を再取得（選択中のゲームがある場合）
      if (selectedGameId) {
        const fetchedSongs = await getSongs(selectedGameId);
        setSongs(fetchedSongs);
      }
      
      // 更新日時を記録
      await updateLastUpdate(currentUser.uid);
    } catch (err: any) {
      console.error('データ更新エラー:', err);
      setError(err.message || 'データの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 修正後のrefreshSongs関数 (楽曲取得専用、更新制限なし)
  const refreshSongs = async (gameId: string) => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 楽曲一覧を取得
      const fetchedSongs = await getSongs(gameId);
      setSongs(fetchedSongs);
    } catch (err: any) {
      console.error('楽曲データ取得エラー:', err);
      setError(err.message || '楽曲情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  const refreshDataAdmin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // ゲーム一覧を再取得
      const fetchedGames = await getGames();
      
      // ゲームデータをログに出力して問題を特定
      console.log('Fetched games with level ranges:', fetchedGames.map(game => ({
        id: game.id,
        title: game.title,
        minLevel: game.minLevel,
        maxLevel: game.maxLevel
      })));
      
      // 修正: 必ず difficulties プロパティを持つことを確認
      const gamesWithDifficulties = fetchedGames.map(game => {
        // ここで、minLevel と maxLevel を確実に取得
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
      
      // 楽曲一覧を再取得（選択中のゲームがある場合）
      if (selectedGameId) {
        const fetchedSongs = await getSongs(selectedGameId);
        setSongs(fetchedSongs);
      }
    } catch (err: any) {
      console.error('管理データ更新エラー:', err);
      setError(err.message || '管理データの更新に失敗しました');
    } finally {
      setLoading(false);
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
    refreshSongs  // 楽曲取得専用の関数を追加
  };
  
  return (
    <SongDataContext.Provider value={value}>
      {children}
    </SongDataContext.Provider>
  );
}