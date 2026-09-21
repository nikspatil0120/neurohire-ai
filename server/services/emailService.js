const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    
    const emailData = {
      sender: {
        name: 'NeuroHire',
        email: 'neurohireaiplatform@gmail.com'
      },
      to: [{
        email: to
      }],
      subject,
      htmlContent: html,
      textContent: text || subject
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email');
    }
    
    console.log(`✅ Email sent: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    return { success: false, error: err.message };
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
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/candidate/interviews" style="background: #fc466b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Application</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The NeuroHire AI Team</p>
        </div>
      </div>
    `,
    text: `Application Submitted! Hello ${candidateName}, Your application for ${jobTitle} at ${companyName} has been successfully submitted! Your application will be reviewed by the hiring team and you'll receive updates on your status. Track your application in your dashboard. Best regards, The NeuroHire AI Team`
  }),

  selectionEmail: (candidateName, jobTitle, companyName) => ({
    subject: `Congratulations! You've been selected for ${jobTitle} 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">Congratulations! 🎉</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; color: #333;">Hello ${candidateName},</p>
          <p style="font-size: 18px; color: #11998e; font-weight: bold;">Great news! You have been selected for the position of <strong>${jobTitle}</strong> at <strong>${companyName}</strong>!</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #11998e;">
            <h3 style="color: #333; margin-top: 0;">Next Steps:</h3>
            <ul style="color: #333;">
              <li>You'll receive an offer letter shortly</li>
              <li>Complete any required paperwork</li>
              <li>Prepare for onboarding</li>
              <li>Welcome to the team!</li>
            </ul>
          </div>
          <p style="font-size: 16px; color: #333;">This is a significant achievement, and we're excited to have you join the team!</p>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">Best regards,<br>The ${companyName} Team</p>
        </div>
      </div>
    `,
    text: `Congratulations! Hello ${candidateName}, Great news! You have been selected for the position of ${jobTitle} at ${companyName}! You'll receive an offer letter shortly and information about next steps. This is a significant achievement. Best regards, The ${companyName} Team`
  }),

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
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:3000/candidate/opportunities" style="background: #eb3349; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Explore More Opportunities</a>
          </div>
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

export const sendSelectionEmail = async (to, candidateName, jobTitle, companyName) => {
  const template = emailTemplates.selectionEmail(candidateName, jobTitle, companyName);
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