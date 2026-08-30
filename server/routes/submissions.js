import express from 'express';
const router = express.Router();
import Submission from '../models/Submission.js';

// Get all submissions for a user and problem
router.get('/:userId/:problemId', async (req, res) => {
  try {
    const { userId, problemId } = req.params;
    
    const submissions = await Submission.find({ 
      userId, 
      problemId 
    })
    .sort({ timestamp: -1 })
    .lean();

    res.json({
      success: true,
      submissions,
      count: submissions.length
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
});

// Get all submissions for a user (across all problems)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const submissions = await Submission.find({ userId })
    .sort({ timestamp: -1 })
    .lean();

    res.json({
      success: true,
      submissions,
      count: submissions.length
    });
  } catch (error) {
    console.error('Error fetching user submissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
});

// Create a new submission
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      problemId,
      problemTitle,
      status,
      language,
      code,
      testResults,
      summary,
      attemptNumber
    } = req.body;

    // Validate required fields
    if (!userId || !problemId || !problemTitle || !status || !language || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const submission = new Submission({
      userId,
      problemId,
      problemTitle,
      status,
      language,
      code,
      testResults: testResults || [],
      summary: summary || {},
      attemptNumber: attemptNumber || 1
    });

    await submission.save();

    res.status(201).json({
      success: true,
      message: 'Submission saved successfully',
      submission: {
        id: submission._id,
        ...submission.toObject()
      }
    });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save submission',
      error: error.message
    });
  }
});

// Get submission statistics for a user
router.get('/:userId/stats', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const totalSubmissions = await Submission.countDocuments({ userId });
    const acceptedSubmissions = await Submission.countDocuments({ 
      userId, 
      status: 'Accepted' 
    });
    
    const uniqueProblems = await Submission.distinct('problemId', { userId });
    const solvedProblems = await Submission.distinct('problemId', { 
      userId, 
      status: 'Accepted' 
    });

    res.json({
      success: true,
      stats: {
        totalSubmissions,
        acceptedSubmissions,
        rejectedSubmissions: totalSubmissions - acceptedSubmissions,
        totalProblems: uniqueProblems.length,
        solvedProblems: solvedProblems.length,
        acceptanceRate: totalSubmissions > 0 
          ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching submission stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Delete a submission
router.delete('/:submissionId', async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    const submission = await Submission.findByIdAndDelete(submissionId);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting submission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete submission',
      error: error.message
    });
  }
});

export default router;
