import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kurotanx07.rhythmgamedictionary',
  appName: 'Rhythm Game Dictionary(音ゲー広辞苑)',
  webDir: 'build',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#3f51b5",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com', 'apple.com', 'email']
    }
  }
};

export default config;