import { useState } from 'react';
import { UpdateStatus } from '../types/UpdateStatus';
import { getUpdateStatus, updateUpdateStatus } from '../services/songService';

export function useUpdateStatus() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * 更新ステータスを確認する
   */
  const checkUpdateStatus = async (userId: string): Promise<UpdateStatus> => {
    try {
      setLoading(true);
      setError(null);
      
      const currentStatus = await getUpdateStatus(userId);
      setStatus(currentStatus);
      
      return currentStatus;
    } catch (err: any) {
      console.error('更新ステータス取得エラー:', err);
      setError(err.message || '更新ステータスの取得に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 最終更新日時を更新する
   */
  const updateLastUpdate = async (userId: string): Promise<UpdateStatus> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedStatus = await updateUpdateStatus(userId);
      setStatus(updatedStatus);
      
      return updatedStatus;
    } catch (err: any) {
      console.error('更新ステータス更新エラー:', err);
      setError(err.message || '更新ステータスの更新に失敗しました');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * 次回更新可能時間のフォーマットされた文字列を取得
   */
  const getNextUpdateTimeString = (): string => {
    if (!status?.nextAvailableUpdate) {
      return '更新可能';
    }
    
    return status.nextAvailableUpdate.toLocaleString();
  };
  
  /**
   * 更新可能かどうかのメッセージを取得
   */
  const getUpdateStatusMessage = (): string => {
    if (!status) {
      return '';
    }
    
    if (status.isUpdateAvailable) {
      return '更新可能です';
    }
    
    return `次回更新可能時間: ${getNextUpdateTimeString()}`;
  };
  
  return {
    status,
    loading,
    error,
    checkUpdateStatus,
    updateLastUpdate,
    getNextUpdateTimeString,
    getUpdateStatusMessage
  };
}