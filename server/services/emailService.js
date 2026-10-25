import nodemailer from 'nodemailer';
const sendEmail = async ({ to, subject, html, text, attachments = [] }) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpKey = process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY;

  console.log('📧 Dispatching email to:', to);
  console.log('  - Subject:', subject);

  let restApiError = null;
  let smtpError = null;

  // Strategy 1: Instant REST API (primary pipe)
  if (BREVO_API_KEY && BREVO_API_KEY.startsWith('xkeysib-')) {
    try {
      console.log('⚡ Sending via Brevo REST API (instant pipe)...');
      const emailData = {
        sender: {
          name: process.env.SENDER_NAME || 'NeuroHire AI',
          email: process.env.SENDER_EMAIL || 'neurohireaiplatform@gmail.com'
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text || subject
      };

      if (attachments && attachments.length > 0) {
        emailData.attachment = attachments.map(att => ({
          name: att.name,
          content: att.content
        }));
      }

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      if (response.ok) {
        console.log('✅ Email delivered instantly via REST API! MessageId:', result.messageId);
        return { success: true, messageId: result.messageId, provider: 'brevo-rest' };
      } else {
        restApiError = result.message || 'Brevo REST API error';
        console.warn('⚠️ REST API returned non-OK, falling back to SMTP relay:', result.message);
        if (result.message && result.message.includes('authorised_ips')) {
          console.warn('🔒 Brevo IP restriction: Add outgoing IP to https://app.brevo.com/security/authorised_ips');
        }
      }
    } catch (restErr) {
      restApiError = restErr.message;
      console.warn('⚠️ REST API error, falling back to SMTP relay:', restErr.message);
    }
  }

  // Strategy 2: Brevo SMTP Relay fallback
  if (smtpUser && smtpKey) {
    try {
      console.log('🚀 Sending via Brevo SMTP relay (smtp-relay.brevo.com:587)...');
      const transporter = nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpKey
        }
      });

      const mailOptions = {
        from: `"${process.env.SENDER_NAME || 'NeuroHire AI'}" <${process.env.SENDER_EMAIL || 'neurohireaiplatform@gmail.com'}>`,
        to,
        subject,
        html,
        text: text || subject
      };

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments.map(att => ({
          filename: att.name,
          content: Buffer.from(att.content, 'base64')
        }));
      }

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email delivered via Brevo SMTP! MessageId:', info.messageId);
      return { success: true, messageId: info.messageId, provider: 'brevo-smtp' };
    } catch (smtpErr) {
      smtpError = smtpErr.message;
      console.error('❌ Brevo SMTP failed:', smtpErr.message);
    }
  }

  const finalError = restApiError || smtpError || 'No valid Brevo credentials available.';
  return {
    success: false,
    error: finalError,
    details: {
      restApiError,
      smtpError,
      isIpRestriction: !!(restApiError && restApiError.includes('authorised_ips'))
    }
  };
};

export const verifyBrevoConnection = async () => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  if (!BREVO_API_KEY) {
    return {
      connected: false,
      message: 'BREVO_API_KEY is not configured in .env'
    };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'api-key': BREVO_API_KEY
      }
    });

    const data = await response.json();
    if (response.ok) {
      return {
        connected: true,
        email: data.email,
        companyName: data.companyName,
        plan: data.plan,
        relay: data.relay
      };
    } else {
      return {
        connected: false,
        code: data.code,
        message: data.message,
        isIpRestriction: !!(data.message && data.message.includes('authorised_ips'))
      };
    }
  } catch (err) {
    return {
      connected: false,
      message: err.message
    };
  }
};

