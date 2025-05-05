// src/hooks/useExcelParser.ts - Modified for improved progress tracking
import { useState } from 'react';
import { Song } from '../types/Song';
import { ExcelStructure } from '../types/ExcelStructure';
import { parseExcelFile, analyzeExcelStructure, updateColumnMapping, analyzeExcelFirstRow as analyzeFirstRow } from '../services/excelParser';
import { 
  saveExcelStructure, 
  getExcelStructure, 
  saveSongs, 
  deleteSongsByGameId, 
  getGame, 
  formatDurationString,
  updateGameSongCount
} from '../services/songService';
import { uploadExcelFile } from '../services/storageService';
import { Game } from '../types/Game';

// New types for tracking progress
export interface UploadProgress {
  phase: 'analyzing' | 'parsing' | 'deleting' | 'uploading' | 'saving-structure' | 'complete' | 'idle';
  fileProgress: number; // 0-100 for file upload
  songsProgress: {
    current: number;
    total: number;
    percentage: number;
  };
  message: string;
}

export function useExcelParser() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [structure, setStructure] = useState<ExcelStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Enhanced progress tracking
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    phase: 'idle',
    fileProgress: 0,
    songsProgress: {
      current: 0,
      total: 0,
      percentage: 0
    },
    message: ''
  });
  
  // Helper to update progress
  const updateProgress = (update: Partial<UploadProgress>) => {
    setUploadProgress(current => ({
      ...current,
      ...update,
      songsProgress: {
        ...current.songsProgress,
        ...(update.songsProgress || {})
      }
    }));
  };
  
  /**
   * Excelファイルの最初の行だけを解析して構造を決定する
   */
  const analyzeExcelFirstRow = async (file: File, gameId: string, game: Game): Promise<ExcelStructure> => {
    try {
      setLoading(true);
      setError(null);
      updateProgress({
        phase: 'analyzing',
        message: 'Excelファイルの構造を解析中...'
      });
      
      // 最初の行のみ解析して構造を決定
      const excelStructure = await analyzeFirstRow(file, gameId, game);
      
      setStructure(excelStructure);
      updateProgress({
        phase: 'idle',
        message: '構造解析完了'
      });
      return excelStructure;
    } catch (err: any) {
      console.error('Excel最初の行解析エラー:', err);
      setError(err.message || 'Excelファイルの構造解析に失敗しました');
      updateProgress({
        phase: 'idle',
        message: 'エラー: ' + (err.message || 'Excelファイルの構造解析に失敗しました')
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Excelファイルの構造を解析する
   */
  const analyzeExcel = async (file: File, gameId: string): Promise<ExcelStructure> => {
    try {
      setLoading(true);
      setError(null);
      updateProgress({
        phase: 'analyzing',
        message: 'Excelファイルの構造を解析中...'
      });
      
      // ゲーム情報を取得
      const gameData = await getGame(gameId);
      if (!gameData) {
        throw new Error(`ゲームID "${gameId}" の情報が見つかりません`);
      }
      
      // 既存の構造情報を取得
      let excelStructure = await getExcelStructure(gameId);
      
      // 構造情報がない場合は自動解析
      if (!excelStructure) {
        excelStructure = await analyzeExcelStructure(file, gameId, gameData);
      }
      
      setStructure(excelStructure);
      updateProgress({
        phase: 'idle',
        message: '構造解析完了'
      });
      return excelStructure;
    } catch (err: any) {
      console.error('Excel構造解析エラー:', err);
      setError(err.message || 'Excelファイルの構造解析に失敗しました');
      updateProgress({
        phase: 'idle',
        message: 'エラー: ' + (err.message || 'Excelファイルの構造解析に失敗しました')
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 列マッピングを更新する
   * 更新された構造を返す
   */
  const updateMapping = (
    structureData: ExcelStructure, 
    field: string, 
    subField: string | null
  ): (columnIndex: number) => ExcelStructure => {
    return (columnIndex: number) => {
      if (!structureData) {
        return structureData;
      }
      
      const updatedStructure = updateColumnMapping(structureData, field, subField, columnIndex);
      setStructure(updatedStructure);
      return updatedStructure;
    };
  };
  
  /**
   * 構造情報を保存する
   */
  const saveStructure = async (structureToSave?: ExcelStructure): Promise<void> => {
    const structureData = structureToSave || structure;
    
    if (!structureData) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      updateProgress({
        phase: 'saving-structure',
        message: 'Excel構造情報を保存中...'
      });
      
      await saveExcelStructure(structureData);
      updateProgress({
        phase: 'idle',
        message: '構造情報の保存が完了しました'
      });
    } catch (err: any) {
      console.error('Excel構造保存エラー:', err);
      setError(err.message || 'Excel構造情報の保存に失敗しました');
      updateProgress({
        phase: 'idle',
        message: 'エラー: ' + (err.message || 'Excel構造情報の保存に失敗しました')
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Excelファイルを解析して楽曲データを取得する
   */
  const parseExcel = async (file: File, gameId: string, forceReanalyze = false): Promise<Song[]> => {
    try {
      setLoading(true);
      setError(null);
      updateProgress({
        phase: 'parsing',
        message: 'Excelファイルのデータを解析中...',
        songsProgress: {
          current: 0,
          total: 100,
          percentage: 0
        }
      });
      
      // ゲーム情報を取得
      const gameData = await getGame(gameId);
      if (!gameData) {
        throw new Error(`ゲームID "${gameId}" の情報が見つかりません`);
      }
      
      // 構造情報を取得または解析
      let excelStructure = forceReanalyze ? null : structure;
      
      if (!excelStructure) {
        updateProgress({
          message: '構造情報を取得中...',
          songsProgress: {
            current: 10,
            total: 100,
            percentage: 10
          }
        });
        
        // Only get from Firestore if not forcing reanalysis
        excelStructure = forceReanalyze ? null : await getExcelStructure(gameId);
        
        if (!excelStructure) {
          updateProgress({
            message: '構造情報を解析中...',
            songsProgress: {
              current: 20,
              total: 100,
              percentage: 20
            }
          });
          
          excelStructure = await analyzeExcelStructure(file, gameId, gameData);
          await saveExcelStructure(excelStructure);
        }
        
        setStructure(excelStructure);
      }
      
      updateProgress({
        message: '楽曲データを解析中...',
        songsProgress: {
          current: 40,
          total: 100,
          percentage: 40
        }
      });
      
      // 楽曲データを解析
      const parsedSongs = await parseExcelFile(file, excelStructure, gameData);
      
      updateProgress({
        message: '楽曲データを処理中...',
        songsProgress: {
          current: 80,
          total: 100,
          percentage: 80
        }
      });
      
      // データの検証とフィルタリング - 空の行や無効なデータを除外
      const validatedSongs = parsedSongs.filter(song => {
        // 必須フィールドの検証
        if (!song.name || song.name.trim() === '') {
          console.warn('Empty song name detected, filtering out:', song);
          return false;
        }
        
        // Song No の検証
        if (typeof song.songNo !== 'number' || isNaN(song.songNo)) {
          console.warn('Invalid songNo detected, filtering out:', song);
          return false;
        }
        
        return true;
      });
      
      // Format the durations to 00:00 format
      const formattedSongs = validatedSongs.map(song => ({
        ...song,
        info: {
          ...song.info,
          // Format duration as 00:00 if it exists
          duration: song.info.duration 
            ? formatDurationString(song.info.duration) 
            : song.info.duration
        }
      }));
      
      setSongs(formattedSongs);
      
      updateProgress({
        phase: 'idle',
        message: `${formattedSongs.length}曲のデータを解析しました`,
        songsProgress: {
          current: 100,
          total: 100,
          percentage: 100
        }
      });
      
      return formattedSongs;
    } catch (err: any) {
      console.error('ファイル解析エラー:', err);
      setError(err.message || 'Excelファイルの解析に失敗しました');
      updateProgress({
        phase: 'idle',
        message: 'エラー: ' + (err.message || 'Excelファイルの解析に失敗しました')
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 楽曲データをアップロードする
   */
  const uploadSongs = async (gameId: string, songData: Song[], file?: File): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // Reset progress
      setUploadProgress({
        phase: 'uploading',
        fileProgress: 0,
        songsProgress: {
          current: 0,
          total: songData.length,
          percentage: 0
        },
        message: 'アップロードを準備中...'
      });
      
      // Skip file validation since we're making it optional
      
      // 空の行や無効なデータを除外（念のための二重チェック）
      const validSongs = songData.filter(song => {
        return song && song.name && song.name.trim() !== '' && 
               typeof song.songNo === 'number' && !isNaN(song.songNo);
      });
      
      const validCount = validSongs.length;
      
      if (validCount === 0) {
        throw new Error('有効な楽曲データがありません。ファイルを確認してください。');
      }
      
      // Update progress
      updateProgress({
        message: '既存の楽曲データを削除中...',
        songsProgress: {
          current: 0,
          total: validCount,
          percentage: 0
        }
      });
      
      // Step 2: Delete existing songs
      await deleteSongsByGameId(gameId);
      
      // Format song data
      const formattedSongs = validSongs.map(song => ({
        ...song,
        info: {
          ...song.info,
          duration: song.info.duration 
            ? formatDurationString(song.info.duration) 
            : song.info.duration,
        }
      }));
      
      // Update progress
      updateProgress({
        message: '楽曲データをアップロード中...',
        songsProgress: {
          current: 0,
          total: validCount,
          percentage: 0
        }
      });
      
      // Step 3: Save new song data - using chunked upload for better performance
      const CHUNK_SIZE = 100; // Upload 100 songs at a time
      const chunks = Math.ceil(formattedSongs.length / CHUNK_SIZE);
      
      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, formattedSongs.length);
        const chunk = formattedSongs.slice(start, end);
        
        // Upload this chunk
        await saveSongs(chunk);
        
        // Update progress
        const songsUploaded = end;
        updateProgress({
          message: `楽曲データをアップロード中... (${songsUploaded}/${validCount}曲)`,
          songsProgress: {
            current: songsUploaded,
            total: validCount,
            percentage: Math.round((songsUploaded / validCount) * 100)
          }
        });
      }
      
      // Step 4: Update the game's songCount field
      console.log(`Updating game's songCount to ${validCount}...`);
      await updateGameSongCount(gameId, validCount);
      
      // Step 5: SKIP Excel file upload - mark as complete immediately
      updateProgress({
        phase: 'complete',
        fileProgress: 100, // Mark as done
        message: `${validCount}曲のデータのアップロードが完了しました！`,
        songsProgress: {
          current: validCount,
          total: validCount,
          percentage: 100
        }
      });
      
    } catch (err: any) {
      console.error('楽曲アップロードエラー:', err);
      setError(err.message || '楽曲データのアップロードに失敗しました');
      updateProgress({
        phase: 'idle',
        message: 'エラー: ' + (err.message || '楽曲データのアップロードに失敗しました'),
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    songs,
    structure,
    loading,
    error,
    uploadProgress,
    analyzeExcel,
    analyzeExcelFirstRow,
    updateMapping,
    saveStructure,
    parseExcel,
    uploadSongs
  };
}