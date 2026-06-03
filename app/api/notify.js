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
    const adminEmail = process.env.NOTIFICATION_EMAIL || 'ssrcreations41@gmail.com';

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
      from: `"AURORA" <${gmailUser}>`,
      to: userEmail,
      subject: isLogin ? 'Security Alert: New Login Detected' : 'Security Alert: Successful Logout',
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Identical Premium Header -->
          <div style="background-color: #0f172a; padding: 35px 20px; text-align: center; border-bottom: 4px solid #f59e0b;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 4px; text-transform: uppercase; font-weight: 900;">
              AURORA
            </h1>
            <p style="color: #f59e0b; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; font-weight: bold;">
              Security Notification
            </p>
          </div>
          <!-- Identical Content Body Structure -->
          <div style="padding: 40px 30px; background-color: #ffffff;">
            <h2 style="color: #1e293b; font-size: 20px; margin-top: 0; font-weight: 800; text-align: center;">Hello ${userName}</h2>
            <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 25px; text-align: center;">
              This is a security notification to inform you that your account was successfully <strong>${actionText}</strong> the AURORA Command Center.
            </p>
            
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; text-align: center; margin-bottom: 30px;">
              <p style="margin: 0; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Timestamp (IST)</p>
              <p style="margin: 5px 0 0 0; color: #0f172a; font-size: 15px; font-weight: bold;">${timeString}</p>
            </div>

            ${isLogin ? `
            <div style="border-left: 4px solid #dc2626; background-color: #fef2f2; padding: 20px; text-align: left; border-radius: 0 8px 8px 0; margin-top: 10px;">
              <h3 style="color: #991b1b; font-size: 13px; margin: 0 0 5px 0; font-weight: bold; text-transform: uppercase;">Security Warning</h3>
              <p style="color: #b91c1c; font-size: 13px; margin: 0; line-height: 1.5;">
                If you did not perform this login, your credentials may be compromised. Please contact the Super Admin immediately.
              </p>
            </div>
            ` : `
            <div style="text-align: center; padding: 15px; background-color: #f8fafc; border-radius: 8px;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">Your session has been securely terminated.</p>
            </div>
            `}
            
            <!-- Identical Footer -->
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              Generated securely by AURORA System. Please do not reply to this automated email.
            </p>
          </div>
        </div>
      `
    };

    const adminMailOptions = {
      from: `"AURORA Audit" <${gmailUser}>`,
      to: adminEmail,
      subject: `AUDIT LOG: User ${isLogin ? 'Login' : 'Logout'} - ${userName}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Identical Premium Header -->
          <div style="background-color: #0f172a; padding: 35px 20px; text-align: center; border-bottom: 4px solid #f59e0b;">
            <h1 style="color: #ffffff; margin: 0; font-size: 26px; letter-spacing: 4px; text-transform: uppercase; font-weight: 900;">
              AURORA
            </h1>
            <p style="color: #f59e0b; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; font-weight: bold;">
              System Audit Alert
            </p>
          </div>
          <!-- Identical Content Body Structure -->
          <div style="padding: 40px 30px; background-color: #ffffff;">
            
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
              <div style="padding: 15px 20px; background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; text-align: center;">
                <span style="font-family: monospace; color: #475569; font-size: 13px; font-weight: bold;">EVENT: USER_${action.toUpperCase()}</span>
              </div>
              <div style="padding: 20px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; width: 40%;"><strong>User Name:</strong></td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">${userName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>Email Address:</strong></td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">${userEmail}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>Assigned Role:</strong></td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">
                      <span style="background-color: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase;">${userRole}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;"><strong>Timestamp (IST):</strong></td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 600;">${timeString}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #64748b;"><strong>System Status:</strong></td>
                    <td style="padding: 12px 0; color: #10b981; font-weight: bold;">SUCCESS</td>
                  </tr>
                </table>
              </div>
            </div>
            
            <!-- Identical Footer -->
            <p style="color: #94a3b8; font-size: 12px; line-height: 1.5; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
              Generated securely by AURORA System. Please do not reply to this automated email.
            </p>
          </div>
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