// Email Templates
const emailTemplates = {
  welcome: (name) => ({
    subject: 'Welcome to NeuroHire AI!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to NeuroHire AI!</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Hello ${name},</p>
          <p style="font-size: 16px; color: #333;">Your profile has been successfully created on NeuroHire AI! 🎉</p>
          <p style="font-size: 16px; color: #333;">With your new profile, you can:</p>
          <ul style="color: #333;">
            <li>Browse and apply for AI-powered interview opportunities</li>
            <li>Take technical assessments and coding challenges</li>
            <li>Track your application status in real-time</li>
            <li>Get AI-powered insights on your interview performance</li>
          </ul>
          <p style="font-size: 16px; color: #333;">Log in to your dashboard to explore available opportunities and start your journey!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/login" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Go to Dashboard</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The NeuroHire AI Team</p>
        </div>
      </div>
    `,
    text: `Welcome to NeuroHire AI! Hello ${name}, Your profile has been successfully created on NeuroHire AI! With your new profile, you can browse and apply for AI-powered interview opportunities, take technical assessments, track your application status, and get AI-powered insights. Log in to your dashboard to explore available opportunities. Best regards, The NeuroHire AI Team`
  }),

  applicationConfirmation: (candidateName, jobTitle, companyName) => ({
    subject: `Application Submitted: ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #fc466b 0%, #3f5efb 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Application Submitted! ✅</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Hello ${candidateName},</p>
          <p style="font-size: 16px; color: #333;">Your application for <strong>${jobTitle}</strong> at <strong>${companyName}</strong> has been successfully submitted!</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">What happens next?</h3>
            <ul style="color: #333;">
              <li>Your application will be reviewed by the hiring team</li>
              <li>You'll receive updates on your application status</li>
              <li>If selected, you'll be invited for technical assessments</li>
              <li>Final candidates will be invited for AI-powered interviews</li>
            </ul>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The NeuroHire AI Team</p>
        </div>
      </div>
    `,
    text: `Application Submitted! Hello ${candidateName}, Your application for ${jobTitle} at ${companyName} has been successfully submitted! Your application will be reviewed by the hiring team and you'll receive updates on your status. Best regards, The NeuroHire AI Team`
  }),

  selectionEmail: (candidateName, jobTitle, companyName, applicationId = '', frontendUrl = 'http://localhost:5173') => {
    const acceptUrl = `${frontendUrl}/candidate/offer-response?appId=${encodeURIComponent(applicationId)}&action=accept`;
    const rejectUrl = `${frontendUrl}/candidate/offer-response?appId=${encodeURIComponent(applicationId)}&action=reject`;

    return {
      subject: `Congratulations! You've been selected for ${jobTitle} 🚀`,
      html: `
        <div style="font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 26px;">Congratulations! 🚀</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 15px;">Official Selection & Job Offer</p>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hello <strong>${candidateName}</strong>,</p>
            <p style="font-size: 17px; color: #11998e; font-weight: bold;">
              Great news! You have been selected for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>!
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
              <h3 style="color: #333; margin-top: 0;">Next Steps upon Acceptance:</h3>
              <ul style="color: #444; line-height: 1.8;">
                <li><strong>Recruiter Messenger Unlocked:</strong> Direct 1-on-1 chat with your recruiter and hiring manager</li>
                <li>Complete official joining paperwork</li>
                <li>Prepare for onboarding</li>
                <li>Welcome to the team!</li>
              </ul>
            </div>
            
            <p style="font-size: 15px; font-weight: bold; color: #222; text-align: center; margin: 25px 0 15px 0;">
              Please confirm your decision below to activate recruiter messaging:
            </p>

            <div style="text-align: center; margin: 25px 0 30px 0;">
              <a href="${acceptUrl}" style="display: inline-block; background: #10b981; color: #ffffff; padding: 14px 32px; font-size: 16px; font-weight: bold; text-decoration: none; border-radius: 6px; margin: 0 8px 10px 8px; box-shadow: 0 3px 10px rgba(16,185,129,0.3);">
                ✅ Accept Offer
              </a>
              <a href="${rejectUrl}" style="display: inline-block; background: #f3f4f6; color: #6b7280; padding: 14px 26px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; margin: 0 8px 10px 8px; border: 1px solid #d1d5db;">
                Decline Offer
              </a>
            </div>

            <p style="font-size: 13px; color: #6b7280; text-align: center; line-height: 1.5;">
              Clicking <strong>Accept Offer</strong> will immediately verify your decision and open the direct recruiter chat window in your dashboard.
            </p>

            <p style="font-size: 14px; color: #666; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
              Best regards,<br>
              <strong>The ${companyName} Team</strong>
            </p>
          </div>
        </div>
      `,
      text: `Congratulations! Hello ${candidateName}, Great news! You have been selected for the position of ${jobTitle} at ${companyName}! Please confirm your decision: Accept: ${acceptUrl} | Decline: ${rejectUrl}. Best regards, The ${companyName} Team`
    };
  },

  rejectionEmail: (candidateName, jobTitle, companyName) => ({
    subject: `Update on your application for ${jobTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Application Update</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Hello ${candidateName},</p>
          <p style="font-size: 16px; color: #333;">Thank you for your interest in the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.</p>
          <p style="font-size: 16px; color: #333;">After careful consideration, we regret to inform you that we have decided to move forward with other candidates for this position.</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Don't be discouraged!</h3>
            <p style="color: #333;">This decision doesn't reflect on your potential. Continue to:</p>
            <ul style="color: #333;">
              <li>Apply for other opportunities on NeuroHire AI</li>
              <li>Keep improving your skills through our practice assessments</li>
              <li>Stay engaged with your professional development</li>
            </ul>
          </div>
          <p style="font-size: 16px; color: #333;">We appreciate the time you invested in the application process and wish you the best in your job search.</p>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The ${companyName} Team</p>
        </div>
      </div>
    `,
    text: `Application Update. Hello ${candidateName}, Thank you for your interest in the ${jobTitle} position at ${companyName}. After careful consideration, we regret to inform you that we have decided to move forward with other candidates. This decision doesn't reflect on your potential. Continue applying for other opportunities and improving your skills. We appreciate your time and wish you the best. Best regards, The ${companyName} Team`
  }),

  interviewInvitation: (candidateName, jobTitle, companyName, interviewDate, interviewLink) => ({
    subject: `Interview Invitation: ${jobTitle} at ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Interview Invitation! 🎯</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Hello ${candidateName},</p>
          <p style="font-size: 16px; color: #333;">We're pleased to invite you for an interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>!</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #333; margin-top: 0;">Interview Details:</h3>
            <p style="color: #333;"><strong>Date:</strong> ${new Date(interviewDate).toLocaleString()}</p>
            ${interviewLink ? `<p style="color: #333;"><strong>Interview Link:</strong> <a href="${interviewLink}" style="color: #667eea;">${interviewLink}</a></p>` : ''}
          </div>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Before the Interview:</h3>
            <ul style="color: #333;">
              <li>Test your camera and microphone</li>
              <li>Ensure stable internet connection</li>
              <li>Find a quiet, well-lit space</li>
              <li>Have your resume ready</li>
              <li>Prepare questions for the interviewer</li>
            </ul>
          </div>
          ${interviewLink ? `<div style="text-align: center; margin: 30px 0;">
            <a href="${interviewLink}" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Join Interview</a>
          </div>` : ''}
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Good luck!<br>The ${companyName} Team</p>
        </div>
      </div>
    `,
    text: `Interview Invitation! Hello ${candidateName}, We're pleased to invite you for an interview for the ${jobTitle} position at ${companyName}! Date: ${new Date(interviewDate).toLocaleString()}. ${interviewLink ? `Interview Link: ${interviewLink}` : ''} Before the interview, test your camera and microphone, ensure stable internet, find a quiet space, and have your resume ready. Good luck! The ${companyName} Team`
  })
};

