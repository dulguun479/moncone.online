import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'online.moncone.app',
  appName: 'moncone',
  webDir: 'dist/client',
  server: {
    url: 'https://moncone.online',
    cleartext: true,
    allowNavigation: ['moncone.online', 'www.moncone.online']
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#030303',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#030303',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#EF4444',
      sound: 'default',
    },
  },
};

export default config;
