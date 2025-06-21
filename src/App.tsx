// src/App.tsx
import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { SongDataProvider } from './contexts/SongDataContext';
import { AccessibilityProvider } from './components/common/AccessibilityProvider';
import ThemeProvider from './contexts/ThemeContext';
import { AdProvider } from './contexts/AdContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Loader from './components/common/Loader';
import RequireAuth from './components/common/RequireAuth';
import RequireAdmin from './components/common/RequireAdmin';
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, BannerAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Lazy loaded components
const Home = lazy(() => import('./pages/Home'));
const SongBrowser = lazy(() => import('./pages/SongBrowser'));
const SongDetails = lazy(() => import('./pages/SongDetails'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

const App: React.FC = () => {

  useEffect(() => {
    // Web版では広告を表示しない
    if (!Capacitor.isNativePlatform()) {
      console.log("Web版では広告を表示しません");
      return;
    }

    // ネイティブプラットフォーム（Android/iOS）の場合のみ広告を初期化
    const initializeAdMob = async () => {
      try {
        await AdMob.initialize();
        console.log("AdMob initialized");
        showBannerAd();
      } catch (error) {
        console.error("AdMob initialization failed:", error);
      }
    };

    const showBannerAd = async () => {
      const options: BannerAdOptions = {
        adId: 'ca-app-pub-5830241925260790/5342425585', // バナー広告ユニットID
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

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <CssBaseline />
          <AuthProvider>
            <SongDataProvider>
              <AdProvider>
                <AccessibilityProvider>
                  <Router>
                    <Suspense fallback={<Loader message="読み込み中..." />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/songs" element={<SongBrowser />} />
                        <Route path="/songs/:songId" element={<SongDetails />} />
                        <Route 
                          path="/admin" 
                          element={
                            <RequireAuth>
                              <RequireAdmin>
                                <Admin />
                              </RequireAdmin>
                            </RequireAuth>
                          } 
                        />
                        <Route path="/login" element={<Login />} />
                        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                        <Route path="/404" element={<NotFound />} />
                        <Route path="*" element={<Navigate to="/404" replace />} />
                      </Routes>
                    </Suspense>
                  </Router>
                </AccessibilityProvider>
              </AdProvider>
            </SongDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;