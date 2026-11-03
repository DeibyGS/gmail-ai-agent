---
paths:
  - "frontend/**/*.{ts,tsx}"
---

# Frontend — React / TypeScript Rules

## React Patterns
- React 19 — functional components and hooks only
- Co-locate component-specific types in the same file unless shared
- `react-router-dom` v7 for routing; never manipulate `window.location` directly

## API Calls
- All HTTP via `axios` in dedicated service files, not inline in components
- Handle loading and error states explicitly for every async operation

## Components
- One component per file; filename matches exported name (PascalCase)
- Extract logic into custom hooks when component exceeds ~100 lines

## Libraries
- `react-big-calendar`: always configure `date-fns` localizer
- `recharts`: wrap in `<ResponsiveContainer>` or explicit width/height
- `sonner` for toast notifications — never use `alert()` or `console.error` as user feedback

## Testing
- Tests in `frontend/src/test/`. Run with `npm test` (Vitest + Testing Library)
- Use `@testing-library/user-event` for interactions; avoid `fireEvent` for complex flows
- Mock `axios` at module level — never make real API calls in tests
