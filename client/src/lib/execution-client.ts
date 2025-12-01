import { apiRequest } from './queryClient';

export interface ExecutionSession {
  sessionId: string;
  workdir: string;
}

export async function createExecutionSession(): Promise<ExecutionSession> {
  const response = await apiRequest('POST', '/api/execution/session/create');
  return response.json();
}

export async function writeFilesToSession(sessionId: string, files: Array<{ path: string; content: string }>): Promise<void> {
  if (!sessionId || !files || files.length === 0) {
    console.warn('writeFilesToSession: missing sessionId or files', { sessionId, filesCount: files?.length });
    return;
  }
  const response = await fetch('/api/execution/files', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, files }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to write files: ${response.status} ${error}`);
  }
}

export async function executeCommand(
  sessionId: string,
  command: string,
  args: string[] = []
): Promise<AsyncIterable<string>> {
  const response = await fetch(`/api/execution/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, command, args }),
  });

  if (!response.ok) {
    throw new Error(`Execution failed: ${response.statusText}`);
  }

  return parseServerSentEvents(response.body!);
}

async function* parseServerSentEvents(stream: ReadableStream): AsyncIterable<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.output) {
              yield data.output;
            }
            if (data.done) {
              return;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function killProcess(sessionId: string): Promise<void> {
  return apiRequest('POST', '/api/execution/kill', { sessionId });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return apiRequest('DELETE', `/api/execution/session/${sessionId}`);
}
