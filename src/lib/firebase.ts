// Firebase configuration for moncone web app
// Project: moncone-ac9cf | Project Number: 395467911134

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyBihvBQt32v1eitCWfd5cNgiUZdJVvlecs",
  authDomain: "moncone-ac9cf.firebaseapp.com",
  projectId: "moncone-ac9cf",
  storageBucket: "moncone-ac9cf.firebasestorage.app",
  messagingSenderId: "395467911134",
  appId: "1:395467911134:web:3b88227f8dacf38773f74f"
};

// Initialize Firebase (only once)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Analytics (browser only)
export function getFirebaseAnalytics() {
  if (typeof window !== 'undefined') {
    return getAnalytics(app);
  }
  return null;
}

// Push Notifications (FCM)
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: '' // VAPID key-г Firebase Console-оос авна
      });
      console.log('FCM Token:', token);
      return token;
    }
    return null;
  } catch (error) {
    console.error('FCM permission error:', error);
    return null;
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void) {
  if (typeof window === 'undefined') return () => {};
  
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}

export { app };
export default app;