// Specific email functions
export const sendWelcomeEmail = async (to, name) => {
  const template = emailTemplates.welcome(name);
  return sendEmail({ to, ...template });
};

export const sendApplicationConfirmation = async (to, candidateName, jobTitle, companyName) => {
  const template = emailTemplates.applicationConfirmation(candidateName, jobTitle, companyName);
  return sendEmail({ to, ...template });
};

export const sendSelectionEmail = async (to, candidateName, jobTitle, companyName, applicationId = '', frontendUrl = 'http://localhost:5173') => {
  console.log('🚀 sendSelectionEmail called with:');
  console.log('  - to:', to);
  console.log('  - candidateName:', candidateName);
  console.log('  - jobTitle:', jobTitle);
  console.log('  - companyName:', companyName);
  console.log('  - applicationId:', applicationId);
  console.log('  - frontendUrl:', frontendUrl);
  const template = emailTemplates.selectionEmail(candidateName, jobTitle, companyName, applicationId, frontendUrl);
  console.log('  - Template subject:', template.subject);
  console.log('  - Template HTML length:', template.html?.length || 0);
  return sendEmail({ to, ...template });
};

export const sendRejectionEmail = async (to, candidateName, jobTitle, companyName) => {
  const template = emailTemplates.rejectionEmail(candidateName, jobTitle, companyName);
  return sendEmail({ to, ...template });
};

export const sendInterviewInvitation = async (to, candidateName, jobTitle, companyName, interviewDate, interviewLink) => {
  const template = emailTemplates.interviewInvitation(candidateName, jobTitle, companyName, interviewDate, interviewLink);
  return sendEmail({ to, ...template });
};

export default sendEmail;
export { emailTemplates };
