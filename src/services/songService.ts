// src/services/songService.ts
import { 
  collection, doc, getDocs, getDoc, setDoc, query, 
  where, orderBy, limit, deleteDoc, writeBatch, serverTimestamp,
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

/**
 * ゲーム一覧を取得する - レベル範囲を確実に含める
 */
export async function getGames(): Promise<Game[]> {
  const gamesSnapshot = await getDocs(collection(db, GAMES_COLLECTION));
  return gamesSnapshot.docs.map(doc => {
    const data = doc.data();
    
    // レベル範囲や難易度などの取得状況をログ出力
    console.log(`Game ${doc.id} data:`, {
      hasMinLevel: 'minLevel' in data,
      minLevel: data.minLevel,
      hasMaxLevel: 'maxLevel' in data,
      maxLevel: data.maxLevel,
      hasDifficulties: 'difficulties' in data && Array.isArray(data.difficulties),
      diffCount: data.difficulties?.length
    });
    
    return {
      id: doc.id,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      songCount: data.songCount,
      lastUpdated: data.lastUpdated?.toDate() || new Date(),
      // 明示的に minLevel と maxLevel を処理
      minLevel: data.minLevel !== undefined ? data.minLevel : 1,
      maxLevel: data.maxLevel !== undefined ? data.maxLevel : 37,
      difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES],
      excelMapping: data.excelMapping || undefined // Excel構造のマッピング情報を追加
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
    difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES],
    minLevel: data.minLevel !== undefined ? data.minLevel : 1,
    maxLevel: data.maxLevel !== undefined ? data.maxLevel : 37,
    excelMapping: data.excelMapping || undefined // Excel構造のマッピング情報を追加
  };
}

/**
 * ゲーム情報を保存する
 */
export async function saveGame(game: Game): Promise<void> {
  await setDoc(doc(db, GAMES_COLLECTION, game.id), {
    title: game.title,
    description: game.description || null,
    imageUrl: game.imageUrl || null,
    songCount: game.songCount,
    difficulties: game.difficulties,
    minLevel: game.minLevel || 1,
    maxLevel: game.maxLevel || 37,
    excelMapping: game.excelMapping || null, // Excel構造のマッピング情報を保存
    lastUpdated: serverTimestamp()
  });
}

/**
 * 楽曲一覧を取得する
 * NOTE: This query requires a composite index on:
 * - Collection: songs
 * - Fields indexed: gameId (Ascending), songNo (Ascending)
 * Create it at: https://console.firebase.google.com/project/rhythm-game-app/firestore/indexes
 */
export async function getSongs(gameId: string): Promise<Song[]> {
  try {
    // First attempt with the full query (requires index)
    const songsQuery = query(
      collection(db, SONGS_COLLECTION),
      where('gameId', '==', gameId),
      orderBy('songNo', 'asc')
    );
    
    const songsSnapshot = await getDocs(songsQuery);
    return processSongsSnapshot(songsSnapshot);
  } catch (error: any) {
    // If we get an index error, fall back to unordered query
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.warn('Firestore index not yet ready. Using unordered query as fallback.');
      console.warn('Please create the required index at Firebase console.');
      
      // Fallback query without ordering (doesn't require index)
      const fallbackQuery = query(
        collection(db, SONGS_COLLECTION),
        where('gameId', '==', gameId)
      );
      
      const fallbackSnapshot = await getDocs(fallbackQuery);
      // Sort results in memory instead
      const songs = processSongsSnapshot(fallbackSnapshot);
      return songs.sort((a, b) => a.songNo - b.songNo);
    }
    
    // For other errors, rethrow
    throw error;
  }
}

