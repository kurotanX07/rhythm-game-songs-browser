import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Excelファイルをアップロードする
 */
export async function uploadExcelFile(gameId: string, file: File): Promise<string> {
  const timestamp = new Date().getTime();
  const filename = `${gameId}_${timestamp}.xlsx`;
  const storageRef = ref(storage, `excel/${gameId}/${filename}`);
  
  await uploadBytes(storageRef, file);
  
  return getDownloadURL(storageRef);
}

/**
 * 画像ファイルをアップロードする
 */
export async function uploadGameImage(gameId: string, file: File): Promise<string> {
  const timestamp = new Date().getTime();
  const extension = file.name.split('.').pop() || 'png';
  const filename = `${gameId}_${timestamp}.${extension}`;
  const storageRef = ref(storage, `images/games/${filename}`);
  
  await uploadBytes(storageRef, file);
  
  return getDownloadURL(storageRef);
}

/**
 * ファイルを削除する
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // URLからストレージパスを取得
    const fileRef = ref(storage, getPathFromUrl(fileUrl));
    
    await deleteObject(fileRef);
  } catch (error) {
    console.error('ファイル削除エラー:', error);
    throw error;
  }
}

/**
 * URLからストレージパスを取得する
 */
function getPathFromUrl(url: string): string {
  // URLからファイルパスを抽出
  // 例: https://firebasestorage.googleapis.com/v0/b/PROJECT_ID.appspot.com/o/PATH?alt=media&token=TOKEN
  //     → PATH
  const matches = url.match(/\/o\/([^?]+)/);
  
  if (!matches || matches.length < 2) {
    throw new Error('無効なストレージURL形式');
  }
  
  // URLデコード
  return decodeURIComponent(matches[1]);
}