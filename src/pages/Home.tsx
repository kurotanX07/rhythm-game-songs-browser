import React, { useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Button, Grid,
  Card, CardContent, CardActions, CardMedia
} from '@mui/material';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
// import SEO from '../components/common/SEO';
import { useSongData } from '../contexts/SongDataContext';

const Home: React.FC = () => {
  const { games, loading, error } = useSongData();
  
  // 初期読み込み時のログ
  useEffect(() => {
    console.log('Home component mounted - iOS debug');
    console.log('User agent:', navigator.userAgent);
    console.log('Location:', window.location.href);
    console.log('Document ready state:', document.readyState);
    
    // Capacitorの存在確認
    if ((window as any).Capacitor) {
      console.log('Capacitor detected:', (window as any).Capacitor);
      console.log('Platform:', (window as any).Capacitor.getPlatform());
    } else {
      console.log('Capacitor not detected - running in web mode');
    }
  }, []);
  
  // デバッグ用ログ
  console.log('Home component rendered');
  console.log('Games:', games);
  console.log('Loading:', loading);
  console.log('Error:', error);
  
  // エラーハンドリング
  if (error) {
    return (
      <>
        {/* <SEO 
          title="エラー - ホーム" 
          description="リズムゲームの楽曲情報を検索・閲覧できるアプリケーションです。"
        /> */}
        <Header />
        <ResponsiveLayout>
          <Container maxWidth="lg">
            <Paper 
              elevation={1}
              sx={{ 
                p: 4, 
                my: 4, 
                borderRadius: 2,
                backgroundColor: 'rgba(255, 0, 0, 0.1)'
              }}
            >
              <Typography variant="h5" color="error" gutterBottom>
                データの読み込みに失敗しました
              </Typography>
              <Typography color="error">
                {error}
              </Typography>
              <Button 
                variant="contained" 
                onClick={() => window.location.reload()}
                sx={{ mt: 2 }}
              >
                再読み込み
              </Button>
            </Paper>
          </Container>
        </ResponsiveLayout>
        <Footer />
      </>
    );
  }
  
  return (
    <>
      {/* <SEO 
        title="ホーム" 
        description="リズムゲームの楽曲情報を検索・閲覧できるアプリケーションです。"
      /> */}
      <Header />
      <ResponsiveLayout>
        <Container maxWidth="lg">
          {/* Hero Section */}
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              my: 4, 
              borderRadius: 2,
              backgroundImage: 'linear-gradient(to right, #3f51b5, #5c6bc0)',
              color: 'white'
            }}
          >
            <Box sx={{ maxWidth: 'md', mx: 'auto', textAlign: 'center' }}>
              <Typography variant="h3" component="h1" gutterBottom>
                音ゲー広辞苑
              </Typography>
              <Typography variant="h6" paragraph>
                人気リズムゲームの楽曲情報を簡単に検索・閲覧できるアプリケーションです。
              </Typography>
              <Button 
                variant="contained" 
                color="secondary" 
                size="large"
                component={RouterLink}
                to="/songs"
                startIcon={<SearchIcon />}
                sx={{ mt: 2 }}
              >
                楽曲を探す
              </Button>
            </Box>
          </Paper>
          
          {/* Featured Games */}
          <Box sx={{ my: 6 }}>
            <Typography variant="h4" component="h2" gutterBottom align="center">
              対応ゲーム
            </Typography>
            
            {loading ? (
              <Typography align="center">読み込み中...</Typography>
            ) : error ? (
              <Box sx={{ textAlign: 'center', my: 4 }}>
                <Typography color="error" variant="h6" gutterBottom>
                  データの読み込みに問題が発生しました
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {error}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  アプリは基本機能を使用できますが、最新のデータは表示されない場合があります。
                </Typography>
                <Button 
                  variant="outlined" 
                  onClick={() => window.location.reload()}
                  sx={{ mt: 1 }}
                >
                  再読み込み
                </Button>
              </Box>
            ) : (
              <Grid container spacing={3} sx={{ mt: 2 }}>
                {games.map((game) => (
                  <Grid item xs={12} sm={6} md={4} key={game.id}>
                    <Card>
                      <CardMedia
                        component="div"
                        sx={{
                          height: 140,
                          backgroundColor: 'primary.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <MusicNoteIcon sx={{ fontSize: 60, color: 'white' }} />
                      </CardMedia>
                      <CardContent>
                        <Typography variant="h6" component="div">
                          {game.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          収録楽曲数: {game.songCount}曲
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {game.description || 'ゲームの説明はありません。'}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          component={RouterLink}
                          to={`/songs?game=${game.id}`}
                          startIcon={<MusicNoteIcon />}
                        >
                          楽曲一覧
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
          
          {/* About Section */}
          <Paper 
            elevation={1}
            sx={{ 
              p: 4, 
              my: 6, 
              borderRadius: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.02)'
            }}
          >
            <Box sx={{ maxWidth: 'md', mx: 'auto' }}>
              <Typography variant="h5" component="h2" gutterBottom>
                <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                このアプリについて
              </Typography>
              <Typography paragraph>
                音ゲー広辞苑は、様々な音楽ゲームの楽曲情報を簡単に検索・閲覧できるアプリケーションです。
                難易度、BPM、アーティスト情報など、各楽曲の詳細データを提供しています。
              </Typography>
              <Typography paragraph>
                また、各難易度のプレイ動画へのリンクも用意しているので、プレイ前の参考にすることもできます。
                お気に入りの曲を見つけて、リズムゲームをもっと楽しみましょう！
              </Typography>
            </Box>
          </Paper>
        </Container>
      </ResponsiveLayout>
      <Footer />
    </>
  );
};

export default Home;