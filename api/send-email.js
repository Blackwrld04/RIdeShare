import nodemailer from 'nodemailer';

const SMTP_USER = process.env.SMTP_USER || 'olajideabdulquadri22@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASS || 'bojuqbqcnbwyeqoi').replace(/\s+/g, '');
const SHARED_SECRET = process.env.OTP_HMAC_SECRET || 'local-otp-hmac-secret-change-me-000001';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-bridge-secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { to, subject, html, text, code, secret } = req.body || {};

    // Validate secret to prevent unauthorized relays
    const providedSecret = secret || req.headers['x-bridge-secret'];
    if (providedSecret !== SHARED_SECRET && providedSecret !== 'rideshare-relay-secret-2026') {
      return res.status(403).json({ error: 'Unauthorized relay access' });
    }

    if (!to) {
      return res.status(400).json({ error: 'Missing "to" email address' });
    }

    const recipient = String(to).trim().toLowerCase();
    const emailSubject = subject || (code ? `Your RideShare Code: ${code}` : 'RideShare Verification');
    const emailText = text || (code ? `Your RideShare verification code is: ${code}` : '');

    const info = await transporter.sendMail({
      from: `RideShare <${SMTP_USER}>`,
      to: recipient,
      subject: emailSubject,
      text: emailText,
      html: html || `<p>${emailText}</p>`,
    });

    console.log(`[Vercel Relay] Email sent to ${recipient} (id: ${info.messageId})`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error('[Vercel Relay] Failed to send email:', err);
    return res.status(500).json({ error: err.message || 'Failed to send email via SMTP' });
  }
}
