import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kurotanx07.rhythmgamebrowser',
  appName: '音ゲー広辞苑',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
    cleartext: true,
    // Firebase接続最適化
    allowNavigation: [
      'https://firestore.googleapis.com',
      'https://firebase.googleapis.com',
      'https://securetoken.googleapis.com',
      'https://www.googleapis.com'
    ]
  },
  ios: {
    contentInset: 'automatic',
    // 本番環境ではデバッグを無効化
    webContentsDebuggingEnabled: false,
    limitsNavigationsToAppBoundDomains: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,  // 2秒間表示
      backgroundColor: "#3f51b5",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,  // ローディングスピナーを表示
      spinnerColor: "#ffffff",
      splashFullScreen: true,  // フルスクリーン表示
      splashImmersive: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com', 'email']
    }
  }
};

export default config;