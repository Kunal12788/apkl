import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurora.gold',
  appName: 'Aurora Divine Gold',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#0f172a",
      sound: "beep.wav",
    },
  },
};

export default config;
