import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false }
});

const aptitudeQuestionSchema = new mongoose.Schema({
  serialNumber: { type: Number, required: true, unique: true },
  question: { type: String, required: true },
  options: [optionSchema],
  explanation: { type: String, default: '' },
  category: {
    type: String,
    enum: ['Verbal', 'Quantitative', 'Reasoning', 'Technical'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    default: 'Medium'
  },
  tags: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
aptitudeQuestionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const AptitudeQuestion = mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);

export default AptitudeQuestion;
