import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Problem from '../models/Problem.js';

dotenv.config();

async function assignSerialNumbers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/neurohire');
    console.log('Connected to MongoDB');

    // Find all problems and filter manually
    const allProblems = await Problem.find({});
    const problemsWithoutSerial = allProblems.filter(p => 
      !p.serialNumber || isNaN(p.serialNumber)
    );
    
    console.log(`Found ${problemsWithoutSerial.length} problems without valid serial numbers`);

    if (problemsWithoutSerial.length === 0) {
      console.log('All problems already have valid serial numbers');
      return;
    }

    // Get the highest existing valid serial number
    const validProblems = allProblems.filter(p => 
      p.serialNumber && !isNaN(p.serialNumber)
    );
    
    let nextSerialNumber = 1;
    if (validProblems.length > 0) {
      const maxSerial = Math.max(...validProblems.map(p => p.serialNumber));
      nextSerialNumber = maxSerial + 1;
    }

    console.log(`Starting serial number assignment from ${nextSerialNumber}`);

    // Assign serial numbers to problems that don't have them
    for (const problem of problemsWithoutSerial) {
      problem.serialNumber = nextSerialNumber;
      await problem.save();
      console.log(`Assigned serial number ${nextSerialNumber} to: ${problem.title}`);
      nextSerialNumber++;
    }

    console.log('Successfully assigned serial numbers to all problems');

  } catch (error) {
    console.error('Error assigning serial numbers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

assignSerialNumbers();
