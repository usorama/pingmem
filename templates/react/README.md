# React Memory Intelligence Template

## Overview
Memory intelligence configuration optimized for React applications (Create React App, Vite, custom webpack setups).

## Key Features

### React-Specific Protections
- **Core Services**: `src/core/**`, `src/services/**` - Business logic
- **State Management**: `src/store/**` - Redux/Zustand/etc stores
- **Core Contexts**: `AuthContext`, `ThemeContext` - Critical providers
- **Build Config**: `vite.config.ts`, `webpack.config.js` - Bundler configuration
- **Core Hooks**: `src/hooks/core/**` - Reusable critical hooks

### Monitored Patterns
- All React components (`src/**/*.{tsx,jsx}`)
- TypeScript/JavaScript files (`src/**/*.{ts,js}`)
- Configuration files (`*.config.{js,ts}`)
- HTML entry points (`public/**/*.html`)

### React Exclusions
- Build outputs: `build/**`, `dist/**`
- Dependencies: `node_modules/**`
- Static assets: `public/static/**`
- Cache directories: `.cache/**`

## Quick Start

### 1. Copy Template
```bash
# From your React project root
cp ~/Projects/claude-memory-intelligence/templates/react/.memory-config.json .
```

### 2. Initialize Memory System
```bash
node ~/Projects/claude-memory-intelligence/init.js
```

### 3. Set Up Hooks (Claude Code)
```bash
# Install hooks
cp ~/Projects/claude-memory-intelligence/hooks/* .claude/hooks/
chmod +x .claude/hooks/*.js
```

### 4. Customize for Your Setup
Edit `.memory-config.json` based on your project structure:

```json
{
  "boundaries": {
    "protected": [
      "src/core/**",
      "src/services/api/**",        // Your API layer
      "src/store/slices/**",        // Redux slices
      "src/contexts/UserContext.tsx" // Critical context
    ]
  }
}
```

## React Project Structure

The template assumes this common structure:

```
your-react-app/
├── src/
│   ├── core/**                  # Protected core functionality
│   ├── services/**              # Protected services (API, etc.)
│   ├── store/**                 # Protected state management
│   ├── components/              # Monitored components
│   │   ├── common/
│   │   └── features/
│   ├── hooks/                   # Monitored custom hooks
│   │   └── core/**              # Protected core hooks
│   ├── contexts/                # Monitored contexts
│   ├── pages/                   # Monitored page components
│   └── utils/                   # Monitored utilities
│       └── core/**              # Protected core utilities
├── public/
│   └── index.html
├── vite.config.ts               # Protected
├── .memory-config.json          # Memory intelligence config
└── .memories/                   # Auto-generated (gitignored)
```

## Configuration Examples

### Example 1: Create React App with Redux
```json
{
  "boundaries": {
    "protected": [
      "src/store/index.ts",
      "src/store/slices/**",
      "src/services/api/client.ts",
      "src/contexts/AuthContext.tsx"
    ],
    "monitored": [
      "src/**/*.{ts,tsx}",
      "public/index.html"
    ]
  },
  "react": {
    "bundler": "webpack",
    "stateManagement": "redux"
  }
}
```

### Example 2: Vite + Zustand
```json
{
  "boundaries": {
    "protected": [
      "src/store/authStore.ts",
      "src/store/userStore.ts",
      "src/core/**",
      "vite.config.ts"
    ]
  },
  "react": {
    "bundler": "vite",
    "stateManagement": "zustand"
  }
}
```

### Example 3: React Router + Context API
```json
{
  "boundaries": {
    "protected": [
      "src/contexts/AppContext.tsx",
      "src/routes/ProtectedRoute.tsx",
      "src/services/auth/**"
    ]
  },
  "react": {
    "router": "react-router-v6"
  }
}
```

## React-Specific Workflows

### Component Development
Memory tracks:
- Functional vs class components
- Hook usage patterns
- Component composition strategies
- Props and state management

### State Management
Captures decisions about:
- Redux vs Context API vs Zustand
- State structure and organization
- Async action patterns
- Selector optimization

### Routing
Monitors:
- Route definitions
- Protected route patterns
- Navigation strategies
- Route parameters and guards

## Protected Patterns

