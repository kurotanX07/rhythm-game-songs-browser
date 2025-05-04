// src/services/storageService.ts
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { storage } from './firebase';
import { Game } from '../types/Game';
import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_DIFFICULTIES } from '../contexts/SongDataContext';

// Progress callback type for uploads
export type UploadProgressCallback = (progress: number) => void;

/**
 * Upload Excel file to Firebase Storage with progress tracking and chunking
 * @param gameId - Game ID for the upload
 * @param file - File to upload
 * @param progressCallback - Optional callback to report upload progress
 * @returns Promise with download URL or null if upload fails
 */
export async function uploadExcelFile(
  gameId: string, 
  file: File, 
  progressCallback?: UploadProgressCallback
): Promise<string | null> {
  try {
    // Create reference for the file path
    const storageRef = ref(storage, `excel/${gameId}/${file.name}`);
    
    return new Promise((resolve, reject) => {
      // Use resumable upload for better handling of large files
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      // Register three observers:
      // 1. 'state_changed' observer, called any time the state changes
      uploadTask.on('state_changed', 
        // Progress observer
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
          if (progressCallback) {
            progressCallback(progress);
          }
        }, 
        // Error observer
        (error) => {
          console.error('Storage upload error:', error);
          
          // Special handling for specific errors
          if (error.code === 'storage/retry-limit-exceeded') {
            console.warn('Upload retry limit exceeded, file may be too large or connection unstable');
            // Return null instead of rejecting, so other operations can continue
            resolve(null);
          } else {
            reject(error);
          }
        }, 
        // Success observer
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('File available at', downloadURL);
            resolve(downloadURL);
          } catch (urlError) {
            console.error('Error getting download URL:', urlError);
            resolve(null);
          }
        }
      );
    });
  } catch (error) {
    console.error('Excel file upload error:', error);
    return null; // Return null instead of throwing to allow other operations to continue
  }
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