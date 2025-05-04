import { useState } from 'react';
import { Song } from '../types/Song';
import { ExcelStructure } from '../types/ExcelStructure';
import { parseExcelFile, analyzeExcelStructure, updateColumnMapping, analyzeExcelFirstRow } from '../services/excelParser';
import { saveExcelStructure, getExcelStructure, saveSongs, deleteSongsByGameId, getGame } from '../services/songService';
import { uploadExcelFile } from '../services/storageService';
import { Game } from '../types/Game';

export function useExcelParser() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [structure, setStructure] = useState<ExcelStructure | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Excelファイルの最初の行だけを解析して構造を決定する
   */
  const analyzeExcelFirstRow = async (file: File, gameId: string, game: Game): Promise<ExcelStructure> => {
    try {
      setLoading(true);
      setError(null);
      
      // 最初の行のみ解析して構造を決定
      const excelStructure = await analyzeExcelStructure(file, gameId, game, true);
      
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
    analyzeExcelFirstRow,
    updateMapping,
    saveStructure,
    parseExcel,
    uploadSongs
  };
}