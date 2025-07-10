// src/hooks/useFavorites.ts - iOS対応シンプル版
import { useState, useEffect, useCallback } from 'react';

const FAVORITES_STORAGE_KEY = 'rhythm-game-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // 初期化時にローカルストレージから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setFavorites(parsed);
          console.log('[useFavorites] Loaded favorites from localStorage:', parsed.length);
        }
      }
    } catch (error) {
      console.error('[useFavorites] Failed to load favorites from localStorage:', error);
    }
  }, []);

  // お気に入りの保存
  const saveFavorites = useCallback((newFavorites: string[]) => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
      console.log('[useFavorites] Saved favorites to localStorage:', newFavorites.length);
    } catch (error) {
      console.error('[useFavorites] Failed to save favorites to localStorage:', error);
    }
  }, []);

  // お気に入りの切り替え
  const toggleFavorite = useCallback((songId: string) => {
    setFavorites(current => {
      const newFavorites = current.includes(songId)
        ? current.filter(id => id !== songId)
        : [...current, songId];
      
      // 非同期で保存
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(newFavorites));
        console.log('[useFavorites] Toggled favorite for song:', songId, 'isFavorite:', !current.includes(songId));
      } catch (error) {
        console.error('[useFavorites] Failed to save favorites to localStorage:', error);
      }
      
      return newFavorites;
    });
  }, []);

  // お気に入りの追加
  const addFavorite = useCallback((songId: string) => {
    if (!favorites.includes(songId)) {
      const newFavorites = [...favorites, songId];
      saveFavorites(newFavorites);
    }
  }, [favorites, saveFavorites]);

  // お気に入りの削除
  const removeFavorite = useCallback((songId: string) => {
    const newFavorites = favorites.filter(id => id !== songId);
    saveFavorites(newFavorites);
  }, [favorites, saveFavorites]);

  // 全お気に入りのクリア
  const clearFavorites = useCallback(() => {
    saveFavorites([]);
  }, [saveFavorites]);

  // お気に入りかどうかの判定
  const isFavorite = useCallback((songId: string) => favorites.includes(songId), [favorites]);

  return {
    favorites,
    toggleFavorite,
    addFavorite,
    removeFavorite,
    clearFavorites,
    isFavorite,
    loading: false,
    error: null
  };
}