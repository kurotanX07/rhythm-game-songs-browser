// src/services/songService.ts
import { 
  collection, doc, getDocs, getDoc, setDoc, query, 
  where, orderBy, writeBatch, serverTimestamp,
  DocumentData, QuerySnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { Song } from '../types/Song';
import { Game } from '../types/Game';
import { ExcelStructure } from '../types/ExcelStructure';
import { UpdateStatus } from '../types/UpdateStatus';
import { DEFAULT_DIFFICULTIES } from '../contexts/SongDataContext';
import { recordUpdate } from './updateService';

// コレクション名の定義
const GAMES_COLLECTION = 'games';
const SONGS_COLLECTION = 'songs';
const EXCEL_STRUCTURES_COLLECTION = 'excelStructures';
const UPDATE_STATUS_COLLECTION = 'updateStatus';

// 1日のミリ秒数
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// インメモリキャッシュの設定
let gamesCache: Game[] | null = null;
let songsCache: { [gameId: string]: Song[] } = {};
let gamesCacheTimestamp: number | null = null;
let songsCacheTimestamp: { [gameId: string]: number } = {};
const CACHE_TTL_MS = 3 * 60 * 1000; // 3分

/**
 * インメモリキャッシュをクリアする
 * @param gameId 特定のゲームの楽曲キャッシュのみをクリアする場合に指定
 */
export function clearServiceCache(gameId?: string) {
  if (gameId) {
    delete songsCache[gameId];
    delete songsCacheTimestamp[gameId];
    console.log(`[songService] インメモリ楽曲キャッシュ (gameId: ${gameId}) をクリアしました。`);
  } else {
    gamesCache = null;
    gamesCacheTimestamp = null;
    songsCache = {};
    songsCacheTimestamp = {};
    console.log('[songService]全てのインメモリキャッシュをクリアしました。');
  }
}

/**
 * ゲーム一覧を取得する
 */
export async function getGames(): Promise<Game[]> {
  const now = Date.now();
  if (gamesCache && gamesCacheTimestamp && (now - gamesCacheTimestamp < CACHE_TTL_MS)) {
    console.log('[songService] ゲーム一覧をインメモリキャッシュから取得します。');
    return gamesCache;
  }

  console.log('[songService] ゲーム一覧をFirestoreから取得します。');
  const gamesSnapshot = await getDocs(collection(db, GAMES_COLLECTION));
  const games = processGamesSnapshot(gamesSnapshot);
  
  gamesCache = games;
  gamesCacheTimestamp = now;
  console.log('[songService] ゲーム一覧をインメモリキャッシュに保存しました。');
  return games;
}

function processGamesSnapshot(gamesSnapshot: QuerySnapshot<DocumentData>): Game[] {
  return gamesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      songCount: data.songCount,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
      minLevel: data.minLevel !== undefined ? data.minLevel : 1,
      maxLevel: data.maxLevel !== undefined ? data.maxLevel : 37,
      difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES],
      excelMapping: data.excelMapping || undefined
    };
  });
}

/**
 * ゲーム情報を取得する (この関数はキャッシュ対象外とするか、別途検討)
 */
export async function getGame(gameId: string): Promise<Game | null> {
  console.log(`[songService] ゲーム情報 (${gameId}) をFirestoreから取得します。`);
  const gameDoc = await getDoc(doc(db, GAMES_COLLECTION, gameId));
  if (!gameDoc.exists()) {
    return null;
  }
  return processGameDoc(gameDoc.data() as DocumentData, gameDoc.id);
}

function processGameDoc(data: DocumentData, id: string): Game {
  return {
    id: id,
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl,
    songCount: data.songCount,
    lastUpdated: data.lastUpdated?.toDate() || new Date(),
    difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES],
    minLevel: data.minLevel !== undefined ? data.minLevel : 1,
    maxLevel: data.maxLevel !== undefined ? data.maxLevel : 37,
    excelMapping: data.excelMapping || undefined
  };
}

/**
 * 楽曲一覧を取得する
 */
