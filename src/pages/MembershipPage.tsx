// src/pages/MembershipPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Typography, Box, Button, Card, CardContent,
  CardActions, Grid, Divider, Chip, Alert, Paper, CircularProgress,
  List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PaymentIcon from '@mui/icons-material/Payment';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import SEO from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';
import { 
  SUBSCRIPTION_PLANS, 
  SubscriptionPlan, 
  createCheckoutSession,
  handleSuccessfulSubscription 
} from '../services/membershipService';

// Declare Stripe global variable
declare global {
  interface Window {
    Stripe?: any;
  }
}

// Mock function to simulate Stripe integration
const loadStripe = async () => {
  // In a real app, you would use the actual Stripe.js library
  // return window.Stripe ? window.Stripe('your_publishable_key') : null;
  
  // For development, we'll just simulate a delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { redirectToCheckout: async ({ sessionId }: { sessionId: string }) => {
    console.log('Would redirect to Stripe checkout with session ID:', sessionId);
    
    // For demo purposes, we'll simulate a successful payment after 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Simulate a redirect back from Stripe
    return { error: null };
  }};
};

const MembershipPage: React.FC = () => {
  const { currentUser, userMembership, isPremium } = useAuth();
  const navigate = useNavigate();
  
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Check if user is coming back from Stripe checkout
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get('session_id');
    const success = query.get('success');
    
    if (sessionId && success === 'true' && currentUser) {
      handleSuccessfulPayment(sessionId);
    }
  }, [currentUser]);
  
  // Handle successful payment return from Stripe
  const handleSuccessfulPayment = async (sessionId: string) => {
    if (!currentUser || !selectedPlan) return;
    
    try {
      setLoading(true);
      
      // In a real app, you would verify the payment with your backend
      await handleSuccessfulSubscription(
        currentUser.uid,
        sessionId,
        selectedPlan.id
      );
      
      setSuccess('プレミアム会員へのアップグレードが完了しました！');
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: any) { // Fixed: Properly type the error
      console.error('Payment verification error:', err);
      setError('支払いの確認中にエラーが発生しました。サポートにお問い合わせください。');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle the "Subscribe" button click
  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!currentUser) {
      navigate('/login?redirect=membership');
      return;
    }
    
    try {
      setSelectedPlan(plan);
      setLoading(true);
      setError(null);
      
      // Create a checkout session
      const stripe = await loadStripe();
      
      if (!stripe) {
        throw new Error('決済システムの読み込みに失敗しました。');
      }
      
      const checkoutSession = await createCheckoutSession(currentUser.uid, plan.id);
      
      if (!checkoutSession) {
        throw new Error('チェックアウトセッションの作成に失敗しました。');
      }
      
      // Redirect to Stripe Checkout
      const { error } = await stripe.redirectToCheckout({
        sessionId: checkoutSession.sessionId
      });
      
      if (error) {
        throw new Error((error as Error).message);
      }
      
      // For demo, simulate success since we're not actually redirecting
      setSuccess('支払いが完了しました！プレミアム機能をお楽しみください。');
      
    } catch (err: unknown) {
        console.error('Subscription error:', err);
        setError(
          err instanceof Error 
            ? err.message 
            : '購読処理中にエラーが発生しました。もう一度お試しください。'
        );
      }finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <SEO
        title="会員プラン"
        description="音ゲー広辞苑の会員プランと特典"
      />
      <Header />
      <Container maxWidth="lg" sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          会員プラン
        </Typography>
        
        <Typography variant="subtitle1" paragraph align="center" sx={{ mb: 4 }}>
          プレミアム会員になって、より便利な機能をお楽しみください
        </Typography>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 4 }}>
            {success}
          </Alert>
        )}
        
        {/* Current membership status */}
        <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            現在の会員ステータス
          </Typography>
          
          {!currentUser ? (
            <Alert severity="info">
              会員プランにご登録いただくには、まず
              <Button 
                color="primary" 
                onClick={() => navigate('/login?redirect=membership')}
                sx={{ mx: 1 }}
              >
                ログイン
              </Button>
              してください。
            </Alert>
          ) : isPremium ? (
            <Box>
              <Alert severity="success" icon={<VerifiedUserIcon />}>
                あなたは{userMembership?.membershipLevel === 'admin' ? '管理者' : 'プレミアム会員'}です！
              </Alert>
              
              {userMembership?.membershipExpiry && userMembership.membershipLevel === 'premium' && (
                <Typography sx={{ mt: 2 }}>
                  有効期限: {userMembership.membershipExpiry.toLocaleDateString()}
                </Typography>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              現在、無料会員としてご利用いただいています。プレミアム会員にアップグレードして、すべての機能をお楽しみください。
            </Alert>
          )}
        </Paper>
        
        {/* Comparison table */}
        <Typography variant="h5" gutterBottom sx={{ mt: 6, mb: 3 }} align="center">
          会員プラン比較
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {/* Free Plan */}
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h5" component="div" gutterBottom>
                  無料会員
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h4" component="div" color="text.secondary">
                    ¥0
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    永久無料
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <List sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="楽曲情報の閲覧" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="基本検索機能" />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="最大10曲のお気に入り保存" />
                  </ListItem>
                  <ListItem sx={{ opacity: 0.5 }}>
                    <ListItemIcon>
                      <CheckIcon color="disabled" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="楽曲データのエクスポート" 
                      secondary="プレミアム会員限定"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="disabled" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="広告表示あり" 
                    />
                  </ListItem>
                </List>
              </CardContent>
              
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  disabled={true}
                >
                  現在のプラン
                </Button>
              </CardActions>
            </Card>
          </Grid>
          
          {/* Premium Plans */}
          {SUBSCRIPTION_PLANS.map(plan => (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  borderColor: plan.id === 'premium-yearly' ? 'primary.main' : undefined,
                  borderWidth: plan.id === 'premium-yearly' ? 2 : 1,
                  borderStyle: 'solid',
                  position: 'relative'
                }}
              >
                {plan.id === 'premium-yearly' && (
                  <Chip 
                    label="おすすめ" 
                    color="primary" 
                    icon={<StarIcon />}
                    sx={{ 
                      position: 'absolute', 
                      top: -12, 
                      right: 20 
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="div" gutterBottom>
                    {plan.name}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h4" component="div">
                      ¥{plan.price.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {plan.interval === 'month' ? '/ 月（毎月課金）' : '/ 年（年額課金）'}
                    </Typography>
                  </Box>
                  
                  {plan.description && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {plan.description}
                    </Typography>
                  )}
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <List sx={{ mb: 2 }}>
                    {plan.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckIcon color="success" />
                        </ListItemIcon>
                        <ListItemText primary={feature} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    color={plan.id === 'premium-yearly' ? 'primary' : 'secondary'}
                    startIcon={<CreditCardIcon />}
                    onClick={() => handleSubscribe(plan)}
                    disabled={loading || isPremium}
                  >
                    {isPremium ? 'すでに登録済み' : '今すぐ登録'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
        
        {/* Features comparison */}
        <Paper sx={{ p: 3, mb: 6 }}>
          <Typography variant="h6" gutterBottom>
            プレミアム会員特典の詳細
          </Typography>
          
          <Typography variant="body2" paragraph>
            プレミアム会員になると、以下の特典をご利用いただけます：
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <VerifiedUserIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="楽曲データのエクスポート機能" 
                secondary="楽曲データをCSV、Excel、JSONなど様々な形式でエクスポートできます。曲の管理や分析に便利です。"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <VerifiedUserIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="広告なしの快適な閲覧体験" 
                secondary="プレミアム会員では広告が表示されないため、より快適に楽曲情報を閲覧できます。"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <VerifiedUserIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="お気に入り曲の無制限保存" 
                secondary="楽曲を無制限にお気に入りに登録でき、効率的に管理できます。"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <VerifiedUserIcon color="primary" />
              </ListItemIcon>
              <ListItemText 
                primary="プレミアムサポート" 
                secondary="問題や質問がある場合、優先的にサポートを受けられます。"
              />
            </ListItem>
          </List>
        </Paper>
        
        {/* FAQ Section */}
        <Typography variant="h5" gutterBottom sx={{ mt: 6, mb: 3 }} align="center">
          よくある質問
        </Typography>
        
        <Paper sx={{ p: 3, mb: 6 }}>
          <List>
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Q: サブスクリプションはいつでもキャンセルできますか？
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                A: はい、いつでもキャンセル可能です。キャンセル後も、期間終了までプレミアム特典をご利用いただけます。
              </Typography>
            </ListItem>
            
            <Divider component="li" sx={{ my: 2 }} />
            
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Q: 支払い方法は何がありますか？
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                A: クレジットカード（Visa、Mastercard、American Express、JCB）、Apple Pay、Google Payがご利用いただけます。
              </Typography>
            </ListItem>
            
            <Divider component="li" sx={{ my: 2 }} />
            
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Q: 無料会員と比べて、どのようなメリットがありますか？
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                A: プレミアム会員には、楽曲データのエクスポート機能、広告なしの閲覧体験、お気に入り曲の無制限保存など、様々な特典があります。
              </Typography>
            </ListItem>
            
            <Divider component="li" sx={{ my: 2 }} />
            
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle1" fontWeight="bold">
                Q: 年間プランを選ぶメリットは？
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                A: 年間プランを選ぶと、月額プランと比較して約2ヶ月分お得になります。長期的にご利用を検討されている方におすすめです。
              </Typography>
            </ListItem>
          </List>
        </Paper>
      </Container>
      <Footer />
    </>
  );
};

export default MembershipPage;