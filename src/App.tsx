// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { SongDataProvider } from './contexts/SongDataContext';
import { AccessibilityProvider } from './components/common/AccessibilityProvider';
import ThemeProvider from './contexts/ThemeContext';
import { AdProvider } from './contexts/AdContext';
import ErrorBoundary from './components/common/ErrorBoundary';
// import Loader from './components/common/Loader';
import RequireAuth from './components/common/RequireAuth';
import RequireAdmin from './components/common/RequireAdmin';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Direct imports for testing
import Home from './pages/Home';
import TestHome from './pages/TestHome';
import SongBrowser from './pages/SongBrowser';
import SongDetails from './pages/SongDetails';
import Login from './pages/Login';
import Admin from './pages/Admin';
// const NotFound = lazy(() => import('./pages/NotFound'));
import PrivacyPolicy from './pages/PrivacyPolicy';

// 広告表示ON/OFFを環境変数で制御
const ENABLE_ADS = process.env.REACT_APP_ENABLE_ADS === 'true' || true; // 本番環境では有効

// プラットフォームごとに広告ユニットIDを切り替え
const getAdUnitId = () => {
  if (Capacitor.getPlatform() === 'android') {
    return 'ca-app-pub-5830241925260790/5342425585'; // Android用
  } else if (Capacitor.getPlatform() === 'ios') {
    return 'ca-app-pub-5830241925260790/8379887547'; // iOS用
  }
  return '';
};

const App: React.FC = () => {

  useEffect(() => {
    // プラットフォーム情報をログ出力
    console.log('=== App Component Initialization ===');
    console.log('Capacitor platform:', Capacitor.getPlatform());
    console.log('Is native platform:', Capacitor.isNativePlatform());
    console.log('App component mounted');
    console.log('Environment - ENABLE_ADS:', ENABLE_ADS);
    console.log('Window location:', window.location.href);
    console.log('User agent:', navigator.userAgent);
    console.log('Document ready state:', document.readyState);
    console.log('=== End App Component Initialization ===');
    
    // iOS環境での初期化確認
    if (Capacitor.getPlatform() === 'ios') {
      // DOMContentLoadedまたはloadイベントを待つ
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('iOS: DOMContentLoaded event fired');
        });
      }
      
      // アプリ起動完了を明示的にログ
      window.addEventListener('load', () => {
        console.log('iOS: Window load event fired');
      });
    }

    // 広告表示ON/OFF
    if (!ENABLE_ADS) {
      console.log("広告表示は無効化されています");
      return;
    }
    // Web版では広告を表示しない
    if (!Capacitor.isNativePlatform()) {
      console.log("Web版では広告を表示しません");
      return;
    }

    // ネイティブプラットフォーム（Android/iOS）の場合のみ広告を初期化
    const initializeAdMob = async () => {
      try {
        // iOSでApp Tracking Transparencyを要求
        if (Capacitor.getPlatform() === 'ios') {
          await AdMob.requestTrackingAuthorization();
          console.log("Tracking authorization requested");
        }
        
        await AdMob.initialize();
        console.log("AdMob initialized");
        showBannerAd();
      } catch (error) {
        console.error("AdMob initialization failed:", error);
      }
    };

    const showBannerAd = async () => {
      const options: BannerAdOptions = {
        adId: getAdUnitId(), // プラットフォームごとに切り替え
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        // isTesting: true, // 開発中はtrue、本番はfalse
      };
      try {
        await AdMob.showBanner(options);
        console.log("Banner ad requested");

        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          console.log('Banner Ad loaded');
        });
        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (error: any) => {
          console.error('Banner Ad failed to load:', error);
        });
        AdMob.addListener(BannerAdPluginEvents.Closed, () => {
          console.log('Banner Ad closed.');
        });

      } catch (error) {
        console.error("Failed to show banner ad:", error);
      }
    };

    initializeAdMob();

    // コンポーネントのアンマウント時にリスナーをクリーンアップ
    return () => {
      if (Capacitor.isNativePlatform()) {
        AdMob.removeBanner();
        // イベントリスナーのクリーンアップは、AdMobがプラグインが自動的に処理します
      }
    };
  }, []);

  console.log('App: Rendering main app structure');
  
  console.log('App: About to return JSX');
  
  try {
    return (
      <ErrorBoundary>
        <HelmetProvider>
          <ThemeProvider>
            <AuthProvider>
              <SongDataProvider>
                <CssBaseline />
                <Router>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/songs" element={<SongBrowser />} />
                    <Route path="/songs/:songId" element={<SongDetails />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin" element={
                      <RequireAdmin>
                        <Admin />
                      </RequireAdmin>
                    } />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Router>
              </SongDataProvider>
            </AuthProvider>
          </ThemeProvider>
        </HelmetProvider>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('App: Error in return:', error);
    return <div style={{ backgroundColor: 'red', color: 'white', padding: '20px' }}>エラーが発生しました</div>;
  }
}

export default App;