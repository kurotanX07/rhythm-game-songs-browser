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

// テストデータ定義
const TEST_GAMES: Game[] = [
  {
    id: 'test-game-1',
    title: 'Project SEKAI',
    description: 'プロジェクトセカイ カラフルステージ！',
    imageUrl: '',
    songCount: 450,
    lastUpdated: new Date(),
    minLevel: 1,
    maxLevel: 37,
    difficulties: [...DEFAULT_DIFFICULTIES]
  },
  {
    id: 'test-game-2', 
    title: 'バンドリ！ガルパ',
    description: 'BanG Dream! ガールズバンドパーティ！',
    imageUrl: '',
    songCount: 300,
    lastUpdated: new Date(),
    minLevel: 1,
    maxLevel: 28,
    difficulties: [...DEFAULT_DIFFICULTIES]
  },
  {
    id: 'test-game-3', 
    title: 'D4DJ Groovy Mix',
    description: 'D4DJ Groovy Mix',
    imageUrl: '',
    songCount: 200,
    lastUpdated: new Date(),
    minLevel: 1,
    maxLevel: 15,
    difficulties: [...DEFAULT_DIFFICULTIES]
  }
];

export function SongDataProvider({ children }: SongDataProviderProps): JSX.Element {
  const [games, setGames] = useState<Game[]>(TEST_GAMES); // 初期状態でテストデータを設定
  const [selectedGameId, setSelectedGameId] = useState<string | null>(TEST_GAMES[0].id);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // 初期状態をfalseに変更
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { checkUpdateStatus, updateLastUpdate } = useUpdateStatus();
  
  // デバッグ用ログ
  console.log('[SongDataContext] Provider initialized');
  console.log('[SongDataContext] Current user:', currentUser?.uid || 'No user');
  console.log('[SongDataContext] Loading state:', loading);
  console.log('[SongDataContext] Error state:', error);
  console.log('[SongDataContext] Games count:', games.length);
  
  // Firebase接続の詳細診断
  useEffect(() => {
    console.log('[SongDataContext] Firebase接続診断を開始');
    
    const diagnoseFirebase = async () => {
      try {
        // 環境情報
        console.log('[SongDataContext] Environment:', process.env.NODE_ENV);
        console.log('[SongDataContext] User Agent:', navigator.userAgent);
        console.log('[SongDataContext] Platform:', (window as any).Capacitor?.getPlatform?.() || 'web');
        
        // ネットワーク状態確認
        console.log('[SongDataContext] Online status:', navigator.onLine);
        
        // iOS特有のネットワーク状態確認
        if ((window as any).Capacitor) {
          console.log('[SongDataContext] Running in Capacitor environment');
          // iOS WebViewでのネットワーク接続確認
          const testFetch = async () => {
            try {
              await fetch('https://www.google.com/favicon.ico', { 
                mode: 'no-cors',
                method: 'HEAD'
              });
              console.log('[SongDataContext] Basic network test successful');
              return true;
            } catch (fetchError) {
              console.log('[SongDataContext] Basic network test failed:', fetchError);
              return false;
            }
          };
          
          const networkOk = await testFetch();
          console.log('[SongDataContext] Network connectivity:', networkOk);
        }
        
        // Firebase設定確認
        const { db } = await import('../services/firebase');
        console.log('[SongDataContext] Firebase app initialized');
        console.log('[SongDataContext] Firestore instance:', db);
        
        // 簡単な接続テスト
        console.log('[SongDataContext] Testing Firebase connection...');
        setLoading(true);
        setError(null);
        
        // タイムアウト付きでFirebase接続テスト (iOS環境では短めに設定)
        const timeoutMs = (window as any).Capacitor ? 3000 : 10000; // iOS: 3秒, Web: 10秒
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Firebase接続タイムアウト (${timeoutMs/1000}秒)`)), timeoutMs)
        );
        
        const testResult = await Promise.race([
          getGames(),
          timeoutPromise
        ]) as Game[];
        
        console.log('[SongDataContext] Firebase接続成功:', testResult.length, '件のゲームを取得');
        
        if (testResult.length > 0) {
          const gamesWithDifficulties = testResult.map(game => ({
            ...game,
            difficulties: game.difficulties || [...DEFAULT_DIFFICULTIES]
          }));
          
          setGames(gamesWithDifficulties);
          if (!selectedGameId) {
            setSelectedGameId(gamesWithDifficulties[0].id);
          }
          console.log('[SongDataContext] Firebase データでゲーム一覧を更新');
        } else {
          console.log('[SongDataContext] Firebase接続成功だが、ゲームが0件 - テストデータを使用');
          // テストデータにフォールバック
          setGames(TEST_GAMES);
          if (!selectedGameId) {
            setSelectedGameId(TEST_GAMES[0].id);
          }
        }
        
      } catch (err) {
        console.error('[SongDataContext] Firebase接続エラー:', err);
        console.error('[SongDataContext] エラー詳細:', {
          name: (err as Error).name,
          message: (err as Error).message,
          stack: (err as Error).stack
        });
        
        // エラー時はテストデータを使用
        console.log('[SongDataContext] エラーによりテストデータを使用');
        setGames(TEST_GAMES);
        if (!selectedGameId) {
          setSelectedGameId(TEST_GAMES[0].id);
        }
        // エラーメッセージを分かりやすく変換
        let errorMessage = (err as Error).message;
        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
          errorMessage = 'APIの利用制限に達しました。しばらく時間をおいてからお試しください。';
        } else if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
        console.log('[SongDataContext] Firebase診断完了');
      }
    };
    
    diagnoseFirebase();
  }, []); // 初回のみ実行
  
  // iOS環境でのREST API楽曲取得テスト
  useEffect(() => {
    if (!selectedGameId) {
      setSongs([]);
      console.log('[SongDataContext] selectedGameId がないため、楽曲をクリア');
      return;
    }
    
    const fetchSongs = async () => {
      try {
        console.log(`[SongDataContext] iOS向けREST APIで${selectedGameId}の楽曲取得を開始`);
        setLoading(true);
        setError(null);
        
        const fetchedSongs = await getSongs(selectedGameId);
        console.log(`[SongDataContext] 楽曲取得成功:`, fetchedSongs.length, '件');
        setSongs(fetchedSongs);
      } catch (err) {
        console.error('[SongDataContext] 楽曲取得エラー:', err);
        setSongs([]); // エラー時は空配列
        
        // エラーメッセージを分かりやすく変換
        let errorMessage = (err as Error).message;
        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
          errorMessage = 'APIの利用制限に達しました。しばらく時間をおいてからお試しください。';
        } else if (errorMessage.includes('Network Error') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
        } else {
          errorMessage = '楽曲データの読み込みに失敗しました。';
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
        console.log(`[SongDataContext] 楽曲取得処理完了 for ${selectedGameId}`);
      }
    };
    
    fetchSongs();
  }, [selectedGameId]);
  
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