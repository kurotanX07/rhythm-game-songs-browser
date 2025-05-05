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
 * Upload Excel file to Firebase Storage with improved error handling and progress reporting
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
    // Initialize progress at 0
    if (progressCallback) {
      progressCallback(0);
    }
    
    // Create a unique filename with timestamp to avoid cache issues
    const timestamp = new Date().getTime();
    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_${timestamp}${file.name.match(/\.[^/.]+$/)?.[0] || ''}`;
    
    // Create reference for the file path
    const storageRef = ref(storage, `excel/${gameId}/${fileName}`);

    // Log the starting of upload for debugging
    console.log(`Starting upload of file ${fileName} to path excel/${gameId}/${fileName}`);
    
    // For large files (>10MB), show a warning in console
    if (file.size > 10 * 1024 * 1024) {
      console.warn(`Large file detected (${(file.size / (1024 * 1024)).toFixed(2)} MB), upload may take longer than expected`);
    }
    
    return new Promise((resolve, reject) => {
      // Configure upload settings with improved retry behavior
      const metadata = {
        contentType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
        // Progress observer - explicitly log each progress event
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress.toFixed(1)}% (${snapshot.bytesTransferred}/${snapshot.totalBytes} bytes)`);
          
          if (progressCallback) {
            progressCallback(progress);
          }
          
          // Add state information logging
          console.log(`Current upload state: ${snapshot.state}`);
        }, 
        // Error observer with detailed error logging
        (error) => {
          console.error('Storage upload error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          // Specific error handling with more details
          if (error.code === 'storage/unauthorized') {
            const errorMessage = 'アクセス権限がありません。ログイン状態を確認してください。';
            console.error(errorMessage);
            reject(new Error(errorMessage));
          } else if (error.code === 'storage/canceled') {
            const errorMessage = 'アップロードがキャンセルされました。';
            console.error(errorMessage);
            reject(new Error(errorMessage));
          } else if (error.code === 'storage/retry-limit-exceeded') {
            const errorMessage = 'アップロードの再試行回数が上限に達しました。ネットワーク接続を確認してください。';
            console.error(errorMessage);
            reject(new Error(errorMessage));
          } else if (error.code === 'storage/invalid-argument') {
            const errorMessage = 'アップロードの引数が無効です。ファイルが破損している可能性があります。';
            console.error(errorMessage);
            reject(new Error(errorMessage));
          } else {
            reject(error);
          }
        }, 
        // Success observer
        async () => {
          try {
            console.log('Upload completed successfully, getting download URL...');
            
            // Final progress update before getting URL
            if (progressCallback) {
              progressCallback(100);
            }
            
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('File available at', downloadURL);
            resolve(downloadURL);
          } catch (urlError) {
            console.error('Error getting download URL:', urlError);
            reject(urlError);
          }
        }
      );
      
      // Add a timeout to detect stalled uploads (30 seconds with no progress)
      let lastBytesTransferred = 0;
      let stallCounter = 0;
      
      const stallCheck = setInterval(() => {
        if (uploadTask.snapshot.bytesTransferred === lastBytesTransferred) {
          stallCounter++;
          console.warn(`Upload appears stalled: No progress for ${stallCounter * 5} seconds`);
          
          // After 30 seconds with no progress, consider the upload stalled
          if (stallCounter >= 6) {
            console.error('Upload stalled for too long, attempting to cancel and restart');
            clearInterval(stallCheck);
            
            // Try to cancel the current upload
            try {
              uploadTask.cancel();
            } catch (cancelError) {
              console.warn('Error canceling stalled upload:', cancelError);
            }
            
            // Reject with a specific error message
            reject(new Error('アップロードが停止しました。ネットワーク接続を確認し、再度お試しください。'));
          }
        } else {
          // Reset counter if progress was made
          stallCounter = 0;
          lastBytesTransferred = uploadTask.snapshot.bytesTransferred;
        }
      }, 5000); // Check every 5 seconds
      
      // Clean up the interval when upload completes or fails
      uploadTask.then(() => {
        clearInterval(stallCheck);
      }).catch(() => {
        clearInterval(stallCheck);
      });
    });
  } catch (error) {
    console.error('Excel file upload preparation error:', error);
    if (progressCallback) {
      progressCallback(0); // Reset progress on error
    }
    throw error;
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