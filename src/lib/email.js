import nodemailer from 'nodemailer';

// To use Gmail SMTP:
// 1. Enable 2-Step Verification in your Google Account
// 2. Go to Security -> App Passwords
// 3. Generate a new App Password
// 4. Put the email in EMAIL_USER and the App Password in EMAIL_PASS in .env.local

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendLeadAlert(userEmail, lead) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Skipping email alert.');
    return;
  }

  const mailOptions = {
    from: `"LeadLinx AI Alerts" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `🔥 High-Intent Lead Found: ${lead.title.substring(0, 50)}...`,
    html: `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">High-Intent Lead Detected</h2>
        <p>Our AI has detected a new lead with a score of <strong>${lead.intentScore}</strong>/10.</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0;">${lead.title}</h3>
          <p style="color: #4b5563; font-style: italic;">"${lead.text}"</p>
          <p><strong>Subreddit:</strong> r/${lead.subreddit}</p>
        </div>
        
        <p><strong>Why we flagged this:</strong><br/>${lead.intentReason}</p>
        
        <a href="${lead.link}" style="display: inline-block; background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">
          View on Reddit
        </a>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Alert email sent to ${userEmail}`);
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}
