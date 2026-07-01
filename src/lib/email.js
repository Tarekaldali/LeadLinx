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
        <h2 style="color: #dc2626;">High-Intent Lead Detected</h2>
        <p>Our AI has detected a new lead with a score of <strong>${lead.intentScore}</strong>/10.</p>
        
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0;">${lead.title}</h3>
          <p style="color: #4b5563; font-style: italic;">"${lead.text}"</p>
          <p><strong>Subreddit:</strong> r/${lead.subreddit}</p>
        </div>
        
        <p><strong>Why we flagged this:</strong><br/>${lead.intentReason}</p>
        
        <a href="${lead.link}" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">
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

export async function sendVerificationCode(email, code) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email credentials not configured. Skipping verification email.');
    return;
  }

  const mailOptions = {
    from: `"LeadLinx Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `${code} is your LeadLinx verification code`,
    html: `
      <div style="font-family: sans-serif; max-w: 500px; margin: 0 auto; border: 1px solid #e5e7eb; padding: 32px; border-radius: 12px;">
        <h2 style="color: #dc2626; margin-top: 0;">Verification Code</h2>
        <p style="color: #4b5563; font-size: 16px;">Enter the following code to sign in to your LeadLinx account:</p>
        <div style="background-color: #f3f4f6; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111827;">${code}</span>
        </div>
        <p style="color: #9ca3af; font-size: 14px;">This code will expire in 5 minutes. If you didn't request this code, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2024 LeadLinx. All rights reserved.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    throw new Error('Failed to send email');
  }
}

export async function sendSearchCompletionEmail(email, leadCount, query, creditsUsed = 0) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `✅ Scanning Finished: ${leadCount} High-Intent Leads Found`,
    html: `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Great news!</h2>
        <p>Your Lead Extraction is Complete. <strong>${leadCount}</strong> leads were successfully extracted, and <strong>${creditsUsed}</strong> credits were used.</p>
        <p>Search Query: <strong>"${query}"</strong></p>
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            View Leads in Dashboard
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Happy prospecting,<br/>The LeadLinx Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send completion email:', error);
  }
}

export async function sendSubscriptionRenewalEmail(email, planKey, amount) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx Billing" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `📋 Upcoming Renewal: Your LeadLinx ${planKey} plan renews soon`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Subscription Renewal Notice</h2>
        <p>Your <strong>${planKey}</strong> plan will automatically renew in the next few days.</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Amount:</strong> $${amount.toFixed(2)}/month</p>
          <p><strong>Plan:</strong> ${planKey.charAt(0).toUpperCase() + planKey.slice(1)}</p>
        </div>
        <p>If you'd like to manage your subscription, you can do so from your dashboard settings.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/settings?tab=billing" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Manage Billing
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you don't want to renew, cancel anytime from your settings before the renewal date.<br/>The LeadLinx Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send renewal email:', error);
  }
}

export async function sendPaymentFailedEmail(email) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx Billing" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `⚠️ Payment Failed — Action Required`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Payment Failed</h2>
        <p>We were unable to process your subscription payment. Please update your payment method to avoid losing access to your plan.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard/settings?tab=billing" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Update Payment Method
          </a>
        </div>
        <p style="color: #6b7280; font-size: 14px;">If you believe this is an error, please contact support.<br/>The LeadLinx Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send payment failed email:', error);
  }
}

export async function sendThankYouEmail({ email, name, planName, amount, currency, chargeId, status, date }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx Billing" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Receipt for your LeadLinx ${planName} Plan`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 20px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #111827; margin-bottom: 8px; font-size: 24px; font-weight: 700;">Payment Receipt</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 0;">Hi ${name}, thank you for your purchase.</p>
        </div>

        <div style="background-color: #f9fafb; padding: 24px; border-radius: 12px; margin-bottom: 32px; border: 1px solid #e5e7eb;">
          <div style="margin-bottom: 24px;">
            <p style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 4px 0; font-weight: 600;">Amount Paid</p>
            <p style="color: #111827; font-size: 32px; font-weight: 700; margin: 0;">${amount.toFixed(2)} <span style="font-size: 16px; color: #6b7280;">${currency}</span></p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Plan</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">LeadLinx ${planName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Transaction ID</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px; font-family: monospace;">${chargeId}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Date</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #111827; font-size: 14px;">${new Date(date).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #6b7280; font-size: 14px;">Status</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #10b981; font-size: 14px;">${status}</td>
            </tr>
          </table>
        </div>

        <p style="color: #4b5563; line-height: 1.6; font-size: 15px; margin-bottom: 32px;">
          Your account has been successfully upgraded and your new credits are ready to use. You can now continue generating high-intent leads from your dashboard.
        </p>

        <div style="text-align: center; margin-bottom: 40px;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #dc2626; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; font-size: 15px;">
            Access Dashboard
          </a>
        </div>

        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 32px;">
          <p style="color: #4b5563; font-size: 14px; margin: 0;">
            <strong>Need help?</strong> Contact us at <a href="mailto:support@leadlinx.com" style="color: #dc2626; text-decoration: none;">support@leadlinx.com</a> or open a ticket in your dashboard.
          </p>
        </div>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 0 0 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0; line-height: 1.5;">
          © 2024 LeadLinx. All rights reserved.<br/>
          Secured by Tap Payments
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Thank you email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send thank you email:', error);
  }
}

