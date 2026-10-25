import express from 'express';
import sendEmail, { 
  sendWelcomeEmail, 
  sendApplicationConfirmation, 
  sendSelectionEmail, 
  sendRejectionEmail, 
  sendInterviewInvitation,
  verifyBrevoConnection 
} from '../services/emailService.js';

const router = express.Router();

// Check email service health and status
router.get('/status', async (req, res) => {
  try {
    const brevoStatus = await verifyBrevoConnection();
    res.json({
      success: true,
      service: 'Brevo Email Service',
      configured: {
        apiKeySet: !!process.env.BREVO_API_KEY,
        smtpUserSet: !!process.env.BREVO_SMTP_USER,
        smtpKeySet: !!process.env.BREVO_SMTP_KEY,
        senderEmail: process.env.SENDER_EMAIL || 'neurohireaiplatform@gmail.com',
        senderName: process.env.SENDER_NAME || 'NeuroHire AI'
      },
      brevoConnection: brevoStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send test email
router.post('/test', async (req, res) => {
  try {
    const to = req.body.to || process.env.SENDER_EMAIL || 'neurohireaiplatform@gmail.com';
    const result = await sendEmail({
      to,
      subject: 'NeuroHire AI - Brevo Email Service Verification',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 8px 8px 0 0; text-align: center; color: white;">
            <h2 style="margin: 0;">NeuroHire AI Email Service</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Integration Verification Test</p>
          </div>
          <div style="background: #fdfdfd; padding: 25px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
            <p>Hello,</p>
            <p>This is a verification email confirming that your Brevo Email API key is active and successfully integrated with NeuroHire AI!</p>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px;">
              <strong>Status:</strong> Active & Delivering<br/>
              <strong>Timestamp:</strong> ${new Date().toISOString()}<br/>
              <strong>Sender:</strong> ${process.env.SENDER_NAME || 'NeuroHire AI'} (${process.env.SENDER_EMAIL || 'neurohireaiplatform@gmail.com'})
            </div>
            <p style="margin-top: 20px; font-size: 13px; color: #64748b;">
              NeuroHire AI automated notifications: Welcome emails, application updates, selection letters, and recruiter messaging alerts.
            </p>
          </div>
        </div>
      `,
      text: `NeuroHire AI Email Service Verification: Your Brevo API key is properly integrated and working as expected! Timestamp: ${new Date().toISOString()}`
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Test email successfully sent to ${to}`,
        messageId: result.messageId,
        provider: result.provider
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email',
        error: result.error,
        details: result.details
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send email endpoint
router.post('/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    // Validate required fields
    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to and subject are required'
      });
    }

    // Send email
    const result = await sendEmail({ to, subject, html, text });

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Email route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send welcome email
router.post('/welcome', async (req, res) => {
  try {
    const { to, name } = req.body;

    if (!to || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to and name are required'
      });
    }

    const result = await sendWelcomeEmail(to, name);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Welcome email sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send welcome email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Welcome email route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send interview invitation
router.post('/interview-invitation', async (req, res) => {
  try {
    const { to, candidateName, jobTitle, companyName, interviewDate, interviewLink } = req.body;

    if (!to || !candidateName || !jobTitle || !companyName || !interviewDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, candidateName, jobTitle, companyName, and interviewDate are required'
      });
    }

    const result = await sendInterviewInvitation(to, candidateName, jobTitle, companyName, interviewDate, interviewLink);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Interview invitation sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send interview invitation',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Interview invitation route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send application confirmation email
router.post('/application-confirmation', async (req, res) => {
  try {
    const { to, candidateName, jobTitle, companyName } = req.body;

    if (!to || !candidateName || !jobTitle || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, candidateName, jobTitle, and companyName are required'
      });
    }

    const result = await sendApplicationConfirmation(to, candidateName, jobTitle, companyName);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Application confirmation sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send application confirmation',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Application confirmation route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send selection email
router.post('/selection', async (req, res) => {
  try {
    const { to, candidateName, jobTitle, companyName, applicationId, frontendUrl } = req.body;

    if (!to || !candidateName || !jobTitle || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, candidateName, jobTitle, and companyName are required'
      });
    }

    const result = await sendSelectionEmail(
      to,
      candidateName,
      jobTitle,
      companyName,
      applicationId || '',
      frontendUrl || 'http://localhost:5173'
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Selection email sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send selection email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Selection email route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send rejection email
router.post('/rejection', async (req, res) => {
  try {
    const { to, candidateName, jobTitle, companyName } = req.body;

    if (!to || !candidateName || !jobTitle || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, candidateName, jobTitle, and companyName are required'
      });
    }

    const result = await sendRejectionEmail(to, candidateName, jobTitle, companyName);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Rejection email sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send rejection email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Rejection email route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Send custom email with attachments
router.post('/custom', async (req, res) => {
  try {
    const { to, subject, html, text, attachments } = req.body;

    console.log('📧 Custom email route received:');
    console.log('  - to:', to);
    console.log('  - subject:', subject);
    console.log('  - html length:', html?.length || 0);
    console.log('  - text length:', text?.length || 0);
    console.log('  - html preview:', html?.substring(0, 200) || 'No HTML');
    console.log('  - attachments:', attachments?.length || 0);

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to and subject are required'
      });
    }

    // Prepare email data with attachments
    const emailData = {
      to,
      subject,
      html: html,
      text: text || subject,
      attachments: attachments || []
    };

    const result = await sendEmail(emailData);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Custom email sent successfully',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send custom email',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Custom email route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;