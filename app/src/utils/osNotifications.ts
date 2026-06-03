/**
 * Utility for triggering Native OS System Notifications
 */

export const requestOSNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notification');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendOSNotification = (title: string, body: string) => {
  if (!('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/vite.svg', // Assuming standard Vite icon or you can replace with your own logo
      badge: '/vite.svg',
      silent: false
    });
  } else if (Notification.permission !== 'denied') {
    // If not granted or denied yet, request permission then send
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/vite.svg',
          badge: '/vite.svg',
          silent: false
        });
      }
    });
  }
};
