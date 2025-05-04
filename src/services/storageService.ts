// src/services/songService.ts - getGames と getGame 関数を更新
import { DEFAULT_DIFFICULTIES } from '../contexts/SongDataContext';

// コレクション名の定義
const GAMES_COLLECTION = 'games';
const SONGS_COLLECTION = 'songs';
const EXCEL_STRUCTURES_COLLECTION = 'excelStructures';
const UPDATE_STATUS_COLLECTION = 'updateStatus';

/**
 * ゲーム一覧を取得する
 */
export async function getGames(): Promise<Game[]> {
  const gamesSnapshot = await getDocs(collection(db, GAMES_COLLECTION));
  return gamesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      songCount: data.songCount,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
      difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES] // デフォルト値を設定
    };
  });
}

/**
 * ゲーム情報を取得する
 */
export async function getGame(gameId: string): Promise<Game | null> {
  const gameDoc = await getDoc(doc(db, GAMES_COLLECTION, gameId));
  
  if (!gameDoc.exists()) {
    return null;
  }
  
  const data = gameDoc.data();
  return {
    id: gameDoc.id,
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl,
    songCount: data.songCount,
    lastUpdated: data.lastUpdated?.toDate() || new Date(),
    difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES] // デフォルト値を設定
  };
}