export async function getSongs(gameId: string): Promise<Song[]> {
  const now = Date.now();
  if (songsCache[gameId] && songsCacheTimestamp[gameId] && (now - songsCacheTimestamp[gameId] < CACHE_TTL_MS)) {
    console.log(`[songService] 楽曲一覧 (${gameId}) をインメモリキャッシュから取得します。`);
    return songsCache[gameId];
  }

  if (!gameId) {
    console.error('[songService] getSongs: gameIdが指定されていません');
    return [];
  }
  
  console.log(`[songService] 楽曲一覧 (${gameId}) をFirestoreから取得します。`);
  try {
    const songsQuery = query(
      collection(db, SONGS_COLLECTION),
      where('gameId', '==', gameId),
      orderBy('songNo', 'asc')
    );
    const songsSnapshot = await getDocs(songsQuery);
    const songs = processSongsSnapshot(songsSnapshot);
    
    songsCache[gameId] = songs;
    songsCacheTimestamp[gameId] = now;
    console.log(`[songService] 楽曲一覧 (${gameId}) をインメモリキャッシュに保存しました。`);
    return songs;
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.warn('[songService] Firestoreインデックス未準備のためフォールバック (順序なしクエリ)。ゲームID:', gameId);
      const fallbackQuery = query(collection(db, SONGS_COLLECTION), where('gameId', '==', gameId));
      const fallbackSnapshot = await getDocs(fallbackQuery);
      const songs = processSongsSnapshot(fallbackSnapshot).sort((a, b) => a.songNo - b.songNo);
      
      songsCache[gameId] = songs; // フォールバック結果もキャッシュ
      songsCacheTimestamp[gameId] = now;
      console.log(`[songService] 楽曲一覧 (${gameId}) をフォールバック取得しインメモリキャッシュに保存しました。`);
      return songs;
    }
    console.error(`[songService] 楽曲一覧 (${gameId}) の取得に失敗:`, error);
    throw error;
  }
}

function processSongsSnapshot(songsSnapshot: QuerySnapshot<DocumentData>): Song[] {
  return songsSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      gameId: data.gameId,
      songNo: data.songNo,
      implementationNo: data.implementationNo,
      name: data.name,
      difficulties: data.difficulties,
      info: {
        ...data.info,
        addedDate: data.info.addedDate?.toDate()
      }
    };
  });
}

/**
 * 楽曲情報を取得する
 */
export async function getSong(songId: string): Promise<Song | null> {
  const songDoc = await getDoc(doc(db, SONGS_COLLECTION, songId));
  
  if (!songDoc.exists()) {
    return null;
  }
  
  const data = songDoc.data();
  return {
    id: songDoc.id,
    gameId: data.gameId,
    songNo: data.songNo,
    implementationNo: data.implementationNo,
    name: data.name,
    difficulties: data.difficulties,
    info: {
      ...data.info,
      addedDate: data.info.addedDate?.toDate()
    }
  };
}

/**
 * Format duration string to 00:00 format
 */
