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
 * Upload Excel file to Firebase Storage with improved chunking and retry logic
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
    // Create a unique filename with timestamp to avoid cache issues
    const timestamp = new Date().getTime();
    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${timestamp}${file.name.match(/\.[^/.]+$/)?.[0] || ''}`;
    
    // Create reference for the file path
    const storageRef = ref(storage, `excel/${gameId}/${fileName}`);

    // For large files (>10MB), show a warning in console
    if (file.size > 10 * 1024 * 1024) {
      console.warn('Large file detected, upload may take longer than expected');
    }
    
    return new Promise((resolve, reject) => {
      // Configure upload settings with improved retry behavior
      const metadata = {
        contentType: file.type,
        customMetadata: {
          gameId: gameId,
          originalName: file.name,
          uploadTimestamp: timestamp.toString()
        }
      };
      
      // Use resumable upload for better handling of large files
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      // Register three observers:
      uploadTask.on('state_changed', 
        // Progress observer
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress.toFixed(1) + '% done');
          if (progressCallback) {
            progressCallback(progress);
          }
        }, 
        // Error observer with improved error handling
        (error) => {
          console.error('Storage upload error:', error);
          
          if (error.code === 'storage/retry-limit-exceeded') {
            console.warn('Upload retry limit exceeded, file may be too large or connection unstable');
            // Return null instead of rejecting to allow operation to continue
            resolve(null);
          } else if (error.code === 'storage/canceled') {
            console.warn('Upload was canceled');
            resolve(null);
          } else if (error.code === 'storage/unauthorized') {
            console.error('User does not have permission to upload to this location');
            reject(new Error('Permission denied for file upload'));
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
    return null;
  }
}

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

// Collection names
const GAMES_COLLECTION = 'games';