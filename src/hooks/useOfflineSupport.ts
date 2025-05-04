import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { enableIndexedDbPersistence } from 'firebase/firestore';
import { useSongData } from '../contexts/SongDataContext';

export function useOfflineSupport() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const { refreshData } = useSongData();

  // オフライン状態の監視
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firestoreのオフラインキャッシュを有効化
  useEffect(() => {
    const setupPersistence = async () => {
      try {
        await enableIndexedDbPersistence(db);
        setPersistenceEnabled(true);
      } catch (err) {
        console.error('オフラインキャッシュの有効化に失敗:', err);
      }
    };

    setupPersistence();
  }, []);

  // オンラインに戻ったときのデータ同期
  useEffect(() => {
    if (!isOffline && persistenceEnabled) {
      refreshData();
    }
  }, [isOffline, persistenceEnabled]);

  return { isOffline, persistenceEnabled };
}