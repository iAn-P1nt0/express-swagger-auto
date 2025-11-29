/**
 * E2E Test Utilities
 * Provides process spawning, server management, and test helpers
 */

import { spawn, ChildProcess, SpawnOptions } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

export interface ServerOptions {
  port: number;
  host?: string;
  startupTimeout?: number;
  readyPattern?: RegExp;
}

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface ServerProcess {
  process: ChildProcess;
  port: number;
  kill: () => Promise<void>;
  waitForReady: () => Promise<void>;
}

/**
 * Spawns a process and returns a promise that resolves when the process exits
 */
export function runCommand(
  command: string,
  args: string[],
  options: SpawnOptions & { timeout?: number } = {}
): Promise<ProcessResult> {
  return new Promise((resolve) => {
    const timeout = options.timeout || 30000;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let exitCode: number | null = null;

    const proc = spawn(command, args, {
      ...options,
      shell: process.platform === 'win32',
    });

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeout);

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      exitCode = code;
      resolve({ exitCode, stdout, stderr, timedOut });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      stderr += err.message;
      resolve({ exitCode: 1, stdout, stderr, timedOut });
    });
  });
}

/**
 * Spawns a server process and waits for it to be ready
 */
export function startServer(
  command: string,
  args: string[],
  options: ServerOptions
): Promise<ServerProcess> {
  return new Promise((resolve, reject) => {
    const startupTimeout = options.startupTimeout || 10000;
    const readyPattern = options.readyPattern || /listening|started|running/i;
    let stdout = '';
    let stderr = '';

    const proc = spawn(command, args, {
      env: { ...process.env, PORT: String(options.port) },
      shell: process.platform === 'win32',
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Server failed to start within ${startupTimeout}ms`));
    }, startupTimeout);

    proc.stdout?.on('data', (data) => {
      stdout += data.toString();
      if (readyPattern.test(stdout)) {
        clearTimeout(timer);
        resolve({
          process: proc,
          port: options.port,
          kill: async () => {
            proc.kill('SIGTERM');
            await new Promise<void>((res) => {
              proc.on('close', () => res());
              setTimeout(() => res(), 2000);
            });
          },
          waitForReady: async () => {
            // Already ready
          },
        });
      }
    });

    proc.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`Server exited with code ${code}. stderr: ${stderr}`));
      }
    });
  });
}

/**
 * Makes an HTTP request and returns the response
 */
export function httpRequest(
  url: string,
  options: http.RequestOptions = {}
): Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body,
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Waits for a condition to be true
 */
export function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 10000,
  interval = 100
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = async () => {
      if (await condition()) {
        resolve();
        return;
      }
      if (Date.now() - startTime >= timeout) {
        reject(new Error(`waitFor timed out after ${timeout}ms`));
        return;
      }
      setTimeout(check, interval);
    };

    check();
  });
}

/**
 * Creates a temporary directory for test fixtures
 */
export function createTempDir(prefix = 'e2e-test'): string {
  const tmpDir = path.join(__dirname, '..', '..', '..', 'tmp', `${prefix}-${Date.now()}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  return tmpDir;
}

/**
 * Cleans up a temporary directory
 */
export function cleanupTempDir(dirPath: string): void {
  if (fs.existsSync(dirPath) && dirPath.includes('tmp')) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Writes a file with content
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Reads a file content
 */
export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Checks if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

/**
 * Parses JSON safely
 */
export function parseJSON<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/**
 * Gets the CLI path
 */
export function getCliPath(): string {
  return path.resolve(__dirname, '..', '..', '..', 'dist', 'cli.js');
}

/**
 * Gets an available port
 */
export async function getAvailablePort(startPort = 3100): Promise<number> {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      server.on('error', () => resolve(false));
    });
  };

  let port = startPort;
  while (port < startPort + 1000) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
}

/**
 * Delays execution for specified milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock package.json for test project
 */
export function createMockPackageJson(dir: string, overrides: Partial<Record<string, unknown>> = {}): void {
  const packageJson = {
    name: 'test-project',
    version: '1.0.0',
    description: 'Test project for E2E tests',
    main: 'app.js',
    type: 'commonjs',
    ...overrides,
  };
  writeFile(path.join(dir, 'package.json'), JSON.stringify(packageJson, null, 2));
}

/**
 * Validates OpenAPI spec structure
 */
export function validateOpenAPISpec(spec: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const s = spec as Record<string, unknown>;

  if (!s || typeof s !== 'object') {
    errors.push('Spec must be an object');
    return { valid: false, errors };
  }

  if (!s.openapi || typeof s.openapi !== 'string') {
    errors.push('Missing or invalid "openapi" field');
  } else if (!s.openapi.toString().startsWith('3.')) {
    errors.push(`Invalid OpenAPI version: ${s.openapi}`);
  }

  if (!s.info || typeof s.info !== 'object') {
    errors.push('Missing "info" object');
  } else {
    const info = s.info as Record<string, unknown>;
    if (!info.title || typeof info.title !== 'string') {
      errors.push('Missing info.title');
    }
    if (!info.version || typeof info.version !== 'string') {
      errors.push('Missing info.version');
    }
  }

  if (!s.paths || typeof s.paths !== 'object') {
    errors.push('Missing "paths" object');
  }

  return { valid: errors.length === 0, errors };
}
