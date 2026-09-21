import express from 'express';
import sendEmail, { sendWelcomeEmail, sendApplicationConfirmation, sendSelectionEmail, sendRejectionEmail, sendInterviewInvitation } from '../services/emailService.js';

const router = express.Router();

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
    const { to, candidateName, jobTitle, companyName } = req.body;

    if (!to || !candidateName || !jobTitle || !companyName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to, candidateName, jobTitle, and companyName are required'
      });
    }

    const result = await sendSelectionEmail(to, candidateName, jobTitle, companyName);

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

export default router;