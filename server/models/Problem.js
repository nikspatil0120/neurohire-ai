import mongoose from 'mongoose';

const inputSchema = new mongoose.Schema({
  value: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['int', 'int[]', 'string', 'string[]', 'long', 'double'],
    required: true 
  },
  description: { type: String, default: '' }
});

const testCaseSchema = new mongoose.Schema({
  inputs: [inputSchema],
  expectedOutput: { type: String, default: '' },
  visibility: { type: String, enum: ['visible', 'hidden'], default: 'visible' }
});

const parameterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }
});

const functionSignatureSchema = new mongoose.Schema({
  functionName: { type: String, default: '' },
  returnType: { type: String, default: '' },
  parameters: [parameterSchema]
});

const codeTemplateSchema = new mongoose.Schema({
  python: { type: String, default: '' },
  java: { type: String, default: '' },
  cpp: { type: String, default: '' },
  c: { type: String, default: '' }
});

const exampleSchema = new mongoose.Schema({
  input: { type: String },
  output: { type: String },
  explanation: { type: String }
});

const statsSchema = new mongoose.Schema({
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  acceptance: { type: String, default: '0%' },
  submissions: { type: String, default: '0' }
});

const problemSchema = new mongoose.Schema({
  serialNumber: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  difficulty: { 
    type: String, 
    enum: ['Easy', 'Medium', 'Hard'],
    required: true 
  },
  tags: [{ type: String }],
  companies: [{ type: String }],
  description: { type: String, required: true },
  examples: [exampleSchema],
  constraints: [{ type: String }],
  testCases: [testCaseSchema],
  codeTemplates: { type: codeTemplateSchema, default: {} },
  functionSignatures: {
    python: { type: functionSignatureSchema },
    java: { type: functionSignatureSchema },
    cpp: { type: functionSignatureSchema },
    c: { type: functionSignatureSchema }
  },
  stats: { type: statsSchema, default: {} },
  published: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
problemSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Problem = mongoose.model('Problem', problemSchema);

export default Problem;
