# Design Guidelines: VS Code-Like Web IDE

## Design Approach

**Reference-Based: VS Code Interface Pattern**
Following VS Code's established IDE interface conventions with modern refinements. This ensures immediate familiarity for developers while maintaining professional polish.

## Core Design Principles

1. **Developer-First Clarity**: Maximum information density without clutter
2. **Minimal Visual Distraction**: UI fades into background, code takes center stage
3. **Instant Recognition**: Familiar patterns from VS Code for zero learning curve

## Typography System

**Primary Font Stack**: `'Monaco', 'Menlo', 'Ubuntu Mono', 'Courier New', monospace` for code
**UI Font Stack**: `'Inter', 'Segoe UI', -apple-system, sans-serif` for interface elements

**Hierarchy**:
- Code: 14px regular weight (editor content)
- File names: 13px medium weight
- Toolbar items: 13px medium weight
- Terminal output: 13px regular monospace
- Status indicators: 11px medium weight

## Layout System

**Spacing Primitives**: Use Tailwind units of `2`, `4`, `6` for consistency
- Component padding: `p-4`
- Section gaps: `gap-2` or `gap-4`
- Icon margins: `mr-2`

**Grid Structure**:
```
┌─────────────────────────────────────┐
│  Toolbar (h-12)                      │
├────────┬────────────────┬────────────┤
│ File   │ Editor         │ (Optional) │
│ Tree   │ (Monaco)       │ Side Panel │
│ (w-64) │ (flex-1)       │            │
├────────┴────────────────┴────────────┤
│  Terminal Panel (h-64)               │
└─────────────────────────────────────┘
```

## Component Library

### File Explorer
- Tree view with 20px indent per level
- File icons (Lucide): Folder, File, FileCode, FileJson
- Hover states: subtle background highlight
- Selected file: distinct background treatment
- Expandable folders with chevron icons (ChevronRight, ChevronDown)
- Context menu on right-click (New File, Delete, Rename)

### Monaco Editor Area
- Full integration of Monaco Editor
- Tab bar (h-10) above editor with close buttons
- Tab active state: stronger visual emphasis
- Tab hover: subtle highlight
- Modified indicator: dot or asterisk on tab
- Scrollbars: thin, minimal contrast

### Toolbar (Top Bar)
- Height: `h-12`
- Left section: Logo/title
- Center section: "Load GitHub Repo" button, "Run" button (with play icon)
- Right section: Theme toggle, Save indicator
- Button style: subtle borders, icon + text combinations
- Spacing between actions: `gap-4`

### Terminal Panel
- Resizable height (default: h-64)
- Tab system for multiple terminals/outputs
- Output sections: stdout (normal), stderr (warning-toned text)
- Clear button in corner
- Monospace font throughout
- Command prompt indicator (>)

### GitHub Repo Modal
- Centered modal (max-w-2xl)
- Input field for GitHub URL
- "Load Repository" primary action button
- Loading state with spinner
- Error messages inline below input

### Status Bar (Bottom)
- Height: `h-6`
- Left: Current file path
- Right: Line/column numbers, file type, cursor position
- Font size: 11px

## Interaction Patterns

**No animations** except:
- Smooth scroll in editor
- Fade-in for modals (200ms)
- Tree expand/collapse (150ms)

**Keyboard Shortcuts** (display in tooltips):
- Ctrl+S: Save
- Ctrl+P: Quick file open
- Ctrl+`: Toggle terminal
- Ctrl+B: Toggle sidebar

## Theme Implementation

**Dark Theme** (default):
- Sidebar: near-black background (#1e1e1e)
- Editor: slightly lighter (#252526)
- Active elements: subtle accent borders

**Light Theme**:
- Sidebar: light gray (#f3f3f3)
- Editor: white (#ffffff)
- Text: dark gray for contrast

## Visual Hierarchy

1. **Primary Focus**: Monaco editor occupies maximum space
2. **Secondary**: File explorer - visible but compact
3. **Tertiary**: Terminal - collapsible, shows when needed
4. **Supporting**: Toolbar - minimal height, clear actions

## Icons

**Library**: Lucide Icons via CDN
**Common icons**: 
- Play (run code), FolderOpen, FileCode, Terminal, Sun/Moon (theme), Settings, GitBranch, Search

**Icon sizes**: 
- Toolbar: 18px
- File tree: 16px
- Tabs: 14px

## Responsive Behavior

**Desktop** (1024px+): Full three-panel layout
**Tablet** (768px-1023px): Collapsible sidebar, full editor
**Mobile** (< 768px): Single panel view, bottom sheet navigation

## Critical UI States

**Loading GitHub Repo**: 
- Overlay with spinner
- Progress indicator showing file count
- "Cloning repository..." message

**Code Execution**:
- "Running..." status in toolbar
- Terminal auto-expands
- Run button disabled during execution

**File Operations**:
- Inline rename input in tree
- Confirmation modal for delete
- Success/error toast notifications (top-right, auto-dismiss 3s)

## No Images
This application requires no hero images or decorative imagery. Focus is purely on functional UI elements and code display.