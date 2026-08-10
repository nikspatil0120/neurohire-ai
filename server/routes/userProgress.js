import express from 'express';
import UserProgress from '../models/UserProgress.js';

const router = express.Router();

// Get user progress
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    let progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      progress = new UserProgress({
        userId,
        solvedProblems: [],
        attemptedProblems: [],
        totalSolved: 0,
        totalAttempted: 0
      });
      await progress.save();
    }
    
    res.json({
      success: true,
      solvedProblems: progress.solvedProblems,
      attemptedProblems: progress.attemptedProblems,
      totalSolved: progress.totalSolved,
      totalAttempted: progress.totalAttempted
    });
  } catch (error) {
    console.error('Error fetching user progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user progress'
    });
  }
});

// Mark problem as attempted (run)
router.post('/:userId/attempt', async (req, res) => {
  try {
    const { userId } = req.params;
    const { problemId } = req.body;
    
    let progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      progress = new UserProgress({
        userId,
        solvedProblems: [],
        attemptedProblems: [],
        totalSolved: 0,
        totalAttempted: 0
      });
    }
    
    // Check if problem is already attempted
    const existingAttempted = progress.attemptedProblems.find(
      ap => ap.problemId.toString() === problemId
    );
    
    // Check if problem is already solved
    const isSolved = progress.solvedProblems.some(
      sp => sp.problemId.toString() === problemId
    );
    
    if (existingAttempted) {
      // Update last attempt time and increment run count
      existingAttempted.lastAttemptAt = new Date();
      existingAttempted.runCount += 1;
    } else if (!isSolved) {
      // Add new attempted problem (only if not solved)
      progress.attemptedProblems.push({
        problemId,
        firstAttemptAt: new Date(),
        lastAttemptAt: new Date(),
        runCount: 1
      });
      progress.totalAttempted += 1;
    }
    
    await progress.save();
    
    res.json({
      success: true,
      attemptedProblems: progress.attemptedProblems,
      totalAttempted: progress.totalAttempted
    });
  } catch (error) {
    console.error('Error marking problem as attempted:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking problem as attempted'
    });
  }
});

// Mark problem as solved (submit)
router.post('/:userId/solve', async (req, res) => {
  try {
    const { userId } = req.params;
    const { problemId } = req.body;
    
    let progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      progress = new UserProgress({
        userId,
        solvedProblems: [],
        attemptedProblems: [],
        totalSolved: 0,
        totalAttempted: 0
      });
    }
    
    // Check if problem is already solved
    const existingSolved = progress.solvedProblems.find(
      sp => sp.problemId.toString() === problemId
    );
    
    // Check if problem is in attempted list
    const attemptedIndex = progress.attemptedProblems.findIndex(
      ap => ap.problemId.toString() === problemId
    );
    
    if (existingSolved) {
      // Increment attempts
      existingSolved.attempts += 1;
    } else {
      // Add new solved problem
      progress.solvedProblems.push({
        problemId,
        solvedAt: new Date(),
        attempts: 1
      });
      progress.totalSolved += 1;
      
      // Remove from attempted if it was there
      if (attemptedIndex !== -1) {
        progress.attemptedProblems.splice(attemptedIndex, 1);
        progress.totalAttempted -= 1;
      }
    }
    
    await progress.save();
    
    res.json({
      success: true,
      solvedProblems: progress.solvedProblems,
      attemptedProblems: progress.attemptedProblems,
      totalSolved: progress.totalSolved,
      totalAttempted: progress.totalAttempted
    });
  } catch (error) {
    console.error('Error marking problem as solved:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking problem as solved'
    });
  }
});

// Check if specific problem is solved
router.get('/:userId/problem/:problemId/status', async (req, res) => {
  try {
    const { userId, problemId } = req.params;
    
    const progress = await UserProgress.findOne({ userId });
    
    if (!progress) {
      return res.json({
        success: true,
        isSolved: false,
        isAttempted: false
      });
    }
    
    const solvedProblem = progress.solvedProblems.find(
      sp => sp.problemId.toString() === problemId
    );
    
    const attemptedProblem = progress.attemptedProblems.find(
      ap => ap.problemId.toString() === problemId
    );
    
    res.json({
      success: true,
      isSolved: !!solvedProblem,
      isAttempted: !!attemptedProblem,
      solvedAt: solvedProblem?.solvedAt,
      attempts: solvedProblem?.attempts || 0,
      runCount: attemptedProblem?.runCount || 0
    });
  } catch (error) {
    console.error('Error checking problem status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking problem status'
    });
  }
});

export default router;
