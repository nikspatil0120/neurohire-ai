import express from 'express';
import AptitudeQuestion from '../models/AptitudeQuestion.js';

const router = express.Router();

// Get all aptitude questions
router.get('/', async (req, res) => {
  try {
    const { category, difficulty } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    
    const questions = await AptitudeQuestion.find(query).sort({ serialNumber: 1 });
    
    const mappedQuestions = questions.map(q => ({
      ...q.toObject(),
      id: q._id.toString()
    }));
    
    res.json(mappedQuestions);
  } catch (error) {
    console.error('Error fetching aptitude questions:', error);
    res.status(500).json({ success: false, message: 'Error fetching aptitude questions' });
  }
});

// Get single aptitude question by ID
router.get('/:id', async (req, res) => {
  try {
    const question = await AptitudeQuestion.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    const mappedQuestion = {
      ...question.toObject(),
      id: question._id.toString()
    };
    
    res.json(mappedQuestion);
  } catch (error) {
    console.error('Error fetching aptitude question:', error);
    res.status(500).json({ success: false, message: 'Error fetching aptitude question' });
  }
});

// Create new aptitude question
router.post('/', async (req, res) => {
  try {
    // Get the highest serial number and increment by 1
    const lastQuestion = await AptitudeQuestion.findOne().sort({ serialNumber: -1 });
    const nextSerialNumber = lastQuestion ? lastQuestion.serialNumber + 1 : 1;

    const question = new AptitudeQuestion({
      ...req.body,
      serialNumber: nextSerialNumber
    });
    
    await question.save();
    
    const mappedQuestion = {
      ...question.toObject(),
      id: question._id.toString()
    };
    
    res.json(mappedQuestion);
  } catch (error) {
    console.error('Error creating aptitude question:', error);
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
    res.status(500).json({ success: false, message: 'Error creating aptitude question' });
  }
});

// Update aptitude question
router.put('/:id', async (req, res) => {
  try {
    const question = await AptitudeQuestion.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    const mappedQuestion = {
      ...question.toObject(),
      id: question._id.toString()
    };
    
    res.json(mappedQuestion);
  } catch (error) {
    console.error('Error updating aptitude question:', error);
    res.status(500).json({ success: false, message: 'Error updating aptitude question' });
  }
});

// Delete aptitude question
router.delete('/:id', async (req, res) => {
  try {
    const question = await AptitudeQuestion.findByIdAndDelete(req.params.id);
    
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    
    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting aptitude question:', error);
    res.status(500).json({ success: false, message: 'Error deleting aptitude question' });
  }
});

export default router;