export function formatDurationString(duration: string): string {
  if (/^\d{1,2}:\d{2}$/.test(duration)) {
    return duration;
  }
  let minutes = 0;
  let seconds = 0;
  const timeRegex = /(\d+):(\d+)/;
  const timeMatch = duration.match(timeRegex);
  if (timeMatch) {
    minutes = parseInt(timeMatch[1], 10);
    seconds = parseInt(timeMatch[2], 10);
  } else {
    const totalSeconds = parseInt(duration.replace(/[^\d]/g, ''), 10);
    if (!isNaN(totalSeconds)) {
      minutes = Math.floor(totalSeconds / 60);
      seconds = totalSeconds % 60;
    }
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format date string to YYYY/MM/DD format
 */
export function formatDateString(date: Date | null): string | null {
  if (!date || isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * 楽曲一覧を保存する - 履歴記録機能を削除
 */
export async function saveSongs(songs: Song[]): Promise<void> {
  const batch = writeBatch(db);
  let gameIdToClear: string | null = null;
  songs.forEach(song => {
    if (isNaN(song.songNo) || !song.name) {
      console.error('Invalid song data, skipping:', song);
      return; 
    }
    if (!gameIdToClear && song.gameId) gameIdToClear = song.gameId;
    const songId = `${song.gameId}_${Math.floor(song.songNo)}`;
    const songRef = doc(db, SONGS_COLLECTION, songId);
    if (song.info.duration) {
      song.info.duration = formatDurationString(song.info.duration);
    }
    const songData = {
      gameId: song.gameId,
      songNo: Math.floor(song.songNo),
      implementationNo: song.implementationNo !== undefined && song.implementationNo !== null
        ? Math.floor(song.implementationNo) 
        : null,
      name: song.name,
      difficulties: {} as Record<string, any>,
      info: {
        artist: song.info.artist || null,
        lyricist: song.info.lyricist || null,
        composer: song.info.composer || null,
        arranger: song.info.arranger || null,
        duration: song.info.duration || null,
        bpm: song.info.bpm !== undefined && song.info.bpm !== null ? Number(song.info.bpm) : null,
        addedDate: song.info.addedDate instanceof Date && !isNaN(song.info.addedDate.getTime()) 
          ? song.info.addedDate 
          : null,
        tags: Array.isArray(song.info.tags) ? song.info.tags : null
      }
    };
    Object.keys(song.difficulties).forEach(diffId => {
      const diff = song.difficulties[diffId];
      songData.difficulties[diffId] = {
        level: diff.level !== undefined && diff.level !== null ? Number(diff.level) : null,
        combo: diff.combo !== undefined && diff.combo !== null ? Number(diff.combo) : null,
        youtubeUrl: diff.youtubeUrl || null
      };
    });
    batch.set(songRef, songData);
  });
  await batch.commit();
  if (gameIdToClear) clearServiceCache(gameIdToClear);
}

/**
 * ゲームに関連する楽曲を削除する
 */
export async function deleteSongsByGameId(gameId: string): Promise<void> {
  const songsQuery = query(
    collection(db, SONGS_COLLECTION),
    where('gameId', '==', gameId)
  );
  const songsSnapshot = await getDocs(songsQuery);
  if (songsSnapshot.empty) return;
  const batch = writeBatch(db);
  songsSnapshot.docs.forEach(songDoc => {
    batch.delete(doc(db, SONGS_COLLECTION, songDoc.id));
  });
  await batch.commit();
  clearServiceCache(gameId);
}

/**
 * Excelの構造情報を保存する
 */
export async function saveExcelStructure(structure: ExcelStructure): Promise<void> {
  await setDoc(doc(db, EXCEL_STRUCTURES_COLLECTION, structure.gameId), structure);
  // Excel構造変更がゲームデータや楽曲データに影響する可能性があるため、関連キャッシュをクリア
  clearServiceCache(structure.gameId);
  clearServiceCache(); // ゲーム一覧も影響受ける可能性
}

/**
 * Excelの構造情報を取得する (キャッシュ対象外)
 */
export async function getExcelStructure(gameId: string): Promise<ExcelStructure | null> {
  const structureDoc = await getDoc(doc(db, EXCEL_STRUCTURES_COLLECTION, gameId));
  if (!structureDoc.exists()) return null;
  return structureDoc.data() as ExcelStructure;
}

/**
 * 更新ステータスを取得する (キャッシュ対象外)
 */
export async function getUpdateStatus(userId: string): Promise<UpdateStatus> {
  const statusDoc = await getDoc(doc(db, UPDATE_STATUS_COLLECTION, userId));
  if (!statusDoc.exists()) {
    return {
      lastUpdate: null,
      nextAvailableUpdate: null,
      isUpdateAvailable: true
    };
  }
  const data = statusDoc.data();
  const lastUpdate = data.lastUpdate?.toDate() || null;
  const now = new Date();
  let nextAvailableUpdate = null;
  let isUpdateAvailable = true;
  if (lastUpdate) {
    nextAvailableUpdate = new Date(lastUpdate.getTime() + ONE_DAY_MS);
    isUpdateAvailable = now.getTime() >= nextAvailableUpdate.getTime();
  }
  return {
    lastUpdate,
    nextAvailableUpdate,
    isUpdateAvailable
  };
}

/**
 * 更新ステータスを保存する (キャッシュ対象外)
 */
export async function updateUpdateStatus(userId: string): Promise<UpdateStatus> {
  const now = new Date();
  const nextAvailableUpdate = new Date(now.getTime() + ONE_DAY_MS);
  await setDoc(doc(db, UPDATE_STATUS_COLLECTION, userId), {
    lastUpdate: now,
    nextAvailableUpdate
  });
  return {
    lastUpdate: now,
    nextAvailableUpdate,
    isUpdateAvailable: false
  };
}

/**
 * アップロード用に楽曲データを正規化する（Firestore保存用）
 */
export function normalizeSongForUpload(song: Song): DocumentData {
  const normalized = { ...song };
  if (song.info.addedDate) {
    normalized.info = {
      ...song.info,
      addedDate: song.info.addedDate
    };
  }
  return normalized;
}

/**
 * ゲームの楽曲数を更新する
 */
export async function updateGameSongCount(gameId: string, songCount?: number): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  const gameDoc = await getDoc(gameRef);
  if (!gameDoc.exists()) {
    throw new Error(`Game with ID "${gameId}" not found`);
  }
  if (songCount === undefined) {
    const songsQuery = query(
      collection(db, SONGS_COLLECTION),
      where('gameId', '==', gameId)
    );
    const songsSnapshot = await getDocs(songsQuery);
    songCount = songsSnapshot.size;
  }
  console.log(`Updating game ${gameId} song count to ${songCount}`);
  await setDoc(gameRef, {
    ...gameDoc.data(),
    songCount: songCount,
    lastUpdated: serverTimestamp()
  });
  try {
    await recordUpdate(
      `ゲーム「${gameDoc.data().title}」の楽曲数を更新`,
      `ゲームID: ${gameId} の楽曲数を ${songCount} に更新しました`,
      'system', 
      gameId
    );
  } catch (error) {
    console.error('更新履歴の記録に失敗しました:', error);
  }
  clearServiceCache(); // ゲーム情報（楽曲数）更新時は関連キャッシュをクリア
}