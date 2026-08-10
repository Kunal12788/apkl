/**
 * Utility for OS System Notifications (Disabled)
 */

export const requestOSNotificationPermission = async (): Promise<boolean> => {
  return false;
};

export const sendOSNotification = async (_title: string, _body: string): Promise<void> => {
  // Push notifications removed/disabled per configuration
};

