const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Firebase Admin SDK
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  admin.initializeApp({
    credential: admin.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  console.log("Firebase Admin SDK initialized successfully");
} catch (error) {
  console.error("Error initializing Firebase Admin SDK:", error);
}

// Nodemailer SMTP Transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// API Endpoint for forgot password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    // 1. Generate the secure reset link from Firebase Auth
    const link = await admin.auth().generatePasswordResetLink(email);

    // 2. Setup SMTP transporter
    const transporter = createTransporter();

    // 3. Build HTML template with Zyntra branding
    const logoUrl = process.env.LOGO_URL || "https://res.cloudinary.com/dcazbfdaw/image/upload/v1779316398/yvfuxkltvwygkdbaqvo1.jpg"; 
    const brandColor = "#5096F1";

    const mailOptions = {
      from: `"Zyntra Support" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Reset your Zyntra password 🔑",
      text: `Hello,\n\nWe received a request to reset your Zyntra account password. Follow this link to reset it:\n\n${link}\n\nIf you didn't ask to reset your password, you can ignore this email.\n\nThanks,\nThe Zyntra Team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Zyntra Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #F3F4F6;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 500px;
              margin: 40px auto;
              background-color: #FFFFFF;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              border: 1px solid #E5E7EB;
            }
            .header {
              background-color: #FFFFFF;
              padding: 30px 20px;
              text-align: center;
              border-bottom: 1px solid #F3F4F6;
            }
            .logo {
              height: 50px;
              max-width: 180px;
              object-fit: contain;
            }
            .content {
              padding: 40px 30px;
              color: #374151;
            }
            .title {
              font-size: 22px;
              font-weight: 700;
              color: #111111;
              margin-top: 0;
              margin-bottom: 16px;
              text-align: center;
            }
            .message {
              font-size: 15px;
              line-height: 24px;
              color: #4B5563;
              margin-bottom: 30px;
              text-align: center;
            }
            .button-wrapper {
              text-align: center;
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: ${brandColor};
              color: #FFFFFF !important;
              text-decoration: none;
              padding: 14px 28px;
              font-size: 15px;
              font-weight: 600;
              border-radius: 8px;
              box-shadow: 0 4px 6px rgba(80, 150, 241, 0.2);
            }
            .fallback-text {
              font-size: 12px;
              color: #9CA3AF;
              word-break: break-all;
              text-align: center;
              margin-top: 20px;
              line-height: 18px;
            }
            .footer {
              background-color: #FAFAFA;
              padding: 24px;
              text-align: center;
              font-size: 13px;
              color: #9CA3AF;
              border-top: 1px solid #F3F4F6;
            }
            .footer a {
              color: ${brandColor};
              text-decoration: none;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="Zyntra" class="logo" />
            </div>
            <div class="content">
              <h1 class="title">Reset Your Password</h1>
              <p class="message">
                Hello,<br/><br/>
                We received a request to reset your Zyntra password. Click the button below to choose a new password. This link is valid for 1 hour.
              </p>
              <div class="button-wrapper">
                <a href="${link}" class="button" target="_blank">Reset Password</a>
              </div>
              <p class="message" style="font-size: 13px; color: #9CA3AF; margin-bottom: 0;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
              <div class="fallback-text">
                If the button doesn't work, copy and paste this link in your browser:<br/>
                <a href="${link}" style="color: ${brandColor}; text-decoration: none;">${link}</a>
              </div>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} Zyntra. All rights reserved.<br/>
              Made with ❤️ for creators and developers.
            </div>
          </div>
        </body>
        </html>
      `
    };

    // 4. Send email
    await transporter.sendMail(mailOptions);
    console.log(`Password reset link successfully emailed to: ${email}`);
    
    return res.status(200).json({ success: true, message: "Reset email sent successfully" });
  } catch (error) {
    console.error("Error generating/sending password reset link:", error);
    // Custom error mappings
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ success: false, message: "No Zyntra account matches this email." });
    }
    return res.status(500).json({ success: false, message: error.message || "Failed to process password reset request." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Zyntra Auth Server listening on port ${PORT}`);
});
