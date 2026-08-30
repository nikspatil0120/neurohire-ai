import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  problemId: {
    type: String,
    required: true,
    index: true
  },
  problemTitle: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['Accepted', 'Rejected'],
    required: true
  },
  language: {
    type: String,
    required: true,
    enum: ['python', 'java', 'cpp', 'c']
  },
  code: {
    type: String,
    required: true
  },
  testResults: [{
    input: String,
    expected: String,
    actual: String,
    passed: Boolean,
    error: String,
    status: String
  }],
  summary: {
    passed: Number,
    total: Number,
    percentage: Number
  },
  attemptNumber: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Compound index for efficient querying
submissionSchema.index({ userId: 1, problemId: 1, timestamp: -1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
