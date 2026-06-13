// Firebase Cloud Messaging Service Worker
// moncone — Монгол кино урсгал
// Энэ файл push notification-г background-д хүлээн авдаг

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBihvBQt32v1eitCWfd5cNgiUZdJVvlecs",
  authDomain: "moncone-ac9cf.firebaseapp.com",
  projectId: "moncone-ac9cf",
  storageBucket: "moncone-ac9cf.firebasestorage.app",
  messagingSenderId: "395467911134",
  appId: "1:395467911134:web:3b88227f8dacf38773f74f"
});

const messaging = firebase.messaging();

// Background message handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'moncone';
  const notificationOptions = {
    body: payload.notification?.body || 'Шинэ мэдэгдэл байна',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'moncone-notification',
    data: payload.data,
    actions: [
      {
        action: 'open',
        title: 'Үзэх'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const url = event.notification.data?.url || 'https://moncone.online';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
