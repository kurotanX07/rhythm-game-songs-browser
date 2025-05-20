import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import SEO from '../components/common/SEO';

const PrivacyPolicy: React.FC = () => {
  return (
    <>
      <SEO title="プライバシーポリシー" />
      <Header />
      <Container maxWidth="md" sx={{ my: 8 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Box sx={{ mb: 4 }}>
            <Typography component="h1" variant="h4" align="center" gutterBottom>
              プライバシーポリシー
            </Typography>
            <Typography variant="body2" color="textSecondary" align="right">
              最終更新日: {new Date().toLocaleDateString('ja-JP')}
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            本プライバシーポリシーは、Rhythm-Game-Dictionary(音ゲー広辞苑)（以下「本アプリ」）の利用に関して、ユーザーの個人情報の取り扱いについて説明するものです。本アプリをご利用いただくことで、本プライバシーポリシーに同意したものとみなします。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            1. 収集する情報
          </Typography>
          <Typography variant="body1" paragraph>
            本アプリでは、以下の情報を収集する場合があります：
          </Typography>
          <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
            <li>アカウント情報（メールアドレス）</li>
            <li>利用状況データ（アクセス日時、閲覧したコンテンツなど）</li>
            <li>デバイス情報（OS、ブラウザの種類など）</li>
            <li>IPアドレス</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            2. 情報の利用目的
          </Typography>
          <Typography variant="body1" paragraph>
            収集した情報は、以下の目的で利用します：
          </Typography>
          <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
            <li>本アプリの提供・維持・保護</li>
            <li>ユーザー認証とアカウント管理</li>
            <li>サービス改善と新機能の開発</li>
            <li>不正利用の検出と防止</li>
            <li>お問い合わせへの対応</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            3. 情報の共有
          </Typography>
          <Typography variant="body1" paragraph>
            当社は、以下の場合を除き、ユーザーの個人情報を第三者と共有することはありません：
          </Typography>
          <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
            <li>ユーザーの同意がある場合</li>
            <li>法律上の要請がある場合</li>
            <li>サービス提供に必要なクラウドサービスプロバイダー等との共有</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            4. セキュリティ対策
          </Typography>
          <Typography variant="body1" paragraph>
            当社は、ユーザーの個人情報を保護するために適切なセキュリティ対策を講じています。ただし、インターネットや電子ストレージの特性上、100%の安全性を保証することはできません。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            5. ユーザーの権利
          </Typography>
          <Typography variant="body1" paragraph>
            ユーザーは以下の権利を有します：
          </Typography>
          <Typography variant="body1" component="ul" sx={{ pl: 4 }}>
            <li>個人情報へのアクセス</li>
            <li>個人情報の訂正または削除</li>
            <li>データポータビリティ</li>
            <li>同意の撤回</li>
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            6. Cookie（クッキー）の使用
          </Typography>
          <Typography variant="body1" paragraph>
            本アプリでは、ユーザー体験の向上やサービス改善のためにCookieを使用することがあります。ブラウザの設定によりCookieを無効にすることも可能ですが、一部の機能が正常に動作しなくなる可能性があります。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            7. プライバシーポリシーの変更
          </Typography>
          <Typography variant="body1" paragraph>
            当社は、必要に応じて本プライバシーポリシーを変更することがあります。重要な変更がある場合は、本アプリ上で通知します。
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            8. お問い合わせ
          </Typography>
          <Typography variant="body1" paragraph>
            本プライバシーポリシーに関するご質問やご意見は、以下の連絡先までお寄せください。
          </Typography>
          <Typography variant="body1" paragraph>
            メール：[kurotangames07@gmail.com]
          </Typography>
        </Paper>
      </Container>
      <Footer />
    </>
  );
};

export default PrivacyPolicy; 