export async function sendMonitorThresholdEmail(email, monitor, leadCount) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;

  const mailOptions = {
    from: `"LeadLinx Surveillance" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🎯 Goal Reached: ${leadCount} Leads Found for "${monitor.goal}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #ff3b30;">Surveillance Alert</h2>
        <p>Your monitor for <strong>"${monitor.goal}"</strong> has reached your target threshold.</p>
        
        <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; margin: 24px 0; text-align: center;">
          <div style="font-size: 48px; font-weight: bold; color: #111827; margin-bottom: 8px;">${leadCount}</div>
          <div style="text-transform: uppercase; letter-spacing: 2px; font-size: 12px; font-weight: bold; color: #6b7280;">High-Intent Leads Found</div>
        </div>

        <p style="color: #4b5563; line-height: 1.6;">
          Our AI agents have successfully identified these leads across targeted communities. You can now view, contact, and qualify them directly from your LeadLinx Workspace.
        </p>

        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #ff3b30; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            View Leads Now
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          You are receiving this because you enabled threshold alerts for this monitor.<br/>
          © 2024 LeadLinx AI
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Failed to send monitor alert email:', error);
    return false;
  }
}

export async function sendAdminPurchaseNotification(userEmail, planName, amount) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx System" <${process.env.EMAIL_USER}>`,
    to: 'tarekaldali1234@gmail.com',
    subject: `💰 New Subscription Purchased: ${planName}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>New Subscription Alert</h2>
        <p><strong>User:</strong> ${userEmail}</p>
        <p><strong>Plan:</strong> ${planName}</p>
        <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send admin purchase notification:', error);
  }
}

export async function sendSupportTicketAlert(ticket) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx Contact Form" <${process.env.EMAIL_USER}>`,
    to: 'tarekaldali1234@gmail.com',
    subject: `📩 New Support Ticket: ${ticket.subject}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>New Contact Us Submission</h2>
        <p><strong>Name:</strong> ${ticket.name}</p>
        <p><strong>Email:</strong> ${ticket.email}</p>
        <p><strong>Subject:</strong> ${ticket.subject}</p>
        <p><strong>Message:</strong></p>
        <blockquote style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
          ${ticket.message.replace(/\n/g, '<br/>')}
        </blockquote>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send support ticket alert:', error);
  }
}

export async function sendSupportTicketReply(userEmail, subject, replyMessage) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx Support" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Re: ${subject}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">LeadLinx Support</h2>
        <p style="color: #4b5563; line-height: 1.6;">
          ${replyMessage.replace(/\n/g, '<br/>')}
        </p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">
          Best regards,<br/>The LeadLinx Team
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Failed to send support ticket reply:', error);
  }
}

