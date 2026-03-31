import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

class FullCompilerService {
  constructor() {
    this.docker = new Docker();
    // Use OS-appropriate temp directory
    this.tempDir = process.platform === 'win32' 
      ? path.join(os.tmpdir(), 'neurohire-executions')
      : '/tmp/neurohire-executions';
  }

  async executeProgram(code, language, input, timeLimit = 5, memoryLimit = 128) {
    const executionId = uuidv4();
    const workDir = path.join(this.tempDir, executionId);
    
    try {
      // Create workspace
      await fs.mkdir(workDir, { recursive: true });
      
      // Write code and input files
      const { codeFile, inputFile } = await this.prepareFiles(workDir, code, language, input);
      
      // Execute in Docker container
      const result = await this.runInContainer(workDir, codeFile, language, inputFile, timeLimit, memoryLimit);
      
      // Cleanup
      await this.cleanup(workDir);
      
      return result;
      
    } catch (error) {
      await this.cleanup(workDir);
      throw error;
    }
  }

  async prepareFiles(workDir, code, language, input) {
    const languageConfig = {
      python: { extension: '.py', filename: 'solution.py' },
      java: { extension: '.java', filename: 'Solution.java' },
      cpp: { extension: '.cpp', filename: 'solution.cpp' },
      c: { extension: '.c', filename: 'solution.c' }
    };

    const config = languageConfig[language];
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const codeFile = path.join(workDir, config.filename);
    const inputFile = path.join(workDir, 'input.txt');

    await fs.writeFile(codeFile, code);
    await fs.writeFile(inputFile, input);

    return { codeFile: config.filename, inputFile: 'input.txt' };
  }

  async runInContainer(workDir, codeFile, language, inputFile, timeLimit, memoryLimit) {
    const commands = this.getExecutionCommands(language, codeFile);
    
    const container = await this.docker.createContainer({
      Image: 'neurohire-compiler:latest', // Your custom image with all compilers
      Cmd: ['sh', '-c', commands.join(' && ')],
      WorkingDir: '/workspace',
      HostConfig: {
        Memory: memoryLimit * 1024 * 1024,
        CpuQuota: 50000, // 50% CPU
        NetworkMode: 'none',
        ReadonlyRootfs: false, // Need write access for compilation
        Binds: [`${workDir}:/workspace`],
        Tmpfs: { '/tmp': 'rw,noexec,nosuid,size=50m' }
      },
      User: 'compiler', // Non-root user
      AttachStdout: true,
      AttachStderr: true,
      AttachStdin: false
    });

    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true
    });

    let output = '';
    let error = '';

    stream.on('data', (chunk) => {
      const data = chunk.toString();
      if (chunk[0] === 1) { // stdout
        output += data.slice(8);
      } else if (chunk[0] === 2) { // stderr
        error += data.slice(8);
      }
    });

    await container.start();

    // Handle timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Execution timeout')), timeLimit * 1000);
    });

    try {
      const result = await Promise.race([container.wait(), timeoutPromise]);
      
      return {
        output: output.trim(),
        error: error.trim(),
        exitCode: result.StatusCode,
        status: result.StatusCode === 0 ? 'success' : 'error'
      };
      
    } catch (error) {
      await container.kill();
      return {
        output: '',
        error: 'Execution timeout',
        exitCode: -1,
        status: 'timeout'
      };
    } finally {
      await container.remove();
    }
  }

  getExecutionCommands(language, codeFile) {
    const commands = {
      python: [
        `python3 ${codeFile} < input.txt`
      ],
      java: [
        `javac ${codeFile}`,
        `java Solution < input.txt`
      ],
      cpp: [
        `g++ -o solution ${codeFile} -std=c++17`,
        `./solution < input.txt`
      ],
      c: [
        `gcc -o solution ${codeFile}`,
        `./solution < input.txt`
      ]
    };

    return commands[language] || [];
  }

  async cleanup(workDir) {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }
}

export default FullCompilerService;