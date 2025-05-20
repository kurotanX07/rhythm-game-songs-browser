import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { useSongData } from '../contexts/SongDataContext';
import { enableIndexedDbPersistence, clearIndexedDbPersistence } from 'firebase/firestore';

export function useOfflineSupport() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [persistenceEnabled, setPersistenceEnabled] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const { refreshData } = useSongData();

  // オフライン状態の監視
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      console.log('オンライン状態に戻りました');
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      console.log('オフライン状態になりました - Firestoreのローカルキャッシュが使用されます');
    };

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
        setPersistenceError(null);
        console.log('Firestoreオフライン永続化が有効になりました。');
      } catch (err: any) {
        setPersistenceError(err.message);
        if (err.code === 'failed-precondition') {
          console.warn('Firestoreオフライン永続化失敗: 複数タブでアプリが開かれている可能性があります。既存のタブでのみ永続化が有効です。');
          // 既に他のタブで有効化されている場合は、このタブでは読み取り専用キャッシュとして機能する可能性がある
          setPersistenceEnabled(true); 
        } else if (err.code === 'unimplemented') {
          console.error('Firestoreオフライン永続化失敗: このブラウザはIndexedDBをサポートしていません。');
        } else {
          console.error('Firestoreオフライン永続化中に予期せぬエラーが発生しました:', err);
        }
      }
    };

    setupPersistence();
    
    // クリーンアップ関数 (開発用): アプリケーション終了時にキャッシュをクリアする場合など
    // return () => {
    //   clearIndexedDbPersistence(db)
    //     .then(() => console.log('Firestore IndexedDBキャッシュをクリアしました。'))
    //     .catch((err) => console.error('Firestore IndexedDBキャッシュのクリアに失敗:', err));
    // };
  }, []);

  // オンラインに戻ったときのデータ同期 (オプション)
  // refreshData が SongDataContext でキャッシュをクリアして再フェッチするため、
  // ここでの明示的な呼び出しは状況によって調整する。
  // Firestoreのリスナー(onSnapshot)を使っている場合は自動で同期される。
  // 現在はgetDocsなので、手動更新が適切。
  useEffect(() => {
    if (!isOffline && persistenceEnabled) {
      console.log('オンラインに復帰しました。必要に応じてデータを更新します。');
      // データの再同期ロジック（例：refreshData()）をここに追加するか、
      // SongDataContextの既存の更新ロジックに依存します。
      // 今回は refreshData の呼び出しはそのままにしておく。
      const syncTimeout = setTimeout(() => {
        if (navigator.onLine) { // 再度オンラインか確認
          console.log('データの再同期を実行します。');
          refreshData();
        }
      }, 3000); // 3秒の遅延を持たせて、ネットワーク安定を待つ
      
      return () => clearTimeout(syncTimeout);
    }
  }, [isOffline, persistenceEnabled, refreshData]);

  return { isOffline, persistenceEnabled, persistenceError };
}