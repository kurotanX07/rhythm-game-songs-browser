import React, { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, TextField, Button,
  Link, Alert, CircularProgress, Divider
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import SEO from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';

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
  const [resetSent, setResetSent] = useState(false);
  
  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LocationState;
  const from = locationState?.from?.pathname || '/';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      navigate(from);
    } catch (err: any) {
      console.error('Login error:', err);
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください');
    } finally {
      setLoading(false);
    }
  };
  
  const handleResetPassword = async () => {
    if (!email) {
      setError('パスワードリセットするにはメールアドレスを入力してください');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError('パスワードリセットメールの送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <SEO title="ログイン" />
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
              ログイン
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mt: 2, width: '100%' }}>
                {error}
              </Alert>
            )}
            
            {resetSent && (
              <Alert severity="success" sx={{ mt: 2, width: '100%' }}>
                パスワードリセットメールを送信しました。メールをご確認ください。
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
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  パスワードをお忘れですか？
                </Link>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body2">
                  アカウントをお持ちでない場合、管理者にお問い合わせください。
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Container>
      <Footer />
    </>
  );
};

export default Login;