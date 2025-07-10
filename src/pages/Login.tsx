import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, TextField, Button,
  Link, Alert, CircularProgress, Divider
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
// import SEO from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { signIn, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const from = locationState?.from?.pathname || '/';
  
  // 既にログインしている場合はリダイレクト
  useEffect(() => {
    if (currentUser) {
      console.log('[Login] User already logged in, redirecting to:', from);
      navigate(from);
    }
  }, [currentUser, from, navigate]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      console.log('[Login] Attempting to sign in with email:', email);
      await signIn(email, password);
      console.log('[Login] Sign in successful');
      // ナビゲーションはuseEffectで処理される
    } catch (err: any) {
      console.error('[Login] Login error:', err);
      console.error('[Login] Error code:', err.code);
      console.error('[Login] Error message:', err.message);
      
      // Firebase認証エラーコードに基づいたメッセージ
      let errorMessage = 'ログインに失敗しました。';
      if (err.code === 'auth/user-not-found') {
        errorMessage = 'このメールアドレスは登録されていません。';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'パスワードが正しくありません。';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'メールアドレスの形式が正しくありません。';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'このアカウントは無効化されています。';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'ログイン試行が多すぎます。しばらく待ってからお試しください。';
      } else {
        errorMessage = `ログインに失敗しました: ${err.message}`;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  return (
    <>
      {/* <SEO title="ログイン" /> */}
      <Header />
      <Container maxWidth="xs" sx={{ my: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <LockOutlinedIcon sx={{ color: 'white' }} />
            </Box>
            
            <Typography component="h1" variant="h5">
              管理者ログイン
            </Typography>
            
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
              管理者専用のログイン画面です
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                {error}
              </Alert>
            )}
            
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="メールアドレス"
                name="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="パスワード"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'ログイン'}
              </Button>
              
              <Divider sx={{ my: 3 }} />
              
              {/* 
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                  アカウントをお持ちでない場合、管理者にお問い合わせください。
                </Typography>
              </Box>
              */}
            </Box>
          </Box>
        </Paper>
      </Container>
      <Footer />
    </>
  );
};

export default Login;