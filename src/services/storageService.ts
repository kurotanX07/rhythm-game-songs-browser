// src/services/storageService.ts
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { Game } from '../types/Game';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_DIFFICULTIES } from '../contexts/SongDataContext';

// Upload Excel file to Firebase Storage
export async function uploadExcelFile(gameId: string, file: File): Promise<string> {
  // Create reference for the file path
  const storageRef = ref(storage, `excel/${gameId}/${file.name}`);
  
  // Upload the file
  const snapshot = await uploadBytes(storageRef, file);
  
  // Get download URL (optional, depending on your needs)
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return downloadURL;
}

// Collection names
const GAMES_COLLECTION = 'games';

/**
 * Get games with proper difficulties property
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
      difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES] // Add default difficulties
    };
  });
}

/**
 * Get a single game with proper difficulties property
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
    difficulties: data.difficulties || [...DEFAULT_DIFFICULTIES] // Add default difficulties
  };
}