// Helper function to process song snapshot
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
  // If already in 00:00 format, return as is
  if (/^\d{1,2}:\d{2}$/.test(duration)) {
    return duration;
  }
  
  // Try to extract minutes and seconds from various formats
  let minutes = 0;
  let seconds = 0;
  
  // Try to parse as MM:SS or M:SS
  const timeRegex = /(\d+):(\d+)/;
  const timeMatch = duration.match(timeRegex);
  
  if (timeMatch) {
    minutes = parseInt(timeMatch[1], 10);
    seconds = parseInt(timeMatch[2], 10);
  } else {
    // Try to parse as seconds only
    const totalSeconds = parseInt(duration.replace(/[^\d]/g, ''), 10);
    if (!isNaN(totalSeconds)) {
      minutes = Math.floor(totalSeconds / 60);
      seconds = totalSeconds % 60;
    }
  }
  
  // Format as 00:00
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
  
  songs.forEach(song => {
    // ベースデータの検証と修正
    if (isNaN(song.songNo) || !song.name) {
      console.error('Invalid song data, skipping:', song);
      return; // Skip this song
    }
    
    // IDの作成
    const songId = `${song.gameId}_${Math.floor(song.songNo)}`;
    const songRef = doc(db, SONGS_COLLECTION, songId);
    
    // Format duration if present
    if (song.info.duration) {
      song.info.duration = formatDurationString(song.info.duration);
    }
    
    // Firebaseに保存するデータを正規化（undefinedをnullに変換）
    const songData = {
      gameId: song.gameId,
      songNo: Math.floor(song.songNo),
      implementationNo: song.implementationNo !== undefined && song.implementationNo !== null
        ? Math.floor(song.implementationNo) 
        : null,
      name: song.name,
      difficulties: {} as Record<string, any>, // 型を明示的に指定
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
    
    // 難易度データの正規化
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
  
  // 楽曲データアップロードの更新履歴記録部分を削除
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
  
  if (songsSnapshot.empty) {
    return;
  }
  
  const batch = writeBatch(db);
  
  songsSnapshot.docs.forEach(songDoc => {
    batch.delete(doc(db, SONGS_COLLECTION, songDoc.id));
  });
  
  await batch.commit();
}

/**
 * Excelの構造情報を保存する
 */
export async function saveExcelStructure(structure: ExcelStructure): Promise<void> {
  await setDoc(doc(db, EXCEL_STRUCTURES_COLLECTION, structure.gameId), structure);
}

/**
 * Excelの構造情報を取得する
 */
export async function getExcelStructure(gameId: string): Promise<ExcelStructure | null> {
  const structureDoc = await getDoc(doc(db, EXCEL_STRUCTURES_COLLECTION, gameId));
  
  if (!structureDoc.exists()) {
    return null;
  }
  
  return structureDoc.data() as ExcelStructure;
}

/**
 * 更新ステータスを取得する
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
  
  // 次回更新可能日時を計算（最終更新から1日後）
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
 * 更新ステータスを保存する
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
  
  // 必要に応じて日付を正規化（FirestoreのTimestampに変換可能な形式に）
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
  
  // Get the current game data
  const gameDoc = await getDoc(gameRef);
  if (!gameDoc.exists()) {
    throw new Error(`Game with ID "${gameId}" not found`);
  }
  
  // If songCount is not provided, count the actual songs in the database
  if (songCount === undefined) {
    const songsQuery = query(
      collection(db, SONGS_COLLECTION),
      where('gameId', '==', gameId)
    );
    
    const songsSnapshot = await getDocs(songsQuery);
    songCount = songsSnapshot.size;
  }
  
  console.log(`Updating game ${gameId} song count to ${songCount}`);
  
  // Update only the songCount field, preserving all other fields
  await setDoc(gameRef, {
    ...gameDoc.data(),
    songCount: songCount,
    lastUpdated: serverTimestamp()
  });
  
  // 楽曲数の更新は記録する
  try {
    await recordUpdate(
      `ゲーム「${gameDoc.data().title}」の楽曲数を更新`,
      `ゲームID: ${gameId} の楽曲数を ${songCount} に更新しました`,
      'system', // 自動更新のユーザーID
      gameId
    );
  } catch (error) {
    console.error('更新履歴の記録に失敗しました:', error);
    // 更新履歴の記録失敗はメインの処理に影響を与えないようにエラーはスローしない
  }
}