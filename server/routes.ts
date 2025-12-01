import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchRepository, fetchFileContent, parseGitHubUrl } from "./github";
import { loadRepoRequestSchema, fileOperationSchema, type FileNode } from "@shared/schema";
import { z } from "zod";
import { createSession, writeFileToSession, executeCommand, subscribeToOutput, killProcess, getSessionWorkdir, deleteSession } from "./execution";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.post("/api/github/load", async (req, res) => {
    try {
      const body = loadRepoRequestSchema.parse(req.body);
      
      const result = await fetchRepository(body.repoUrl);
      
      const project = await storage.createProject({
        name: result.name,
        owner: result.owner,
        repoUrl: body.repoUrl,
        files: result.files,
        loadedAt: new Date().toISOString(),
      });

      res.json({
        success: true,
        data: {
          id: project.id,
          name: project.name,
          owner: project.owner,
          files: project.files,
        },
      });
    } catch (error) {
      console.error("Failed to load repository:", error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request: " + error.errors.map(e => e.message).join(", "),
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to load repository",
      });
    }
  });

  app.get("/api/github/file", async (req, res) => {
    try {
      const { url, path } = req.query;
      
      if (typeof url !== "string" || typeof path !== "string") {
        res.status(400).json({
          success: false,
          error: "Missing url or path query parameter",
        });
        return;
      }

      const repoInfo = parseGitHubUrl(url);
      if (!repoInfo) {
        res.status(400).json({
          success: false,
          error: "Invalid GitHub URL",
        });
        return;
      }

      const content = await fetchFileContent(repoInfo.owner, repoInfo.repo, path);
      
      res.json({
        success: true,
        data: {
          path,
          content,
          encoding: "utf-8",
        },
      });
    } catch (error) {
      console.error("Failed to fetch file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch file",
      });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch projects",
      });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
        return;
      }
      
      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch project",
      });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProject(req.params.id);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
        return;
      }
      
      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to delete project",
      });
    }
  });

  app.post("/api/projects/:id/files", async (req, res) => {
    try {
      const body = fileOperationSchema.parse(req.body);
      const project = await storage.getProject(req.params.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
        return;
      }

      const newFile: FileNode = {
        id: `node-${Date.now()}`,
        name: body.path.split('/').pop() || body.path,
        path: body.path,
        type: body.content !== undefined ? 'file' : 'folder',
        content: body.content,
        children: body.content === undefined ? [] : undefined,
      };

      const addFileToTree = (nodes: FileNode[], parentPath: string): FileNode[] => {
        const parentParts = parentPath.split('/').filter(Boolean);
        
        if (parentParts.length === 0) {
          return [...nodes, newFile];
        }

        return nodes.map(node => {
          if (node.path === parentPath && node.type === 'folder') {
            return {
              ...node,
              children: [...(node.children || []), newFile],
            };
          }
          if (node.children && parentPath.startsWith(node.path + '/')) {
            return {
              ...node,
              children: addFileToTree(node.children, parentPath),
            };
          }
          return node;
        });
      };

      const pathParts = body.path.split('/');
      const parentPath = pathParts.slice(0, -1).join('/');
      const updatedFiles = addFileToTree(project.files, parentPath);
      
      await storage.updateProject(req.params.id, { files: updatedFiles });
      
      res.json({
        success: true,
        data: newFile,
      });
    } catch (error) {
      console.error("Failed to create file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to create file",
      });
    }
  });

  app.patch("/api/projects/:id/files", async (req, res) => {
    try {
      const body = fileOperationSchema.parse(req.body);
      const project = await storage.getProject(req.params.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
        return;
      }

      const updateFileInTree = (nodes: FileNode[]): FileNode[] => {
        return nodes.map(node => {
          if (node.path === body.path) {
            const updates: Partial<FileNode> = {};
            if (body.content !== undefined) {
              updates.content = body.content;
            }
            if (body.newPath) {
              updates.path = body.newPath;
              updates.name = body.newPath.split('/').pop() || body.newPath;
            }
            return { ...node, ...updates };
          }
          if (node.children) {
            return { ...node, children: updateFileInTree(node.children) };
          }
          return node;
        });
      };

      const updatedFiles = updateFileInTree(project.files);
      await storage.updateProject(req.params.id, { files: updatedFiles });
      
      res.json({
        success: true,
        data: { updated: true },
      });
    } catch (error) {
      console.error("Failed to update file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to update file",
      });
    }
  });

  app.delete("/api/projects/:id/files", async (req, res) => {
    try {
      const { path } = req.query;
      
      if (typeof path !== "string") {
        res.status(400).json({
          success: false,
          error: "Missing path query parameter",
        });
        return;
      }

      const project = await storage.getProject(req.params.id);
      
      if (!project) {
        res.status(404).json({
          success: false,
          error: "Project not found",
        });
        return;
      }

      const deleteFromTree = (nodes: FileNode[]): FileNode[] => {
        return nodes
          .filter(node => node.path !== path)
          .map(node => ({
            ...node,
            children: node.children ? deleteFromTree(node.children) : undefined,
          }));
      };

      const updatedFiles = deleteFromTree(project.files);
      await storage.updateProject(req.params.id, { files: updatedFiles });
      
      res.json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      console.error("Failed to delete file:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete file",
      });
    }
  });

  // Execution endpoints
  app.post("/api/execution/session/create", (req, res) => {
    try {
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const workdir = createSession(sessionId);
      res.json({ success: true, sessionId, workdir });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to create session' });
    }
  });

  app.post("/api/execution/files", (req, res) => {
    try {
      const { sessionId, files } = req.body;
      if (!sessionId || !Array.isArray(files)) {
        res.status(400).json({ success: false, error: 'Missing sessionId or files' });
        return;
      }

      files.forEach((file: { path: string; content: string }) => {
        let content = file.content;
        
        // If this is package.json, modify dev script to use port 3000
        if (file.path === 'package.json') {
          try {
            const pkg = JSON.parse(content);
            if (pkg.scripts && pkg.scripts.dev) {
              // Fix common Next.js and other dev scripts that default to port 5000
              pkg.scripts.dev = pkg.scripts.dev
                .replace(/next dev(?!\s+-p)/, 'next dev -p 3000')
                .replace(/vite(?!\s+-p)/, 'vite -p 3000')
                .replace(/node (?!.*-p)/, 'node --port 3000 ')
                .replace(/npm start(?!\s+--\s+--port)/, 'PORT=3000 npm start');
            }
            content = JSON.stringify(pkg, null, 2);
          } catch (e) {
            // If parsing fails, just use original content
          }
        }
        
        writeFileToSession(sessionId, file.path, content);
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to write files' });
    }
  });

  app.post("/api/execution/command", async (req, res) => {
    const { sessionId, command, args } = req.body;
    
    // Validate before sending any response
    if (!sessionId || !command) {
      res.status(400).json({ success: false, error: 'Missing sessionId or command' });
      return;
    }

    // Now we can safely send SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const unsubscribe = subscribeToOutput(sessionId, (data) => {
      res.write(`data: ${JSON.stringify({ output: data })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ output: `> ${command} ${args?.join(' ') || ''}\n` })}\n\n`);

    try {
      await executeCommand(sessionId, command, args || []);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ output: `[Error] ${error instanceof Error ? error.message : 'Unknown error'}\n` })}\n\n`);
    }

    res.end();
    unsubscribe();
  });

  app.post("/api/execution/kill", (req, res) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        res.status(400).json({ success: false, error: 'Missing sessionId' });
        return;
      }
      killProcess(sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to kill process' });
    }
  });

  app.delete("/api/execution/session/:sessionId", (req, res) => {
    try {
      deleteSession(req.params.sessionId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Failed to delete session' });
    }
  });

  return httpServer;
}
