// src/contexts/AdContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface AdContextType {
  showAds: boolean;
  adUnit: string;
  refreshAds: () => void;
}

const AdContext = createContext<AdContextType | null>(null);

// Use this hook to access the ad context
export function useAds(): AdContextType {
  const context = useContext(AdContext);
  if (!context) {
    throw new Error('useAds must be used within an AdProvider');
  }
  return context;
}

interface AdProviderProps {
  children: React.ReactNode;
}

export function AdProvider({ children }: AdProviderProps): JSX.Element {
  const { currentUser, isPremium, isAdmin } = useAuth();
  const [showAds, setShowAds] = useState<boolean>(true);
  const [adUnit, setAdUnit] = useState<string>('default_ad_unit');
  
  // Determine whether to show ads based on user's membership status
  useEffect(() => {
    if (isAdmin || isPremium) {
      setShowAds(false);
    } else {
      setShowAds(true);
    }
  }, [currentUser, isPremium, isAdmin]);
  
  // In a real app, this would refresh ad units
  const refreshAds = () => {
    if (showAds) {
      console.log('Refreshing ads...');
      // In a real app with actual ad network integration:
      // window.adNetwork.refresh();
    }
  };
  
  // Effect to initialize ad SDK
  useEffect(() => {
    // This would be your ad network initialization code
    // For example, Google AdSense or other ad providers
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Ad SDK initialized in development mode');
    } else {
      // In production, load the actual ad SDK
      // Example for Google AdSense:
      // const script = document.createElement('script');
      // script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      // script.async = true;
      // script.setAttribute('data-ad-client', 'ca-pub-YOUR_CLIENT_ID');
      // document.head.appendChild(script);
    }
    
    // Cleanup function
    return () => {
      // Any cleanup needed for ad SDK
    };
  }, []);
  
  const value: AdContextType = {
    showAds,
    adUnit,
    refreshAds
  };
  
  return (
    <AdContext.Provider value={value}>
      {children}
    </AdContext.Provider>
  );
}