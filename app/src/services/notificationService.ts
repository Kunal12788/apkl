export const sendActivityNotification = async (
  action: 'login' | 'logout',
  userEmail: string,
  userName: string,
  userRole: string
) => {
  try {
    // In local development, Vite serves the app on a specific port, 
    // but the Vercel API might not be running unless we use Vercel CLI.
    // In production, /api/notify will resolve automatically.
    const apiUrl = import.meta.env.DEV ? 'http://localhost:3000/api/notify' : '/api/notify';
    
    // We use the apiUrl to hit the correct backend depending on environment
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        userEmail,
        userName,
        userRole,
        timestamp: new Date().toISOString()
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.warn('Notification API failed:', result.error);
    } else {
      console.log('Notification API success:', result);
    }
  } catch (err) {
    console.error('Failed to trigger notification service:', err);
  }
};
