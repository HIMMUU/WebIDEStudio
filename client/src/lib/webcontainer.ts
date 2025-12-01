import { WebContainer } from '@webcontainer/api';
import type { FileNode } from '@shared/schema';

let webcontainerInstance: WebContainer | null = null;
let isBooting = false;

export async function getWebContainer(): Promise<WebContainer> {
  if (webcontainerInstance) {
    return webcontainerInstance;
  }

  if (isBooting) {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (webcontainerInstance) {
          clearInterval(check);
          resolve(webcontainerInstance);
        }
      }, 100);
    });
  }

  isBooting = true;
  
  try {
    webcontainerInstance = await WebContainer.boot();
    isBooting = false;
    return webcontainerInstance;
  } catch (error) {
    isBooting = false;
    throw error;
  }
}

interface FileSystemTree {
  [name: string]: {
    file?: { contents: string };
    directory?: FileSystemTree;
  };
}

function buildFileSystemTree(files: FileNode[]): FileSystemTree {
  const tree: FileSystemTree = {};

  const processNode = (node: FileNode): { file?: { contents: string }; directory?: FileSystemTree } => {
    if (node.type === 'file') {
      return { file: { contents: node.content || '' } };
    }
    
    const directory: FileSystemTree = {};
    if (node.children) {
      for (const child of node.children) {
        directory[child.name] = processNode(child);
      }
    }
    return { directory };
  };

  for (const node of files) {
    tree[node.name] = processNode(node);
  }

  return tree;
}

export async function mountFiles(files: FileNode[]): Promise<void> {
  const container = await getWebContainer();
  const tree = buildFileSystemTree(files);
  await container.mount(tree);
}

export interface ProcessOutput {
  type: 'stdout' | 'stderr';
  content: string;
}

export async function runCommand(
  command: string,
  args: string[] = [],
  onOutput: (output: ProcessOutput) => void
): Promise<number> {
  const container = await getWebContainer();
  
  const process = await container.spawn(command, args);
  
  process.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput({ type: 'stdout', content: data });
      },
    })
  );

  const exitCode = await process.exit;
  return exitCode;
}

export async function installDependencies(
  onOutput: (output: ProcessOutput) => void
): Promise<number> {
  return runCommand('npm', ['install'], onOutput);
}

export async function runScript(
  scriptName: string,
  onOutput: (output: ProcessOutput) => void
): Promise<{ exitCode: number; kill: () => void }> {
  const container = await getWebContainer();
  
  const process = await container.spawn('npm', ['run', scriptName]);
  
  process.output.pipeTo(
    new WritableStream({
      write(data) {
        onOutput({ type: 'stdout', content: data });
      },
    })
  );

  return {
    exitCode: await process.exit,
    kill: () => {
      process.kill();
    },
  };
}

export async function runNodeFile(
  filePath: string,
  onOutput: (output: ProcessOutput) => void
): Promise<number> {
  return runCommand('node', [filePath], onOutput);
}

export async function checkPackageJson(files: FileNode[]): Promise<boolean> {
  const findPackageJson = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.name === 'package.json' && node.type === 'file') {
        return node;
      }
      if (node.children) {
        const found = findPackageJson(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  return findPackageJson(files) !== null;
}

export async function getServerUrl(): Promise<string | null> {
  try {
    const container = await getWebContainer();
    return new Promise((resolve) => {
      container.on('server-ready', (port, url) => {
        resolve(url);
      });
      
      setTimeout(() => resolve(null), 30000);
    });
  } catch {
    return null;
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  const container = await getWebContainer();
  
  const parts = path.split('/');
  if (parts.length > 1) {
    const dirPath = parts.slice(0, -1).join('/');
    try {
      await container.fs.mkdir(dirPath, { recursive: true });
    } catch (e) {
    }
  }
  
  await container.fs.writeFile(path, content);
}

export async function deleteFile(path: string): Promise<void> {
  const container = await getWebContainer();
  await container.fs.rm(path, { recursive: true });
}

export async function createDirectory(path: string): Promise<void> {
  const container = await getWebContainer();
  await container.fs.mkdir(path, { recursive: true });
}
