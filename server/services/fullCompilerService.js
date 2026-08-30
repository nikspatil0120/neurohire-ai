import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

class FullCompilerService {
  constructor() {
    this.docker = new Docker();
  }

  // Pack a file into tar buffer for docker.putArchive
  async createTar(filename, content) {
    const tarStream = await import('tar-stream');
    const pack = tarStream.default.pack();
    const buf = Buffer.from(content, 'utf8');

    await new Promise((resolve, reject) => {
      pack.entry({ name: filename, size: buf.length }, buf, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    pack.finalize();

    const chunks = [];
    for await (const chunk of pack) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  // Extract a file from tar buffer returned by docker.getArchive
  async extractFromTar(tarBuffer, targetFilename) {
    const tarStream = await import('tar-stream');
    return new Promise((resolve, reject) => {
      const extract = tarStream.default.extract();
      let result = '';

      extract.on('entry', (header, stream, next) => {
        const chunks = [];
        stream.on('data', c => chunks.push(c));
        stream.on('end', () => {
          const name = header.name.split('/').pop();
          if (name === targetFilename) {
            result = Buffer.concat(chunks).toString('utf8');
          }
          next();
        });
        stream.resume();
      });

      extract.on('finish', () => resolve(result));
      extract.on('error', reject);

      Readable.from(tarBuffer).pipe(extract);
    });
  }

  // Read a file from inside the container
  async readFileFromContainer(container, filePath) {
    try {
      const stream = await container.getArchive({ path: filePath });
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const filename = filePath.split('/').pop();
      return await this.extractFromTar(Buffer.concat(chunks), filename);
    } catch (_) {
      return '';
    }
  }

  async executeProgram(code, language, input, timeLimit = 5, memoryLimit = 128) {
    const languageConfig = {
      python: { filename: 'solution.py' },
      java:   { filename: 'Main.java' },
      cpp:    { filename: 'solution.cpp' },
      c:      { filename: 'solution.c' }
    };

    const config = languageConfig[language];
    if (!config) {
      return { output: '', error: `Unsupported language: ${language}`, exitCode: 1, status: 'error' };
    }

    // Shell command: compile + run, capture everything to files
    const shellCommands = {
      python: `python3 ${config.filename} < input.txt > output.txt 2>error.txt`,
      java:   `javac ${config.filename} 2>error.txt && java -cp . Main < input.txt > output.txt 2>>error.txt`,
      cpp:    `g++ -O2 -o solution ${config.filename} -std=c++17 2>error.txt && ./solution < input.txt > output.txt 2>>error.txt`,
      c:      `gcc -O2 -o solution ${config.filename} 2>error.txt && ./solution < input.txt > output.txt 2>>error.txt`
    };

    const shellCmd = `${shellCommands[language]}; echo $? > exit_code.txt`;

    let container;

    try {
      console.log(`[Compiler] Starting: language=${language}, file=${config.filename}`);
      console.log(`[Compiler] Input: "${input}"`);

      // ── Create container (NO volume mount) ───────────────────────────────
      container = await this.docker.createContainer({
        Image: 'neurohire-compiler:latest',
        Cmd: ['sh', '-c', shellCmd],
        WorkingDir: '/workspace',
        HostConfig: {
          Memory:      memoryLimit * 1024 * 1024,
          MemorySwap:  memoryLimit * 1024 * 1024,
          CpuQuota:    50000,
          NetworkMode: 'none',
        },
        AttachStdout: false,
        AttachStderr: false,
      });

      // ── Copy code file into container ────────────────────────────────────
      const codeTar = await this.createTar(config.filename, code);
      await container.putArchive(codeTar, { path: '/workspace' });

      // ── Copy input file into container ───────────────────────────────────
      const inputTar = await this.createTar('input.txt', input || '');
      await container.putArchive(inputTar, { path: '/workspace' });

      // ── Start container ──────────────────────────────────────────────────
      await container.start();

      // ── Wait with timeout ────────────────────────────────────────────────
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
          try { await container.kill(); } catch (_) {}
        } else {
          throw e;
        }
      }

      if (timedOut) {
        console.log('[Compiler] TLE');
        return { output: '', error: 'Time Limit Exceeded', exitCode: -1, status: 'timeout' };
      }

      // ── Read output files from container ─────────────────────────────────
      const output   = await this.readFileFromContainer(container, '/workspace/output.txt');
      const error    = await this.readFileFromContainer(container, '/workspace/error.txt');
      const exitRaw  = await this.readFileFromContainer(container, '/workspace/exit_code.txt');
      const exitCode = parseInt(exitRaw.trim(), 10) || 0;

      console.log(`[Compiler] exitCode=${exitCode}`);
      console.log(`[Compiler] output="${output.trim()}"`);
      if (error.trim()) console.log(`[Compiler] error="${error.trim()}"`);

      return {
        output:   output.trim(),
        error:    error.trim(),
        exitCode,
        status:   exitCode === 0 ? 'success' : 'error'
      };

    } catch (err) {
      console.error('[Compiler] Fatal error:', err.message);
      return { output: '', error: err.message, exitCode: 1, status: 'error' };

    } finally {
      if (container) {
        try { await container.remove({ force: true }); } catch (_) {}
      }
    }
  }
}

export default FullCompilerService;