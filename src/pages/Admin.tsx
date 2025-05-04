// src/pages/Admin.tsx の最初の部分に追加
import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Tabs, Tab, Alert, Button } from '@mui/material';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import ResponsiveLayout from '../components/layout/ResponsiveLayout';
import SEO from '../components/common/SEO';
import AdminDashboard from '../components/admin/AdminDashboard';
import GameTitleManager from '../components/admin/GameTitleManager';
import ExcelUploader from '../components/admin/ExcelUploader';
import StructureAnalyzer from '../components/admin/StructureAnalyzer';
import { useAuth } from '../contexts/AuthContext';
import { useSongData } from '../contexts/SongDataContext';
import { auth } from '../services/firebase'; // Firebase authをインポート

// 管理者権限チェック用コンポーネント
const AdminCheck: React.FC = () => {
  const { currentUser, isAdmin } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  
  // ログイン中のユーザー情報とトークンを取得
  const checkAdminStatus = async () => {
    if (currentUser) {
      try {
        const tokenResult = await currentUser.getIdTokenResult(true); // トークンを強制更新
        setTokenInfo({
          uid: currentUser.uid,
          email: currentUser.email,
          isAdmin: !!tokenResult.claims.admin,
          claims: tokenResult.claims,
          token: tokenResult.token.substring(0, 20) + '...' // トークンの一部のみ表示
        });
      } catch (error) {
        console.error('トークン取得エラー:', error);
      }
    }
  };

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
      <Typography variant="h6" gutterBottom>認証情報確認</Typography>
      <Typography>ユーザーID: {currentUser?.uid || 'ログインなし'}</Typography>
      <Typography>メール: {currentUser?.email || 'ログインなし'}</Typography>
      <Typography>管理者フラグ: {isAdmin ? 'はい' : 'いいえ'}</Typography>
      
      {tokenInfo && (
        <Box mt={2}>
          <Typography variant="subtitle2">トークン情報:</Typography>
          <pre style={{ backgroundColor: '#eee', padding: 10, overflow: 'auto', fontSize: '0.8rem' }}>
            {JSON.stringify(tokenInfo, null, 2)}
          </pre>
        </Box>
      )}
      
      <Button variant="outlined" size="small" onClick={checkAdminStatus} sx={{ mt: 1 }}>
        トークン情報を表示
      </Button>
    </Box>
  );
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const { error } = useSongData();
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabIndex(newValue);
  };

  if (!isAdmin) {
    return (
      <>
        <Header />
        <Container sx={{ my: 4 }}>
          <Alert severity="error">
            管理者権限がありません。
          </Alert>
        </Container>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SEO
        title="管理画面"
        description="リズムゲーム楽曲ブラウザの管理画面"
      />
      <Header />
      <ResponsiveLayout>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h1" gutterBottom>
            管理画面
          </Typography>

          {error && (
            <Alert severity="error" sx={{ my: 2 }}>
              {error}
            </Alert>
          )}

          <Paper sx={{ width: '100%', mt: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabIndex}
                onChange={handleTabChange}
                aria-label="管理機能タブ"
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="ダッシュボード" id="admin-tab-0" aria-controls="admin-tabpanel-0" />
                <Tab label="ゲームタイトル管理" id="admin-tab-1" aria-controls="admin-tabpanel-1" />
                <Tab label="楽曲データアップロード" id="admin-tab-2" aria-controls="admin-tabpanel-2" />
                <Tab label="Excelファイル解析" id="admin-tab-3" aria-controls="admin-tabpanel-3" />
              </Tabs>
            </Box>
            <TabPanel value={tabIndex} index={0}>
              <AdminDashboard />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
              <GameTitleManager />
            </TabPanel>
            <TabPanel value={tabIndex} index={2}>
              <ExcelUploader />
            </TabPanel>
            <TabPanel value={tabIndex} index={3}>
              <StructureAnalyzer />
            </TabPanel>
          </Paper>
        </Container>
      </ResponsiveLayout>
      <Footer />
    </>
  );
};

export default Admin;