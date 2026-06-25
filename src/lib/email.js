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

export async function sendSearchCompletionEmail(email, leadCount, query) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `✅ Scanning Finished: ${leadCount} High-Intent Leads Found`,
    html: `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #dc2626;">Great news!</h2>
        <p>LeadLinx has finished scanning Reddit for: <strong>"${query}"</strong>.</p>
        <p>We found <strong>${leadCount}</strong> high-intent leads that match your criteria.</p>
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

export async function sendThankYouEmail(email, planName, amount) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const mailOptions = {
    from: `"LeadLinx AI" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `🚀 Welcome to LeadLinx ${planName}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #dc2626; margin-bottom: 8px;">Thank You for Your Purchase!</h1>
          <p style="color: #4b5563; font-size: 18px;">Your LeadLinx <strong>${planName}</strong> plan is now active.</p>
        </div>

        <div style="background-color: #f9fafb; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #111827;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Plan</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">${planName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Amount Paid</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #111827;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280;">Status</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #10b981;">Active</td>
            </tr>
          </table>
        </div>

        <p style="color: #4b5563; line-height: 1.6;">
          We're excited to have you on board! You can now start generating high-intent leads with your new credits. 
          If you have any questions or need help getting started, just reply to this email.
        </p>

        <div style="text-align: center; margin-top: 32px;">
          <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background-color: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Go to Dashboard
          </a>
        </div>

        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © 2024 LeadLinx. All rights reserved.<br/>
          Secured by Stripe
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

