// src/hooks/useFavorites.ts
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, setDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

// Maximum number of favorites to store directly in localStorage (to reduce Firebase usage)
const MAX_LOCAL_FAVORITES = 500;

export function useFavorites() {
  const { currentUser } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load favorites on initialization
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First try to read from localStorage (to reduce Firebase reads)
        const localFavorites = localStorage.getItem('songFavorites');
        
        if (localFavorites) {
          const parsedFavorites = JSON.parse(localFavorites);
          setFavorites(parsedFavorites);
          setLoading(false);
          return;
        }
        
        // If user is logged in, try to read from Firestore
        if (currentUser) {
          const userDocRef = doc(db, 'userPreferences', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists() && userDoc.data().favorites) {
            setFavorites(userDoc.data().favorites);
            
            // Store in localStorage for faster access next time
            localStorage.setItem('songFavorites', JSON.stringify(userDoc.data().favorites));
          } else {
            // First time user, initialize with empty array
            setFavorites([]);
            localStorage.setItem('songFavorites', JSON.stringify([]));
          }
        } else {
          // Not logged in, use empty array
          setFavorites([]);
          localStorage.setItem('songFavorites', JSON.stringify([]));
        }
      } catch (err) {
        console.error('Error loading favorites:', err);
        setError('お気に入りの読み込みに失敗しました');
        
        // Fallback to empty array
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadFavorites();
  }, [currentUser]);
  
  // Toggle a song in favorites
  const toggleFavorite = useCallback(async (songId: string) => {
    try {
      const newFavorites = [...favorites];
      const index = newFavorites.indexOf(songId);
      
      if (index === -1) {
        // Add to favorites
        newFavorites.push(songId);
      } else {
        // Remove from favorites
        newFavorites.splice(index, 1);
      }
      
      // Update state immediately for responsive UI
      setFavorites(newFavorites);
      
      // Store in localStorage first (for fast access and as fallback)
      localStorage.setItem('songFavorites', JSON.stringify(newFavorites));
      
      // If user is logged in and favorites exceed local storage limit, update Firestore
      // This reduces Firebase writes for users with few favorites
      if (currentUser && newFavorites.length > MAX_LOCAL_FAVORITES) {
        const userDocRef = doc(db, 'userPreferences', currentUser.uid);
        
        // Check if document exists first
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          // Update existing document
          if (index === -1) {
            // Add to favorites
            await updateDoc(userDocRef, {
              favorites: arrayUnion(songId)
            });
          } else {
            // Remove from favorites
            await updateDoc(userDocRef, {
              favorites: arrayRemove(songId)
            });
          }
        } else {
          // Create new document
          await setDoc(userDocRef, {
            favorites: newFavorites,
            lastUpdated: new Date()
          });
        }
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError('お気に入りの更新に失敗しました');
      
      // Revert state on error
      const localFavorites = localStorage.getItem('songFavorites');
      if (localFavorites) {
        setFavorites(JSON.parse(localFavorites));
      }
    }
  }, [favorites, currentUser]);
  
  // Check if a song is in favorites
  const isFavorite = useCallback((songId: string) => {
    return favorites.includes(songId);
  }, [favorites]);
  
  // Sync favorites with Firestore (can be called manually)
  const syncWithFirestore = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const userDocRef = doc(db, 'userPreferences', currentUser.uid);
      
      await setDoc(userDocRef, {
        favorites: favorites,
        lastUpdated: new Date()
      }, { merge: true });
      
      setError(null);
    } catch (err) {
      console.error('Error syncing favorites with Firestore:', err);
      setError('お気に入りの同期に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [favorites, currentUser]);
  
  return {
    favorites,
    loading,
    error,
    toggleFavorite,
    isFavorite,
    syncWithFirestore
  };
}