### Common Protected Files
```
src/core/**               # Core business logic
src/services/api/**       # API client and endpoints
src/store/index.ts        # Store configuration
src/contexts/AuthContext.tsx  # Authentication provider
src/hooks/core/**         # Critical reusable hooks
vite.config.ts           # Build configuration
```

### Why These Are Protected
- **Core Services**: Stable business logic foundation
- **Store Config**: State management architecture
- **Auth Context**: Security-critical authentication
- **Build Config**: Affects entire application build

## Memory Intelligence Features

### Codebase Tracking
- Tracks all component changes
- Monitors hook dependencies
- Captures context usage
- Records routing changes

### Decision Intelligence
Captures decisions about:
- Component architecture patterns
- State management approach
- API integration strategy
- Performance optimization techniques
- Bundle optimization decisions

### Intent Analysis
Detects:
- New feature components vs refactoring
- Hook extraction from components
- Context provider additions
- Performance optimizations

## Commands

### Refresh Memory
```bash
node ~/Projects/claude-memory-intelligence/refresh.js
```

### Check for Deprecated Patterns
```bash
# Check for class components (if migrating to functional)
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "class component"

# Check for old lifecycle methods
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "componentWillMount"
```

### Find Decisions by Domain
```bash
node ~/Projects/claude-memory-intelligence/decision-query.js --domain routing
node ~/Projects/claude-memory-intelligence/decision-query.js --domain state-management
node ~/Projects/claude-memory-intelligence/decision-query.js --domain components
```

## Integration with React Tools

### TypeScript
Memory system respects TypeScript configurations:
```json
{
  "react": {
    "typescript": true
  }
}
```

### Bundlers
Auto-detects and adapts to:
- Vite
- Webpack (CRA, custom)
- Create React App
- Parcel

### State Management
Compatible with:
- Redux Toolkit
- Zustand
- Jotai
- Recoil
- Context API

### Testing
Works alongside:
- Jest
- React Testing Library
- Vitest
- Cypress

## Best Practices

1. **Protect Core Services**
   - API client configuration
   - Authentication logic
   - Critical business rules

2. **Monitor Component Changes**
   - All component modifications
   - Hook dependency changes
   - Context provider updates

3. **Track State Decisions**
   - State structure changes
   - Action/reducer patterns
   - Store middleware configuration

4. **Use Decision Queries**
   - Before major refactoring
   - When adding new state management
   - To avoid deprecated React patterns

## Common Scenarios

### Adding a New Feature
```bash
# Before implementation, check for similar features
node ~/Projects/claude-memory-intelligence/decision-query.js --search "user profile"

# Implement feature...

# Memory automatically captures the pattern
```

### Refactoring Components
```bash
# Check current patterns
node ~/Projects/claude-memory-intelligence/decision-query.js --domain components

# Refactor following established patterns...

# Memory tracks the changes
```

### Performance Optimization
```bash
# Document optimization decision
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain performance \
  --decision "Lazy load route components" \
  --rationale "Reduce initial bundle size by 40%"
```

## Troubleshooting

### Hot Reload Performance
If memory updates slow down HMR:
```json
{
  "performance": {
    "updateThrottleMs": 300,
    "maxConcurrentUpdates": 3
  }
}
```

### Build Issues
Ensure build directories are ignored:
```json
{
  "boundaries": {
    "ignored": [
      "build/**",
      "dist/**",
      ".cache/**"
    ]
  }
}
```

### Vite-Specific Issues
For Vite projects:
```json
{
  "boundaries": {
    "ignored": [
      "node_modules/.vite/**",
      "dist/**"
    ]
  }
}
```

## Migration Guides

### From Class to Functional Components
```bash
# Document the migration
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain components \
  --decision "Migrate to functional components with hooks" \
  --rationale "Better code reuse, simpler testing, modern React"
```

### State Management Changes
```bash
# Document Redux → Zustand migration
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain state-management \
  --decision "Migrate from Redux to Zustand" \
  --rationale "Simpler API, less boilerplate, better TypeScript"
```

## Support

- React Docs: https://react.dev
- Memory Intelligence: `~/Projects/claude-memory-intelligence/README.md`
- Template Issues: Check default template for general guidance

## License

MIT License - Use freely in your React projects
