import express from 'express';
import Problem from '../models/Problem.js';

const router = express.Router();

// Get all problems
router.get('/', async (req, res) => {
  try {
    const { published_only } = req.query;
    const query = published_only ? { published: true } : {};
    const problems = await Problem.find(query).sort({ serialNumber: 1 });
    // Map _id to id for frontend compatibility
    const mappedProblems = problems.map(p => ({
      ...p.toObject(),
      id: p._id.toString()
    }));
    res.json(mappedProblems);
  } catch (error) {
    console.error('Error fetching problems:', error);
    res.status(500).json({ success: false, message: 'Error fetching problems' });
  }
});

// Get single problem by ID
router.get('/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }
    // Map _id to id for frontend compatibility
    const mappedProblem = {
      ...problem.toObject(),
      id: problem._id.toString()
    };
    res.json(mappedProblem);
  } catch (error) {
    console.error('Error fetching problem:', error);
    res.status(500).json({ success: false, message: 'Error fetching problem' });
  }
});

// Create new problem
router.post('/', async (req, res) => {
  try {
    // Get the highest serial number and increment by 1
    const lastProblem = await Problem.findOne().sort({ serialNumber: -1 });
    const nextSerialNumber = lastProblem ? lastProblem.serialNumber + 1 : 1;

    const problem = new Problem({
      ...req.body,
      serialNumber: nextSerialNumber
    });
    await problem.save();
    // Map _id to id for frontend compatibility
    const mappedProblem = {
      ...problem.toObject(),
      id: problem._id.toString()
    };
    res.json(mappedProblem);
  } catch (error) {
    console.error('Error creating problem:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.keys(error.errors).map(field => ({
          field,
          message: error.errors[field].message
        }))
      });
    }
    res.status(500).json({ success: false, message: 'Error creating problem' });
  }
});

// Update problem
router.put('/:id', async (req, res) => {
  try {
    const problem = await Problem.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }
    // Map _id to id for frontend compatibility
    const mappedProblem = {
      ...problem.toObject(),
      id: problem._id.toString()
    };
    res.json(mappedProblem);
  } catch (error) {
    console.error('Error updating problem:', error);
    res.status(500).json({ success: false, message: 'Error updating problem' });
  }
});

// Toggle publish status
router.patch('/:id/publish', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }
    problem.published = !problem.published;
    await problem.save();
    // Map _id to id for frontend compatibility
    const mappedProblem = {
      ...problem.toObject(),
      id: problem._id.toString()
    };
    res.json(mappedProblem);
  } catch (error) {
    console.error('Error toggling publish status:', error);
    res.status(500).json({ success: false, message: 'Error toggling publish status' });
  }
});

// Delete problem
router.delete('/:id', async (req, res) => {
  try {
    const problem = await Problem.findByIdAndDelete(req.params.id);
    if (!problem) {
      return res.status(404).json({ success: false, message: 'Problem not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting problem:', error);
    res.status(500).json({ success: false, message: 'Error deleting problem' });
  }
});

export default router;
