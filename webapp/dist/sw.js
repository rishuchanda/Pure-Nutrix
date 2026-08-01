self.addEventListener('push', function(event) {
  if (event.data) {
    try {
      const data = event.data.json();
      
      const options = {
        body: data.body,
        icon: '/vite.svg', // Replace with actual logo
        badge: '/vite.svg',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          primaryKey: '2'
        }
      };
      
      event.waitUntil(
        self.registration.showNotification(data.title || 'Pure Nutrix', options)
      );
    } catch (e) {
      console.error('Error parsing push data', e);
      // Fallback if not JSON
      event.waitUntil(
        self.registration.showNotification('Pure Nutrix', {
          body: event.data.text(),
          icon: '/vite.svg'
        })
      );
    }
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
