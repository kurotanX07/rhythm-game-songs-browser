import React, { createContext, useContext, useState, useEffect } from 'react';
import { Game } from '../types/Game';
import { Song } from '../types/Song';
import { getGames, getSongs } from '../services/songService';
import { useAuth } from './AuthContext';
import { useUpdateStatus } from '../hooks/useLastUpdate';

interface SongDataContextType {
  games: Game[];
  selectedGameId: string | null;
  songs: Song[];
  loading: boolean;
  error: string | null;
  selectGame: (gameId: string) => void;
  refreshData: () => Promise<void>;
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
        setGames(fetchedGames);
        
        // 最初のゲームを選択
        if (fetchedGames.length > 0 && !selectedGameId) {
          setSelectedGameId(fetchedGames[0].id);
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
      setGames(fetchedGames);
      
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
  
  const value: SongDataContextType = {
    games,
    selectedGameId,
    songs,
    loading,
    error,
    selectGame,
    refreshData
  };
  
  return (
    <SongDataContext.Provider value={value}>
      {children}
    </SongDataContext.Provider>
  );
}