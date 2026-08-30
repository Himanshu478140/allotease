# General Agent Guidelines & Rules

## 1. Never Use Browser Default Popups/Dialogs
- **DO NOT** use native browser dialogs like `confirm()`, `alert()`, or `prompt()`.
- Instead, always implement custom React modal overlays or inline warning banners using Tailwind CSS for all confirmations, warnings, and prompts. This ensures the app maintains a highly polished, custom, and premium UX.

## 1.5 Never Use Browser Default Dropdowns

- **DO NOT** use native HTML `<select>` dropdowns for application UI.
- Instead, always build or use fully custom React dropdowns, popovers, comboboxes, or select components styled with Tailwind CSS (or the project's design system).
- Custom dropdowns must fully support:
  - Theme consistency (light/dark modes)
  - Keyboard navigation
  - Focus management
  - Search/filtering where appropriate
  - Smooth animations
  - Disabled/loading states
  - Custom icons and option rendering
- Native `<select>` elements should only be used when absolutely required by browser or platform limitations that cannot reasonably be replicated with a custom component.

This ensures the application maintains a polished, premium, and fully customizable user experience consistent with the rest of the interface.

## 2. Never Use Browser Default Scrollbars
- **DO NOT** leave default scrollbars on scrollable panels, sidebars, list blocks, or modals.
- Always apply theme-integrated, custom scrollbars (e.g., using custom utility styling like `.scrollbar-thin` or custom CSS scrollbar styles) to all container elements that support scroll overflows to maintain design consistency.

## 3. Prefer Feature-Based Modular Architecture (Single Responsibility)

As the codebase grows, prioritize long-term maintainability over keeping code in a single file.

### General Principles

- DO NOT continue appending unrelated logic into an existing large file simply because it works.
- Organize code by **feature** and **responsibility**, not just by file type.
- Every file should have one clear purpose (Single Responsibility Principle).
- When a component begins handling multiple independent responsibilities, extract them into dedicated components, hooks, utilities, or feature folders.

### Folder Organization

Prefer feature folders over flat structures.

Good:

```
EditorCanvas/
├── EditorCanvas.tsx
├── components/
├── hooks/
├── dialogs/
├── overlays/
├── utils/
├── constants.ts
├── types.ts
└── index.ts
```

Avoid:

```
components/
    EditorCanvas.tsx
    EditorCanvas2.tsx
    EditorCanvasHelper.tsx
    EditorCanvasUtils.tsx
```

### Components

Components should represent meaningful UI domains.

Good:

- Workspace
- PageNavigator
- SelectionToolbar
- CanvasOverlays
- MoreMenu
- BackgroundSection

Avoid:

- ComponentPart1
- ComponentSectionA
- ComponentHelper

### Hooks

Hooks should encapsulate one logical behavior.

Good:

- useWorkspaceLayout()
- useScrollSync()
- useFloatingImages()
- useImportExport()

Avoid:

- useEverything()
- useEditorLogic()

### Utilities

Utility functions should live outside React components whenever possible.

Examples:

- geometry calculations
- formatting
- parsing
- DOM helpers
- coordinate transforms

### Constants

Move configuration data out of components.

Examples:

- color palettes
- layout options
- menu definitions
- keyboard shortcuts
- default values

Store them in dedicated `constants.ts` files.

### Types

Feature-specific interfaces and types should be colocated with the feature in `types.ts` rather than scattered throughout components.

### Business Logic

Business logic should not live inside presentation components.

Examples include:

- import/export logic
- file parsing
- validation
- layout calculations
- transaction processing

Move these into dedicated hooks or utility modules.

### Refactoring Guidelines

When modifying an existing file:

- If the file grows beyond roughly **500–700 LOC**, evaluate whether it now contains multiple independent responsibilities.
- Refactor based on **responsibility**, not just line count.
- Do NOT split files into arbitrary "Part1", "Part2", etc.
- Prefer extracting cohesive UI domains or logical subsystems.
- A larger orchestrator component is acceptable if it primarily composes child components and delegates logic to hooks.

### Goal

The main component of a feature should read like a high-level blueprint of the feature rather than containing every implementation detail.

A developer should be able to understand the overall architecture within a few minutes by reading the main component.

## 4. Icons Over Emojis
- **ALWAYS** use icons (e.g., Lucide React, Font Awesome, Heroicons, or React Icons) instead of emojis (e.g., ✅, ⚠️, 🚀, ❌) for all user interface elements.
- Emojis are **strictly prohibited** in UI components, buttons, labels, notifications, status indicators, navigation items, and any other visual interface elements.
- Use semantic, accessible icon components with proper `aria-label` or `aria-hidden` attributes where applicable.
- This policy ensures:
  - **Professional, consistent appearance** across all devices and browsers
  - **Better accessibility** with proper screen reader support
  - **Scalable, crisp visuals** that match the design system
  - **Color customization** to match brand/theme variables