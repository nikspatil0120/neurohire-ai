import express from 'express';
import FullCompilerService from '../services/fullCompilerService.js';
import TestHarnessGenerator from '../services/testHarnessGenerator.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const compilerService = new FullCompilerService();
const harnessGenerator = new TestHarnessGenerator();

// Validation middleware
const validateExecution = [
  body('code').notEmpty().withMessage('Code is required'),
  body('language').isIn(['python', 'java', 'cpp', 'c']).withMessage('Invalid language'),
  body('input').optional().isString(),
  body('timeLimit').optional().isInt({ min: 1, max: 120 }).withMessage('Time limit must be between 1-120 seconds'),
  body('memoryLimit').optional().isInt({ min: 32, max: 512 }).withMessage('Memory limit must be between 32-512 MB')
];

// Execute code endpoint
router.post('/execute', validateExecution, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { code, language, input = '', timeLimit = 5, memoryLimit = 128 } = req.body;

    // Security checks
    if (code.length > 50000) {
      return res.status(400).json({
        success: false,
        message: 'Code too long (max 50KB)'
      });
    }

    // Execute the program
    const result = await compilerService.executeProgram(
      code,
      language,
      input,
      timeLimit,
      memoryLimit
    );

    res.json({
      success: true,
      result: {
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        status: result.status,
        executionTime: 0, // TODO: Implement timing
        memoryUsed: 0     // TODO: Implement memory tracking
      }
    });

  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Execution failed',
      error: error.message
    });
  }
});

// Test multiple inputs endpoint
router.post('/test', validateExecution, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { code, language, testCases, functionSignature, timeLimit = 5, memoryLimit = 128 } = req.body;

    if (!Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Test cases are required'
      });
    }

    const results = [];

    for (const testCase of testCases) {
      try {
        // Determine if we need to wrap the code
        let finalCode = code;
        let testInput = testCase.input || '';
        
        // If functionSignature and typed inputs are provided, generate wrapper
        if (functionSignature && testCase.inputs && Array.isArray(testCase.inputs)) {
          const inputTypes = testCase.inputs.map(inp => inp.type);
          const inputValues = testCase.inputs.map(inp => inp.value).join('\n');
          
          finalCode = harnessGenerator.generateWrapper(
            code,
            language,
            functionSignature,
            inputTypes
          );
          
          testInput = inputValues;
        }
        
        const result = await compilerService.executeProgram(
          finalCode,
          language,
          testInput,
          timeLimit,
          memoryLimit
        );

        const passed = result.status === 'success' && 
                      result.output.trim() === testCase.expectedOutput.trim();

        results.push({
          input: testInput,
          expectedOutput: testCase.expectedOutput,
          actualOutput: result.output.trim(),
          passed,
          error: result.error,
          status: result.status
        });

      } catch (error) {
        results.push({
          input: testCase.input || '',
          expectedOutput: testCase.expectedOutput,
          actualOutput: '',
          passed: false,
          error: error.message,
          status: 'error'
        });
      }
    }

    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    res.json({
      success: true,
      results,
      summary: {
        passed: passedCount,
        total: totalCount,
        percentage: Math.round((passedCount / totalCount) * 100)
      }
    });

  } catch (error) {
    console.error('Test execution error:', error);
    res.status(500).json({
      success: false,
      message: 'Test execution failed',
      error: error.message
    });
  }
});

export default router;