// src/hooks/useExcelParser.ts
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

export function useExcelParser() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [structure, setStructure] = useState<ExcelStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  /**
   * Excelファイルの最初の行だけを解析して構造を決定する
   */
  const analyzeExcelFirstRow = async (file: File, gameId: string, game: Game): Promise<ExcelStructure> => {
    try {
      setLoading(true);
      setError(null);
      
      // 最初の行のみ解析して構造を決定
      const excelStructure = await analyzeFirstRow(file, gameId, game);
      
      setStructure(excelStructure);
      return excelStructure;
    } catch (err: any) {
      console.error('Excel最初の行解析エラー:', err);
      setError(err.message || 'Excelファイルの構造解析に失敗しました');
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
      return excelStructure;
    } catch (err: any) {
      console.error('Excel構造解析エラー:', err);
      setError(err.message || 'Excelファイルの構造解析に失敗しました');
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
      
      await saveExcelStructure(structureData);
    } catch (err: any) {
      console.error('Excel構造保存エラー:', err);
      setError(err.message || 'Excel構造情報の保存に失敗しました');
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
      
      // ゲーム情報を取得
      const gameData = await getGame(gameId);
      if (!gameData) {
        throw new Error(`ゲームID "${gameId}" の情報が見つかりません`);
      }
      
      // 構造情報を取得または解析
      let excelStructure = forceReanalyze ? null : structure;
      
      if (!excelStructure) {
        // Only get from Firestore if not forcing reanalysis
        excelStructure = forceReanalyze ? null : await getExcelStructure(gameId);
        
        if (!excelStructure) {
          excelStructure = await analyzeExcelStructure(file, gameId, gameData);
          await saveExcelStructure(excelStructure);
        }
        
        setStructure(excelStructure);
      }
      
      // 楽曲データを解析
      const parsedSongs = await parseExcelFile(file, excelStructure, gameData);
      
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
      
      return formattedSongs;
    } catch (err: any) {
      console.error('ファイル解析エラー:', err);
      setError(err.message || 'Excelファイルの解析に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 楽曲データをアップロードする
   */
  const uploadSongs = async (gameId: string, songData: Song[], file: File): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);
      
      // Step 1: Validate the file
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('Excelファイルが大きすぎます (50MB以上)。小さいファイルに分割するか、不要なデータを削除してください。');
      }
      
      // 空の行や無効なデータを除外（念のための二重チェック）
      const validSongs = songData.filter(song => {
        return song && song.name && song.name.trim() !== '' && 
               typeof song.songNo === 'number' && !isNaN(song.songNo);
      });
      
      const validCount = validSongs.length;
      
      // Step 2: Save the song data to Firestore
      console.log(`Saving ${validCount} songs to Firestore...`);
      
      // 既存の楽曲を削除
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
      
      // 新しい楽曲データを保存
      await saveSongs(formattedSongs);
      console.log(`${validCount} songs saved to Firestore successfully`);
      
      // Step 3: Update the game's songCount field with the exact count
      console.log(`Updating game's songCount to ${validCount}...`);
      await updateGameSongCount(gameId, validCount);
      
      // Step 4: Upload the Excel file to Storage
      console.log('Uploading Excel file to Storage...');
      const uploadProgressCallback = (progress: number) => {
        setUploadProgress(progress);
        console.log(`Upload progress: ${progress.toFixed(1)}%`);
      };
      
      const downloadUrl = await uploadExcelFile(gameId, file, uploadProgressCallback);
      
      if (!downloadUrl) {
        console.warn('Excel file upload to Storage failed, but song data was saved to Firestore');
        setError('楽曲データは保存されましたが、Excelファイルのアップロードに問題がありました。ネットワーク接続を確認して、再度お試しください。');
      } else {
        console.log('Excel file uploaded successfully');
        setUploadProgress(100);
      }
    } catch (err: any) {
      console.error('楽曲アップロードエラー:', err);
      setError(err.message || '楽曲データのアップロードに失敗しました');
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