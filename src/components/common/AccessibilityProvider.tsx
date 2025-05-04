import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  setFontSize: (size: number) => void;
  setHighContrast: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  // システム設定から初期値を取得
  useEffect(() => {
    // 簡易的なメディアクエリでの設定取得
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setReducedMotion(true);
    }
    
    // 設定の読み込み
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setFontSize(settings.fontSize || 16);
      setHighContrast(settings.highContrast || false);
      setReducedMotion(settings.reducedMotion || prefersReducedMotion);
    }
  }, []);
  
  // 設定変更時に保存
  useEffect(() => {
    localStorage.setItem('accessibilitySettings', JSON.stringify({
      fontSize,
      highContrast,
      reducedMotion
    }));
    
    // CSSカスタムプロパティに適用
    document.documentElement.style.setProperty('--font-size-base', `${fontSize}px`);
    document.documentElement.classList.toggle('high-contrast', highContrast);
    document.documentElement.classList.toggle('reduced-motion', reducedMotion);
  }, [fontSize, highContrast, reducedMotion]);
  
  return (
    <AccessibilityContext.Provider value={{
      fontSize,
      highContrast,
      reducedMotion,
      setFontSize,
      setHighContrast,
      setReducedMotion
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};