import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface AdContextType {
  showAds: boolean;
  setShowAds: (show: boolean) => void;
}

const AdContext = createContext<AdContextType | undefined>(undefined);

export const AdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showAds, setShowAds] = useState(true);
  const { currentUser, isAdmin, isPremium } = useAuth();

  useEffect(() => {
    const shouldShowAds = !currentUser || (!isAdmin && !isPremium);
    setShowAds(shouldShowAds);
  }, [currentUser, isAdmin, isPremium]);

  return (
    <AdContext.Provider value={{ showAds, setShowAds }}>
      {children}
    </AdContext.Provider>
  );
};

export const useAds = () => {
  const context = useContext(AdContext);
  if (context === undefined) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
};

export default AdContext;