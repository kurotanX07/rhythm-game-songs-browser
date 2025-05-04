import { useState } from 'react';
import { Song } from '../types/Song';
import { ExcelStructure } from '../types/ExcelStructure';
import { parseExcelFile, analyzeExcelStructure, updateColumnMapping } from '../services/excelParser';
import { saveExcelStructure, getExcelStructure, saveSongs, deleteSongsByGameId, getGame } from '../services/songService';
import { uploadExcelFile } from '../services/storageService';
import { Game } from '../types/Game';

export function useExcelParser() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [structure, setStructure] = useState<ExcelStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
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
   */
  const updateMapping = (
    field: string, 
    subField: string | null, 
    columnIndex: number
  ): void => {
    if (!structure) {
      return;
    }
    
    const updatedStructure = updateColumnMapping(structure, field, subField, columnIndex);
    setStructure(updatedStructure);
  };
  
  /**
   * 構造情報を保存する
   */
  const saveStructure = async (): Promise<void> => {
    if (!structure) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await saveExcelStructure(structure);
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
      setSongs(parsedSongs);
      
      return parsedSongs;
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
  const uploadSongs = async (gameId: string, songs: Song[], file: File): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      // 既存の楽曲を削除
      await deleteSongsByGameId(gameId);
      
      // 新しい楽曲データを保存
      await saveSongs(songs);
      
      // Excelファイルをストレージにアップロード
      await uploadExcelFile(gameId, file);
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
    analyzeExcel,
    updateMapping,
    saveStructure,
    parseExcel,
    uploadSongs
  };
}