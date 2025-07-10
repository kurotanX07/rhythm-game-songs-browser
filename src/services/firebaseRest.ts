// Firebase REST API を使用したデータ取得
// iOS WebView でのFirestore SDK問題を回避

export interface FirebaseRestConfig {
  projectId: string;
  apiKey: string;
}

const config: FirebaseRestConfig = {
  projectId: 'rhythm-game-app',
  apiKey: 'AIzaSyDehw9IeFrsyl1Ot0LulKXFxFgDyFlDavs'
};

// キャッシュ管理
interface CacheItem {
  data: any;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheItem>();
const CACHE_DURATION = 60 * 60 * 1000; // 1時間

function getCacheKey(collectionName: string, gameId?: string): string {
  return gameId ? `${collectionName}_${gameId}` : collectionName;
}

function isCacheValid(item: CacheItem): boolean {
  return Date.now() < item.expiresAt;
}

function setCache(key: string, data: any): void {
  const timestamp = Date.now();
  cache.set(key, {
    data,
    timestamp,
    expiresAt: timestamp + CACHE_DURATION
  });
  
  // ローカルストレージにも保存（アプリ再起動時の復元用）
  try {
    localStorage.setItem(`fbcache_${key}`, JSON.stringify({
      data,
      timestamp,
      expiresAt: timestamp + CACHE_DURATION
    }));
  } catch (error) {
    console.warn('[firebaseRest] ローカルストレージ保存失敗:', error);
  }
}

function getCache(key: string): any | null {
  // メモリキャッシュを確認
  const memoryItem = cache.get(key);
  if (memoryItem && isCacheValid(memoryItem)) {
    console.log('[firebaseRest] メモリキャッシュから取得:', key);
    return memoryItem.data;
  }
  
  // ローカルストレージからの復元を試行
  try {
    const stored = localStorage.getItem(`fbcache_${key}`);
    if (stored) {
      const item: CacheItem = JSON.parse(stored);
      if (isCacheValid(item)) {
        console.log('[firebaseRest] ローカルストレージキャッシュから取得:', key);
        // メモリキャッシュにも復元
        cache.set(key, item);
        return item.data;
      } else {
        // 期限切れのキャッシュを削除
        localStorage.removeItem(`fbcache_${key}`);
      }
    }
  } catch (error) {
    console.warn('[firebaseRest] ローカルストレージ読み込み失敗:', error);
  }
  
  return null;
}

/**
 * キャッシュをクリア
 */
export function clearCache(): void {
  console.log('[firebaseRest] キャッシュをクリア');
  cache.clear();
  
  // ローカルストレージからもキャッシュを削除
  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('fbcache_')) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('[firebaseRest] ローカルストレージクリア失敗:', error);
  }
}

/**
 * Firebase REST API を使用してコレクションのドキュメント一覧を取得
 */
