import { Octokit } from '@octokit/rest';
import type { FileNode } from '@shared/schema';

let connectionSettings: any;
let useAuthenticatedClient = true;

async function getAccessToken(): Promise<string | null> {
  try {
    if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
      return connectionSettings.settings.access_token;
    }
    
    const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
    const xReplitToken = process.env.REPL_IDENTITY 
      ? 'repl ' + process.env.REPL_IDENTITY 
      : process.env.WEB_REPL_RENEWAL 
      ? 'depl ' + process.env.WEB_REPL_RENEWAL 
      : null;

    if (!hostname || !xReplitToken) {
      console.log('GitHub connector not available, using unauthenticated client');
      useAuthenticatedClient = false;
      return null;
    }

    connectionSettings = await fetch(
      'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
      {
        headers: {
          'Accept': 'application/json',
          'X_REPLIT_TOKEN': xReplitToken
        }
      }
    ).then(res => res.json()).then(data => data.items?.[0]);

    const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

    if (!accessToken) {
      console.log('No GitHub access token found, using unauthenticated client');
      useAuthenticatedClient = false;
      return null;
    }
    
    return accessToken;
  } catch (error) {
    console.log('Failed to get GitHub access token, using unauthenticated client:', error);
    useAuthenticatedClient = false;
    return null;
  }
}

async function getGitHubClient(): Promise<Octokit> {
  const accessToken = await getAccessToken();
  if (accessToken) {
    return new Octokit({ auth: accessToken });
  }
  return new Octokit();
}

export interface RepoInfo {
  owner: string;
  repo: string;
}

export function parseGitHubUrl(url: string): RepoInfo | null {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.replace(/\.git$/, '').match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }
  
  return null;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

export async function fetchRepository(repoUrl: string): Promise<{ name: string; owner: string; files: FileNode[] }> {
  const repoInfo = parseGitHubUrl(repoUrl);
  if (!repoInfo) {
    throw new Error('Invalid GitHub repository URL');
  }

  const octokit = await getGitHubClient();
  
  const { data: repo } = await octokit.repos.get({
    owner: repoInfo.owner,
    repo: repoInfo.repo,
  });

  const defaultBranch = repo.default_branch;
  
  const { data: tree } = await octokit.git.getTree({
    owner: repoInfo.owner,
    repo: repoInfo.repo,
    tree_sha: defaultBranch,
    recursive: 'true',
  });

  const files = await buildFileTree(octokit, repoInfo, tree.tree as GitHubTreeItem[]);

  return {
    name: repo.name,
    owner: repoInfo.owner,
    files,
  };
}

async function buildFileTree(
  octokit: Octokit,
  repoInfo: RepoInfo,
  treeItems: GitHubTreeItem[]
): Promise<FileNode[]> {
  const root: FileNode[] = [];
  const nodeMap = new Map<string, FileNode>();

  const sortedItems = [...treeItems].sort((a, b) => {
    const aDepth = a.path.split('/').length;
    const bDepth = b.path.split('/').length;
    return aDepth - bDepth;
  });

  for (const item of sortedItems) {
    const pathParts = item.path.split('/');
    const name = pathParts[pathParts.length - 1];
    const parentPath = pathParts.slice(0, -1).join('/');

    const node: FileNode = {
      id: `node-${item.sha}`,
      name,
      path: item.path,
      type: item.type === 'tree' ? 'folder' : 'file',
      children: item.type === 'tree' ? [] : undefined,
    };

    nodeMap.set(item.path, node);

    if (parentPath) {
      const parent = nodeMap.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    } else {
      root.push(node);
    }
  }

  const textExtensions = new Set([
    'js', 'jsx', 'ts', 'tsx', 'json', 'html', 'css', 'scss', 'sass', 'less',
    'md', 'txt', 'yml', 'yaml', 'xml', 'svg', 'sh', 'bash', 'zsh',
    'py', 'rb', 'php', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rs', 'swift',
    'kt', 'kts', 'sql', 'graphql', 'vue', 'svelte', 'astro',
    'gitignore', 'env', 'editorconfig', 'prettierrc', 'eslintrc',
    'dockerfile', 'makefile', 'toml', 'ini', 'cfg', 'conf',
  ]);

  const filesToFetch = treeItems.filter(item => {
    if (item.type !== 'blob') return false;
    if (item.size && item.size > 100000) return false;
    
    const ext = item.path.split('.').pop()?.toLowerCase() || '';
    const filename = item.path.split('/').pop()?.toLowerCase() || '';
    
    return textExtensions.has(ext) || 
           textExtensions.has(filename) ||
           filename === 'license' ||
           filename === 'readme';
  });

  const batchSize = 10;
  for (let i = 0; i < filesToFetch.length; i += batchSize) {
    const batch = filesToFetch.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (item) => {
        try {
          const { data } = await octokit.repos.getContent({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            path: item.path,
          });

          if ('content' in data && data.encoding === 'base64') {
            const content = Buffer.from(data.content, 'base64').toString('utf-8');
            const node = nodeMap.get(item.path);
            if (node) {
              node.content = content;
            }
          }
        } catch (error) {
          console.error(`Failed to fetch content for ${item.path}:`, error);
        }
      })
    );
  }

  return root;
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const octokit = await getGitHubClient();
  
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  });

  if ('content' in data && data.encoding === 'base64') {
    return Buffer.from(data.content, 'base64').toString('utf-8');
  }

  throw new Error('Unable to fetch file content');
}
