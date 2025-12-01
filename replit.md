# CodeForge - VS Code-like Web IDE

## Overview
CodeForge is a web-based IDE that provides a VS Code-like experience for viewing and editing code. It features GitHub repository loading, Monaco Editor integration, file management, and in-browser code execution capabilities.

## Current State
- **MVP Complete**: Full IDE interface with all core features implemented
- **GitHub Integration**: Connected via Replit GitHub connector
- **Code Execution**: WebContainers support for running Node.js projects

## Tech Stack

### Frontend
- React with TypeScript
- Wouter for routing
- TanStack Query for data fetching
- Zustand for state management
- Monaco Editor for code editing
- WebContainers API for in-browser code execution
- TailwindCSS for styling
- Shadcn UI components

### Backend
- Node.js with Express
- Octokit for GitHub API integration
- In-memory storage for project management

## Project Structure

```
├── client/
│   └── src/
│       ├── components/
│       │   ├── ide/          # IDE-specific components
│       │   │   ├── FileExplorer.tsx
│       │   │   ├── EditorTabs.tsx
│       │   │   ├── MonacoEditor.tsx
│       │   │   ├── Terminal.tsx
│       │   │   ├── Toolbar.tsx
│       │   │   └── StatusBar.tsx
│       │   └── ui/           # Shadcn UI components
│       ├── hooks/
│       ├── lib/
│       │   ├── ide-store.ts  # Zustand store for IDE state
│       │   ├── webcontainer.ts # WebContainer utilities
│       │   └── queryClient.ts
│       └── pages/
│           └── ide.tsx       # Main IDE page
├── server/
│   ├── github.ts             # GitHub API integration
│   ├── routes.ts             # API routes
│   ├── storage.ts            # In-memory storage
│   └── index.ts              # Express server
└── shared/
    └── schema.ts             # Shared types and schemas
```

## API Endpoints

- `POST /api/github/load` - Load a GitHub repository
- `GET /api/github/file` - Fetch a single file's content
- `GET /api/projects` - List all loaded projects
- `GET /api/projects/:id` - Get a specific project
- `DELETE /api/projects/:id` - Delete a project

## Features

### Implemented
- File Explorer with tree view and expand/collapse
- Monaco Editor with syntax highlighting for JS, TS, Python, HTML, CSS
- Tab system for multiple open files
- Dark/Light theme toggle
- GitHub repository loading via URL
- File operations (create, delete, rename)
- Terminal output panel
- Resizable panels
- Keyboard shortcuts (Ctrl+B, Ctrl+S, Ctrl+`)
- WebContainers for code execution

### Future Enhancements
- GitHub OAuth for pushing changes
- Database persistence for projects
- Python runtime support
- Collaborative editing
- Git diff view

## Running the Project

The project runs on port 5000 with both frontend and backend served from the same server.

```bash
npm run dev
```

## User Preferences
- VS Code-inspired dark theme as default
- Clean, developer-friendly UI
- Monospace fonts for code (JetBrains Mono)
