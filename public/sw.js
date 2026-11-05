// JongUse Service Worker for Mobile & Background Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the client page to trigger system notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload;
    self.registration.showNotification(title, {
      icon: '/icon-192.png',
      badge: '/favicon.png',
      vibrate: [150, 80, 150],
      requireInteraction: false,
      ...options,
    });
  }
});

// Focus or open the app when the user taps the mobile notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetTool = event.notification.data?.tool || null;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if (targetTool) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              tool: targetTool,
            });
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});
