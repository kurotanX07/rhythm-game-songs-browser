// src/App.tsx
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './contexts/AuthContext';
import { SongDataProvider } from './contexts/SongDataContext';
import { AccessibilityProvider } from './components/common/AccessibilityProvider';
import ThemeProvider from './contexts/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Loader from './components/common/Loader';
import RequireAuth from './components/common/RequireAuth';
import RequireAdmin from './components/common/RequireAdmin';

// Lazy loaded components
const Home = lazy(() => import('./pages/Home'));
const SongBrowser = lazy(() => import('./pages/SongBrowser'));
const SongDetails = lazy(() => import('./pages/SongDetails'));
const Admin = lazy(() => import('./pages/Admin'));
const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <CssBaseline />
          <AuthProvider>
            <SongDataProvider>
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
                      <Route path="/404" element={<NotFound />} />
                      <Route path="*" element={<Navigate to="/404" replace />} />
                    </Routes>
                  </Suspense>
                </Router>
              </AccessibilityProvider>
            </SongDataProvider>
          </AuthProvider>
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;