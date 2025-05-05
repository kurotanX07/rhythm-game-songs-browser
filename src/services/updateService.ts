// src/services/updateService.ts
import { 
    collection, query, orderBy, limit, getDocs, setDoc, doc, serverTimestamp,
    Timestamp, DocumentData, where, getDoc
  } from 'firebase/firestore';
  import { db } from './firebase';
  
  // コレクション名の定義
  const UPDATE_HISTORY_COLLECTION = 'updateHistory';
  
  // 無視するタイトルパターン（楽曲データアップロードはログに残さない）
  const IGNORED_TITLE_PATTERNS = [
    '曲の楽曲データをアップロード',
    '楽曲データをアップロード'
  ];
  
  /**
   * 更新履歴を記録する - 同じタイトルは上書き
   * @param title 更新のタイトル
   * @param description 更新の詳細説明
   * @param userId 更新を行ったユーザーID
   * @param gameId 関連するゲームID（オプション）
   */
  export async function recordUpdate(
    title: string, 
    description: string, 
    userId: string, 
    gameId?: string
  ): Promise<void> {
    try {
      // アップロードログは記録しない
      if (IGNORED_TITLE_PATTERNS.some(pattern => title.includes(pattern))) {
        console.log('無視された更新タイトル:', title);
        return;
      }
      
      // タイトルからドキュメントIDを生成（同じタイトルなら同じIDになる）
      // 日本語や特殊文字を含むタイトルも安全に処理するためにハッシュ化
      const hashCode = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = ((hash << 5) - hash) + str.charCodeAt(i);
          hash |= 0; // 32bit整数に変換
        }
        return Math.abs(hash).toString(16); // 16進数の正の値に変換
      };
      
      const documentId = gameId 
        ? `${gameId}_${hashCode(title)}`
        : `global_${hashCode(title)}`;
      
      // 既存のドキュメントを確認
      const existingDoc = await getDoc(doc(db, UPDATE_HISTORY_COLLECTION, documentId));
      
      // 上書き保存（同じタイトルの更新は日時だけ更新）
      await setDoc(doc(db, UPDATE_HISTORY_COLLECTION, documentId), {
        title,
        description,
        userId,
        gameId: gameId || null,
        createdAt: serverTimestamp(),
        // 既存のドキュメントがあれば、初回作成日時を保持
        firstCreatedAt: existingDoc.exists() 
          ? existingDoc.data().firstCreatedAt 
          : serverTimestamp()
      });
      
      console.log('更新履歴を記録しました:', title);
    } catch (error) {
      console.error('更新履歴の記録に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * 更新履歴を取得する
   * @param limitCount 取得する最大件数
   * @param gameId 特定のゲームに関する更新のみを取得する場合に指定
   */
  export async function getUpdateHistory(
    limitCount: number = 10,
    gameId?: string
  ): Promise<Array<{ title: string, description: string, userId: string, gameId: string | null, date: Date }>> {
    try {
      let historyQuery;
      
      if (gameId) {
        // 特定のゲームの更新履歴を取得
        historyQuery = query(
          collection(db, UPDATE_HISTORY_COLLECTION),
          where('gameId', '==', gameId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } else {
        // すべての更新履歴を取得
        historyQuery = query(
          collection(db, UPDATE_HISTORY_COLLECTION),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }
      
      const snapshot = await getDocs(historyQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, // ドキュメントIDも返す
          title: data.title,
          description: data.description,
          userId: data.userId,
          gameId: data.gameId,
          date: (data.createdAt as Timestamp)?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('更新履歴の取得に失敗しました:', error);
      // エラーが発生した場合は空の配列を返す
      return [];
    }
  }
  
  /**
   * すべての更新履歴を取得する - 限度なし
   */
  export async function getAllUpdateHistory(
    gameId?: string
  ): Promise<Array<{ title: string, description: string, userId: string, gameId: string | null, date: Date }>> {
    try {
      let historyQuery;
      
      if (gameId) {
        // 特定のゲームの更新履歴を取得
        historyQuery = query(
          collection(db, UPDATE_HISTORY_COLLECTION),
          where('gameId', '==', gameId),
          orderBy('createdAt', 'desc')
        );
      } else {
        // すべての更新履歴を取得
        historyQuery = query(
          collection(db, UPDATE_HISTORY_COLLECTION),
          orderBy('createdAt', 'desc')
        );
      }
      
      const snapshot = await getDocs(historyQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          userId: data.userId,
          gameId: data.gameId,
          date: (data.createdAt as Timestamp)?.toDate() || new Date()
        };
      });
    } catch (error) {
      console.error('更新履歴の取得に失敗しました:', error);
      // エラーが発生した場合は空の配列を返す
      return [];
    }
  }