import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Container, Typography, Box, Button, Paper } from '@mui/material';
import SentimentDissatisfiedIcon from '@mui/icons-material/SentimentDissatisfied';
import HomeIcon from '@mui/icons-material/Home';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import SEO from '../components/common/SEO';

const NotFound: React.FC = () => {
  return (
    <>
      <SEO title="ページが見つかりません" />
      <Header />
      <Container maxWidth="md" sx={{ my: 8 }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            borderRadius: 2,
            textAlign: 'center'
          }}
        >
          <SentimentDissatisfiedIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          
          <Typography variant="h3" component="h1" gutterBottom>
            404
          </Typography>
          
          <Typography variant="h5" gutterBottom>
            ページが見つかりません
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            お探しのページは存在しないか、移動した可能性があります。
          </Typography>
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
            <Button 
              variant="contained" 
              component={RouterLink} 
              to="/"
              startIcon={<HomeIcon />}
            >
              ホームに戻る
            </Button>
            
            <Button 
              variant="outlined" 
              component={RouterLink} 
              to="/songs"
              startIcon={<MusicNoteIcon />}
            >
              楽曲一覧を見る
            </Button>
          </Box>
        </Paper>
      </Container>
      <Footer />
    </>
  );
};

export default NotFound;