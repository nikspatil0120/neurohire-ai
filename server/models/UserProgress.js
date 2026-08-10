import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  solvedProblems: [{
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true
    },
    solvedAt: {
      type: Date,
      default: Date.now
    },
    attempts: {
      type: Number,
      default: 1
    }
  }],
  attemptedProblems: [{
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Problem',
      required: true
    },
    firstAttemptAt: {
      type: Date,
      default: Date.now
    },
    lastAttemptAt: {
      type: Date,
      default: Date.now
    },
    runCount: {
      type: Number,
      default: 1
    }
  }],
  totalSolved: {
    type: Number,
    default: 0
  },
  totalAttempted: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
userProgressSchema.index({ userId: 1 });
userProgressSchema.index({ userId: 1, 'solvedProblems.problemId': 1 });
userProgressSchema.index({ userId: 1, 'attemptedProblems.problemId': 1 });

const UserProgress = mongoose.model('UserProgress', userProgressSchema);

export default UserProgress;
