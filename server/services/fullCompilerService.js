import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

class FullCompilerService {
  constructor() {
    this.docker = new Docker();
    this.tempDir = process.platform === 'win32'
      ? path.join(os.tmpdir(), 'neurohire-executions')
      : '/tmp/neurohire-executions';
  }

  async executeProgram(code, language, input, timeLimit = 5, memoryLimit = 128) {
    const executionId = uuidv4();
    const workDir = path.join(this.tempDir, executionId);

    try {
      await fs.mkdir(workDir, { recursive: true });
      const { codeFile } = await this.prepareFiles(workDir, code, language, input);
      const result = await this.runInContainer(workDir, codeFile, language, timeLimit, memoryLimit);
      await this.cleanup(workDir);
      return result;
    } catch (error) {
      await this.cleanup(workDir);
      throw error;
    }
  }

  async prepareFiles(workDir, code, language, input) {
    const languageConfig = {
      python: { filename: 'solution.py' },
      java:   { filename: 'Main.java' },
      cpp:    { filename: 'solution.cpp' },
      c:      { filename: 'solution.c' }
    };

    const config = languageConfig[language];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const codeFile  = path.join(workDir, config.filename);
    const inputFile = path.join(workDir, 'input.txt');

    await fs.writeFile(codeFile,  code,        'utf8');
    await fs.writeFile(inputFile, input || '',  'utf8');

    return { codeFile: config.filename };
  }

  // Build the shell command that runs inside the container.
  // stdout  → output.txt
  // stderr  → error.txt
  // exit code → exit_code.txt
  getExecutionCommand(language, codeFile) {
    const cmds = {
      python: `python3 ${codeFile} < input.txt > output.txt 2>error.txt`,

      // javac writes errors to stderr; java reads stdin from input.txt
      java: `javac ${codeFile} 2>error.txt && java -cp . Main < input.txt > output.txt 2>>error.txt`,

      cpp: `g++ -O2 -o solution ${codeFile} -std=c++17 2>error.txt && ./solution < input.txt > output.txt 2>>error.txt`,

      c: `gcc -O2 -o solution ${codeFile} 2>error.txt && ./solution < input.txt > output.txt 2>>error.txt`
    };

    return cmds[language] ?? null;
  }

  async runInContainer(workDir, codeFile, language, timeLimit, memoryLimit) {
    const command = this.getExecutionCommand(language, codeFile);

    if (!command) {
      return { output: '', error: 'Unsupported language', exitCode: 1, status: 'error' };
    }

    // Wrap command so we always capture the exit code in a file.
    // Using "|| true" prevents the shell from stopping on compile error
    // (we still capture the exit code manually).
    const shellCmd = `(${command}); echo $? > exit_code.txt`;

    let container;

    try {
      container = await this.docker.createContainer({
        Image: 'neurohire-compiler:latest',
        Cmd: ['sh', '-c', shellCmd],
        WorkingDir: '/workspace',
        HostConfig: {
          Memory:     memoryLimit * 1024 * 1024,
          MemorySwap: memoryLimit * 1024 * 1024, // no swap
          CpuQuota:   50000,                      // 50% of one CPU
          NetworkMode: 'none',                    // no network access
          Binds: [`${workDir}:/workspace`],
        },
        // Don't attach streams — we read from files after execution
        AttachStdout: false,
        AttachStderr: false,
      });

      await container.start();

      // Race: wait for container to finish vs timeout
      let timedOut = false;
      try {
        await Promise.race([
          container.wait(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), timeLimit * 1000)
          )
        ]);
      } catch (e) {
        if (e.message === 'timeout') {
          timedOut = true;
          try { await container.kill(); } catch (_) { /* already dead */ }
        } else {
          throw e;
        }
      }

      if (timedOut) {
        return {
          output:   '',
          error:    'Time Limit Exceeded',
          exitCode: -1,
          status:   'timeout'
        };
      }

      // ── Read files written inside the container ──────────────────────────
      let output   = '';
      let error    = '';
      let exitCode = 1;

      try {
        output = await fs.readFile(path.join(workDir, 'output.txt'), 'utf8');
      } catch (_) { /* file may not exist on compile error */ }

      try {
        error = await fs.readFile(path.join(workDir, 'error.txt'), 'utf8');
      } catch (_) {}

      try {
        const exitStr = await fs.readFile(path.join(workDir, 'exit_code.txt'), 'utf8');
        exitCode = parseInt(exitStr.trim(), 10);
        if (isNaN(exitCode)) exitCode = 1;
      } catch (_) {}

      return {
        output:   output.trim(),
        error:    error.trim(),
        exitCode,
        status:   exitCode === 0 ? 'success' : 'error'
      };

    } finally {
      // Always remove the container even if something threw
      if (container) {
        try { await container.remove({ force: true }); } catch (_) {}
      }
    }
  }

  async cleanup(workDir) {
    try {
      await fs.rm(workDir, { recursive: true, force: true });
    } catch (e) {
      console.error('Cleanup failed:', e);
    }
  }
}

export default FullCompilerService;