export async function getCollectionRest(collectionName: string): Promise<any[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${collectionName}?key=${config.apiKey}`;
  
  console.log('[firebaseRest] REST API call:', url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[firebaseRest] Raw response:', data);
    
    if (!data.documents) {
      console.log('[firebaseRest] No documents found');
      return [];
    }
    
    // Firestore REST形式からオブジェクト形式に変換
    const documents = data.documents.map((doc: any) => {
      const id = doc.name.split('/').pop(); // ドキュメントIDを抽出
      const fields = doc.fields || {};
      
      // Firestore REST形式のfieldsを通常のオブジェクトに変換
      const convertedData = convertFirestoreFields(fields);
      
      return {
        id,
        ...convertedData
      };
    });
    
    console.log('[firebaseRest] Converted documents:', documents.length);
    return documents;
    
  } catch (error) {
    console.error('[firebaseRest] REST API error:', error);
    throw error;
  }
}

/**
 * Firestore REST API形式のfieldsを通常のJavaScriptオブジェクトに変換
 */
function convertFirestoreFields(fields: any): any {
  const result: any = {};
  
  for (const [key, value] of Object.entries(fields)) {
    result[key] = convertFirestoreValue(value);
  }
  
  return result;
}

/**
 * Firestore REST API形式の値を通常のJavaScript値に変換
 */
function convertFirestoreValue(value: any): any {
  if (!value || typeof value !== 'object') {
    return value;
  }
  
  // 文字列値
  if (value.stringValue !== undefined) {
    return value.stringValue;
  }
  
  // 数値
  if (value.integerValue !== undefined) {
    return parseInt(value.integerValue, 10);
  }
  
  if (value.doubleValue !== undefined) {
    return parseFloat(value.doubleValue);
  }
  
  // 真偽値
  if (value.booleanValue !== undefined) {
    return value.booleanValue;
  }
  
  // タイムスタンプ
  if (value.timestampValue !== undefined) {
    return new Date(value.timestampValue);
  }
  
  // 配列
  if (value.arrayValue && value.arrayValue.values) {
    return value.arrayValue.values.map((item: any) => convertFirestoreValue(item));
  }
  
  // マップ（オブジェクト）
  if (value.mapValue && value.mapValue.fields) {
    return convertFirestoreFields(value.mapValue.fields);
  }
  
  // null値
  if (value.nullValue !== undefined) {
    return null;
  }
  
  console.warn('[firebaseRest] Unknown value type:', value);
  return value;
}

/**
 * ゲーム一覧を取得（REST API使用、キャッシュ対応）
 */
export async function getGamesRest(): Promise<any[]> {
  const cacheKey = getCacheKey('games');
  
  // キャッシュから取得を試行
  const cached = getCache(cacheKey);
  if (cached) {
    console.log('[firebaseRest] ゲーム一覧をキャッシュから取得');
    return cached;
  }
  
  console.log('[firebaseRest] ゲーム一覧をREST APIで取得開始');
  try {
    const games = await getCollectionRest('games');
    console.log('[firebaseRest] ゲーム一覧取得完了:', games.length, '件');
    
    // 取得成功時はキャッシュに保存
    setCache(cacheKey, games);
    return games;
  } catch (error) {
    console.error('[firebaseRest] ゲーム一覧取得失敗:', error);
    
    // エラー時は期限切れでもキャッシュがあれば使用
    const expiredCache = localStorage.getItem(`fbcache_${cacheKey}`);
    if (expiredCache) {
      try {
        const item = JSON.parse(expiredCache);
        console.log('[firebaseRest] 期限切れキャッシュを緊急使用:', cacheKey);
        return item.data;
      } catch (cacheError) {
        console.warn('[firebaseRest] 期限切れキャッシュの読み込み失敗:', cacheError);
      }
    }
    
    throw error;
  }
}

/**
 * 特定のゲームの楽曲一覧を取得（REST API使用、キャッシュ対応）
 */
export async function getSongsRest(gameId: string): Promise<any[]> {
  const cacheKey = getCacheKey('songs', gameId);
  
  // キャッシュから取得を試行
  const cached = getCache(cacheKey);
  if (cached) {
    console.log('[firebaseRest] 楽曲一覧をキャッシュから取得:', gameId);
    return cached;
  }
  
  console.log('[firebaseRest] 楽曲一覧をREST APIで取得開始:', gameId);
  
  try {
    let allSongs: any[] = [];
    let nextPageToken: string | null = null;
    let pageCount = 0;
    
    do {
    pageCount++;
    console.log('[firebaseRest] ページ', pageCount, 'を取得中...');
    
    // ページネーションを考慮したURL構築
    let url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/songs?pageSize=1000&key=${config.apiKey}`;
    if (nextPageToken) {
      url += `&pageToken=${nextPageToken}`;
    }
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error('[firebaseRest] HTTP Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('[firebaseRest] Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('[firebaseRest] Page', pageCount, 'response:', {
        documentsExists: !!data.documents,
        documentsCount: data.documents?.length || 0,
        hasNextPageToken: !!data.nextPageToken
      });
      
      if (data.documents) {
        // gameIdでフィルタリング
        const filteredDocs = data.documents.filter((doc: any) => {
          const gameIdField = doc.fields?.gameId?.stringValue;
          return gameIdField === gameId;
        });
        
        console.log('[firebaseRest] Page', pageCount, 'filtered documents:', filteredDocs.length);
        
        const pageSongs = filteredDocs.map((doc: any) => {
          const id = doc.name.split('/').pop();
          const fields = doc.fields || {};
          const convertedData = convertFirestoreFields(fields);
          
          return {
            id,
            ...convertedData
          };
        });
        
        allSongs.push(...pageSongs);
      }
      
      // 次のページトークンを取得
      nextPageToken = data.nextPageToken || null;
      
    } catch (error) {
      console.error('[firebaseRest] ページ', pageCount, '取得エラー:', error);
      throw error;
    }
    
    // 無限ループ防止（最大10ページまで）
    if (pageCount >= 10) {
      console.warn('[firebaseRest] 最大ページ数に到達しました');
      break;
    }
    
  } while (nextPageToken);
  
  console.log('[firebaseRest] 楽曲一覧取得完了:', allSongs.length, '件 (', pageCount, 'ページ)');
  if (allSongs.length > 0) {
    console.log('[firebaseRest] Sample song:', allSongs[0]);
  }
  
    // 取得成功時はキャッシュに保存
    setCache(cacheKey, allSongs);
    return allSongs;
    
  } catch (error) {
    console.error('[firebaseRest] 楽曲一覧取得失敗:', gameId, error);
    
    // エラー時は期限切れでもキャッシュがあれば使用
    const expiredCache = localStorage.getItem(`fbcache_${cacheKey}`);
    if (expiredCache) {
      try {
        const item = JSON.parse(expiredCache);
        console.log('[firebaseRest] 期限切れキャッシュを緊急使用:', cacheKey);
        return item.data;
      } catch (cacheError) {
        console.warn('[firebaseRest] 期限切れキャッシュの読み込み失敗:', cacheError);
      }
    }
    
    throw error;
  }
}