import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

interface ExecutionSession {
  id: string;
  process: ChildProcess | null;
  workdir: string;
  createdAt: number;
  lastActivity: number;
}

const sessions = new Map<string, ExecutionSession>();
const listeners = new Map<string, ((data: string) => void)[]>();

// Cleanup old sessions every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    // Kill sessions inactive for 30 minutes
    if (now - session.lastActivity > 30 * 60 * 1000) {
      if (session.process) {
        session.process.kill();
      }
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

export function createSession(sessionId: string): string {
  const workdir = path.join(os.tmpdir(), `codeforge-${sessionId}-${Date.now()}`);
  
  // Create temp directory
  if (!fs.existsSync(workdir)) {
    fs.mkdirSync(workdir, { recursive: true });
  }

  sessions.set(sessionId, {
    id: sessionId,
    process: null,
    workdir,
    createdAt: Date.now(),
    lastActivity: Date.now(),
  });

  listeners.set(sessionId, []);
  return workdir;
}

export function writeFileToSession(sessionId: string, filePath: string, content: string): void {
  const session = sessions.get(sessionId);
  if (!session) throw new Error('Session not found');

  const fullPath = path.join(session.workdir, filePath);
  const dir = path.dirname(fullPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(fullPath, content, 'utf-8');
}

export function executeCommand(
  sessionId: string,
  command: string,
  args: string[] = []
): Promise<void> {
  return new Promise((resolve, reject) => {
    const session = sessions.get(sessionId);
    if (!session) {
      reject(new Error('Session not found'));
      return;
    }

    // Kill previous process if still running
    if (session.process) {
      session.process.kill();
    }

    session.lastActivity = Date.now();

    const process = spawn(command, args, {
      cwd: session.workdir,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: `/usr/local/bin:${process.env.PATH}`,
      },
    });

    session.process = process;

    let outputBuffer = '';

    process.stdout?.on('data', (data) => {
      const chunk = data.toString();
      outputBuffer += chunk;
      broadcastOutput(sessionId, chunk);
    });

    process.stderr?.on('data', (data) => {
      const chunk = data.toString();
      outputBuffer += chunk;
      broadcastOutput(sessionId, `[ERROR] ${chunk}`);
    });

    process.on('error', (error) => {
      const errorMsg = `\n[Process Error] ${error.message}\n`;
      broadcastOutput(sessionId, errorMsg);
      reject(error);
    });

    process.on('close', (code) => {
      session.process = null;
      const exitMsg = code === 0 
        ? `\n[Process exited with code 0]\n`
        : `\n[Process exited with code ${code}]\n`;
      broadcastOutput(sessionId, exitMsg);
      resolve();
    });
  });
}

export function broadcastOutput(sessionId: string, data: string): void {
  const sessionListeners = listeners.get(sessionId);
  if (sessionListeners) {
    sessionListeners.forEach(callback => callback(data));
  }
}

export function subscribeToOutput(sessionId: string, callback: (data: string) => void): () => void {
  const sessionListeners = listeners.get(sessionId);
  if (!sessionListeners) {
    listeners.set(sessionId, [callback]);
  } else {
    sessionListeners.push(callback);
  }

  // Return unsubscribe function
  return () => {
    const listeners = listeners.get(sessionId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  };
}

export function killProcess(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session && session.process) {
    session.process.kill('SIGTERM');
    setTimeout(() => {
      if (session.process) {
        session.process.kill('SIGKILL');
      }
    }, 5000);
  }
}

export function getSessionWorkdir(sessionId: string): string | null {
  const session = sessions.get(sessionId);
  return session?.workdir || null;
}

export function deleteSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    if (session.process) {
      session.process.kill();
    }
    // Clean up temp directory
    try {
      if (fs.existsSync(session.workdir)) {
        fs.rmSync(session.workdir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Failed to clean up session directory:', e);
    }
    sessions.delete(sessionId);
    listeners.delete(sessionId);
  }
}
