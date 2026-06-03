import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, userEmail, userName, userRole, timestamp } = req.body;

    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    const adminEmail = process.env.NOTIFICATION_EMAIL || 'k7574750@gmail.com';

    if (!gmailUser || !gmailPass) {
      console.warn("SMTP credentials missing.");
      return res.status(200).json({ 
        status: 'ignored', 
        message: 'SMTP credentials not configured.',
        debug: {
          hasUser: !!gmailUser,
          hasPass: !!gmailPass,
          envKeys: Object.keys(process.env).filter(k => k.includes('GMAIL') || k.includes('NOTIF'))
        }
      });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });

    const isLogin = action === 'login';
    const actionText = isLogin ? 'logged in to' : 'logged out of';
    const timeString = timestamp ? new Date(timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString();

    const userMailOptions = {
      from: `"Aurora Divine Gold" <${gmailUser}>`,
      to: userEmail,
      subject: isLogin ? 'Security Alert: New Login Detected' : 'Security Alert: Successful Logout',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center; border-bottom: 3px solid #f59e0b;">
            <h2 style="color: #ffffff; margin: 0; text-transform: uppercase; letter-spacing: 2px;">Aurora Divine Gold</h2>
          </div>
          <div style="padding: 30px;">
            <h3 style="color: #1e293b; margin-top: 0;">Hello ${userName},</h3>
            <p style="color: #475569; line-height: 1.6;">
              This is a security notification to inform you that your account was successfully <strong>${actionText}</strong> the Aurora Divine Gold Command Center at <strong>${timeString}</strong> (IST).
            </p>
            ${isLogin ? `
            <p style="color: #dc2626; font-size: 13px; margin-top: 30px; padding: 15px; background-color: #fef2f2; border-radius: 6px; border: 1px solid #fecaca;">
              <strong>Security Warning:</strong> If you did not perform this login, please contact the Super Admin immediately.
            </p>
            ` : ''}
          </div>
        </div>
      `
    };

    const adminMailOptions = {
      from: `"Aurora Audit System" <${gmailUser}>`,
      to: adminEmail,
      subject: `AUDIT LOG: User ${isLogin ? 'Login' : 'Logout'} - ${userName}`,
      html: `
        <div style="font-family: monospace; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #cbd5e1;">
          <h3 style="color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">SYSTEM AUDIT ALERT</h3>
          <p><strong>Action:</strong> USER_${action.toUpperCase()}</p>
          <p><strong>User Name:</strong> ${userName}</p>
          <p><strong>User Email:</strong> ${userEmail}</p>
          <p><strong>User Role:</strong> ${userRole}</p>
          <p><strong>Timestamp:</strong> ${timeString}</p>
          <p><strong>Status:</strong> SUCCESS</p>
        </div>
      `
    };

    await Promise.all([
      transporter.sendMail(userMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);

    return res.status(200).json({ success: true, message: 'Notifications sent successfully.' });
  } catch (error) {
    console.error('Error sending notification email:', error);
    return res.status(500).json({ error: error.message || 'Failed to send notification email.' });
  }
}
