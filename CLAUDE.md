# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server at http://localhost:3000
- `npm run build` - Create production build
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

**IMPORTANT**:
- DO NOT run `npm run dev` - The user always has the dev server running
- DO NOT run `npm run build` - The user runs this at the end of each session
- Only run these commands if explicitly requested by the user

## Architecture

This is a Next.js 15 application using:
- **App Router** (`src/app/` directory structure)
- **TypeScript** with strict mode enabled
- **Tailwind CSS 4** with inline theme configuration
- **React 19**

### Font Configuration

Poppins font loaded with weights: 400, 500, 600, 700

Legacy setup (if still present):
- Geist Sans (variable: `--font-geist-sans`)
- Geist Mono (variable: `--font-geist-mono`)

### Tailwind CSS 4 Setup

This project uses Tailwind CSS 4 with the new inline theme syntax. Theme customization is done in [src/app/globals.css](src/app/globals.css) using `@theme inline` blocks rather than a separate `tailwind.config.js` file.

Color scheme variables (`--background`, `--foreground`) are defined in CSS custom properties and automatically adapt to dark mode via `prefers-color-scheme`.

### Path Aliases

TypeScript path alias configured in [tsconfig.json](tsconfig.json):
- `@/*` → `./src/*`

### ESLint Configuration

Uses ESLint flat config format in [eslint.config.mjs](eslint.config.mjs) with Next.js recommended rules (`next/core-web-vitals`, `next/typescript`).

## Component Patterns

### shadcn/ui Components

This project uses [shadcn/ui](https://ui.shadcn.com) as the primary component library. All components are located in [src/components/ui](src/components/ui).

**Installed Components:**
- `Button` - Standard buttons with variants (primary, secondary, ghost, destructive, outline)
- `DatePicker` - Custom wrapper combining Calendar + Popover
- `Calendar` - Date selection component
- `Sidebar` - Collapsible sidebar with icon-only collapsed state
- `Popover` - Floating content container
- `Dropdown Menu` - Context menus and dropdowns
- `Tabs` - Tabbed navigation
- `Sonner` - Toast notifications (use for error handling and optimistic updates)
- `Input` - Text input fields
- `Separator` - Visual dividers
- `Sheet` - Side panels and modals
- `Tooltip` - Hover information
- `Skeleton` - Loading placeholders

**Component Usage Rules:**
- All page components use `"use client"` directive (client-side interactivity required for charts and state)
- **ALWAYS** use existing shadcn/ui components before creating custom ones
- **NEVER** use `<Input type="date">` - always use the `DatePicker` component from [src/components/ui/date-picker.tsx](src/components/ui/date-picker.tsx)
- Follow the ui/ folder pattern for all UI components
- Use `class-variance-authority` for component variants
- Dashboard metrics use gradient backgrounds with Tailwind classes
- Charts configured with ChartJS registration in page component

## Styling Approach

- Tailwind CSS v4 with utility-first approach
- Custom CSS variables for theming in [globals.css](src/app/globals.css)
- Component variants via `class-variance-authority`
- Poppins font family with weights: 400, 500, 600, 700
- **IMPORTANT**: Follow the comprehensive styling conventions in [STYLING-GUIDE.md](STYLING-GUIDE.md)
  - Button variants: primary, secondary, ghost, destructive, outline
  - Always use shadcn/ui DatePicker for date inputs (never `<Input type="date">`)
  - Consistent component patterns for forms, tables, tabs, and cards
  - Standard spacing, typography, and color conventions
  - Use Sonner toasts for notifications and error handling

## State Management

- Currently using React useState for local component state
- No global state management library yet

## Development Guidelines

### Code Organization

- **Component Reuse**: Always utilize existing components before creating new ones
- **File Length**: Keep files under 2000 lines. Extract components when:
  - Files exceed this threshold
  - Code blocks are reused across multiple files
  - Always ask before extracting components

### Change Implementation

- Only implement changes explicitly mentioned by the user
- **Small changes/bug fixes**: Implement automatically
- **Big changes**: Ask first before proceeding
- **IMPORTANT**: When adding frontend features that require backend support, update [BACKEND.md](BACKEND.md) with the necessary API endpoints, database schema changes, and business logic requirements

### Performance Priorities

- Optimize for lower loading times and render times
- Implement data pre-fetching on hover when appropriate
- Use optimistic updates for better perceived performance
- Implement seamless updates on cached data

### UI/UX Patterns

- **Loading States**:
  - Minimize page-level loading states (prefer seamless transitions)
  - Button loading states are acceptable (submissions, saving, deleting)
- **Error Handling**: Use toasts, especially when reverting optimistic updates
- **Design**: Desktop-first but responsive
- **Accessibility**: Maintain good contrast scores
- **Consistency**: Keep visuals uniform by using components
