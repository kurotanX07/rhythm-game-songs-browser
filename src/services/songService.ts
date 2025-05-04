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
  
  // コレクション名の定義
  const GAMES_COLLECTION = 'games';
  const SONGS_COLLECTION = 'songs';
  const EXCEL_STRUCTURES_COLLECTION = 'excelStructures';
  const UPDATE_STATUS_COLLECTION = 'updateStatus';
  
  // 1日のミリ秒数
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  
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
        lastUpdated: data.lastUpdated?.toDate() || new Date()
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
      lastUpdated: data.lastUpdated?.toDate() || new Date()
    };
  }
  
  /**
   * ゲーム情報を保存する
   */
  export async function saveGame(game: Game): Promise<void> {
    await setDoc(doc(db, GAMES_COLLECTION, game.id), {
      title: game.title,
      description: game.description,
      imageUrl: game.imageUrl,
      songCount: game.songCount,
      lastUpdated: serverTimestamp()
    });
  }
  
  /**
   * 楽曲一覧を取得する
   */
  export async function getSongs(gameId: string): Promise<Song[]> {
    const songsQuery = query(
      collection(db, SONGS_COLLECTION),
      where('gameId', '==', gameId),
      orderBy('songNo', 'asc')
    );
    
    const songsSnapshot = await getDocs(songsQuery);
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
   * 楽曲一覧を保存する
   */
  export async function saveSongs(songs: Song[]): Promise<void> {
    const batch = writeBatch(db);
    
    songs.forEach(song => {
      const songRef = doc(db, SONGS_COLLECTION, song.id);
      batch.set(songRef, {
        gameId: song.gameId,
        songNo: song.songNo,
        implementationNo: song.implementationNo,
        name: song.name,
        difficulties: song.difficulties,
        info: song.info
      });
    });
    
    await batch.commit();
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