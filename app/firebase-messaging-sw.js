// Firebase Cloud Messaging Service Worker
// Tento soubor musí být v rootu web app (/app/firebase-messaging-sw.js)

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCIz06Z_Hxgy1NbJ2lMRIwP7i0neCLZux8",
  authDomain:        "tymdejvid-app.firebaseapp.com",
  projectId:         "tymdejvid-app",
  storageBucket:     "tymdejvid-app.appspot.com",
  messagingSenderId: "63012851400",
  appId:             "1:63012851400:web:d7020295b1281c4d169ffd",
});

const messaging = firebase.messaging();

// Zpracování push notifikace na pozadí (app je zavřená / minimalizovaná)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || payload.data || {};
  if (!title) return;

  self.registration.showNotification(title, {
    body:  body  || '',
    icon:  '/logo.png',
    badge: '/logo.png',
    tag:   'tymdejvid-news',        // sloučí více notifikací do jedné
    renotify: false,
    data:  { url: self.location.origin },
  });
});

// Kliknutí na notifikaci otevře / přepne fokus na app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || self.location.origin;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const existing = windowClients.find(c => c.url.startsWith(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
