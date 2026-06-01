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
    allowMixedContent: true
  }
};

export default config;
