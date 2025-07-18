// firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js ');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js ');

firebase.initializeApp({
  apiKey: "AIzaSyBATZMxOgepqDJAd-J_X9BGq5kSrnXWSZA",
  authDomain: "sl-postagens.firebaseapp.com",
  projectId: "sl-postagens",
  storageBucket: "sl-postagens.firebasestorage.app",
  messagingSenderId: "336664673765",
  appId: "1:336664673765:web:a2bc241e70a7b291d3430c"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Mensagem recebida:', payload.notification);
  const { title, body, icon } = payload.notification;

  self.registration.showNotification(title, {
    body,
    icon: icon || '/favicon.ico',
    badge: '/favicon.ico'
  });
});
