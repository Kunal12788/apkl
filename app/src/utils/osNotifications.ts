import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

/**
 * Utility for triggering Native OS System Notifications
 * Handles both Web (HTML5) and Native Android/iOS (Capacitor)
 */

export const requestOSNotificationPermission = async () => {
  if (Capacitor.isNativePlatform()) {
    // Request permission using Capacitor on Android/iOS
    const permStatus = await LocalNotifications.requestPermissions();
    return permStatus.display === 'granted';
  } else {
    // Request permission using standard Web API
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
  }
};

export const sendOSNotification = async (title: string, body: string) => {
  if (Capacitor.isNativePlatform()) {
    // Trigger Native Hardware Notification via Capacitor
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display === 'granted') {
      await LocalNotifications.schedule({
        notifications: [
          {
            title: title,
            body: body,
            id: new Date().getTime(),
            schedule: { at: new Date(Date.now() + 100) }, // Trigger almost instantly
            sound: undefined, // Uses default system notification sound
            attachments: undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } else {
      console.warn("Native Notification Permission not granted.");
    }
  } else {
    // Trigger Standard Web Notification
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/vite.svg',
        badge: '/vite.svg',
        silent: false
      });
    } else if (Notification.permission !== 'denied') {
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
  }
};
