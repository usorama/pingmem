# Next.js Memory Intelligence Template

## Overview
Optimized memory intelligence configuration for Next.js projects with App Router, TypeScript, and modern Next.js patterns.

## Key Features

### Next.js-Specific Protections
- **Middleware**: `middleware.ts`, `next.config.js` - Critical routing/config files
- **Protected API Routes**: `src/app/api/protected/**` - Secure backend routes
- **Core Services**: `src/protected-core/**`, `src/core/**` - Business logic
- **Database**: `prisma/schema.prisma`, `supabase/migrations/**` - Schema files

### Monitored Patterns
- All TypeScript/JavaScript files (`**/*.{ts,tsx,js,jsx}`)
- Next.js directories: `app/**`, `pages/**`, `components/**`
- Configuration files: `*.config.{js,ts,mjs}`, `package.json`
- Library code: `lib/**`, `src/lib/**`

### Next.js Exclusions
- Build artifacts: `.next/**`, `out/**`
- Dependencies: `node_modules/**`
- Lock files: `*.lock`, `pnpm-lock.yaml`
- Framework internals: `.vercel/**`, `.turbo/**`

## Quick Start

### 1. Copy Template
```bash
# From your Next.js project root
cp ~/Projects/claude-memory-intelligence/templates/nextjs/.memory-config.json .
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

# Verify installation
ls -la .claude/hooks/
```

### 4. Customize for Your Project
Edit `.memory-config.json`:

```json
{
  "boundaries": {
    "protected": [
      "middleware.ts",
      "src/app/api/auth/**",        // Your auth routes
      "src/lib/database/**",         // Your database code
      "src/services/payment/**"      // Critical business logic
    ]
  }
}
```

## Next.js Project Structure

The template assumes this common structure:

```
your-nextjs-app/
├── app/                          # App Router (monitored)
│   ├── api/
│   │   ├── protected/**         # Protected API routes
│   │   └── public/**            # Public API routes
│   ├── (auth)/                  # Auth group routes
│   └── layout.tsx
├── src/
│   ├── protected-core/**        # Protected core services
│   ├── components/              # Monitored components
│   └── lib/                     # Monitored utilities
├── middleware.ts                # Protected
├── next.config.js               # Protected
├── .memory-config.json          # Memory intelligence config
└── .memories/                   # Auto-generated (gitignored)
```

## Configuration Examples

### Example 1: Supabase + Auth Setup
```json
{
  "boundaries": {
    "protected": [
      "middleware.ts",
      "src/lib/supabase/client.ts",
      "src/lib/supabase/server.ts",
      "src/app/api/auth/**",
      "supabase/migrations/**"
    ]
  }
}
```

### Example 2: Prisma + tRPC Setup
```json
{
  "boundaries": {
    "protected": [
      "prisma/schema.prisma",
      "src/server/db.ts",
      "src/server/api/trpc.ts",
      "src/server/api/routers/**"
    ],
    "monitored": [
      "**/*.ts",
      "**/*.tsx",
      "src/server/**",
      "src/app/**"
    ]
  }
}
```

### Example 3: Monorepo with Turborepo
```json
{
  "boundaries": {
    "protected": [
      "packages/core/**",
      "packages/database/**",
      "apps/*/middleware.ts"
    ],
    "ignored": [
      "node_modules/**",
      ".turbo/**",
      "dist/**",
      "apps/*/.next/**"
    ]
  }
}
```

## Next.js-Specific Workflows

### API Route Changes
When modifying API routes, memory tracks:
- Route handlers (GET, POST, PUT, DELETE)
- Middleware usage
- Auth/validation patterns
- Protected vs public routes

### Component Development
Memory captures:
- Server vs Client components
- Use of Next.js features (Image, Link, etc.)
- Data fetching patterns (Server Components, streaming)
- State management approaches

### Database Migrations
Automatically tracks:
- Schema changes (`prisma/schema.prisma`)
- Supabase migrations (`supabase/migrations/**`)
- Database service modifications

## Protected Patterns

### Common Protected Files
```
middleware.ts              # Route protection/redirects
next.config.js            # Build configuration
src/app/api/protected/**  # Secure endpoints
src/lib/auth/core.ts      # Auth core logic
src/services/payment/**   # Payment processing
```

### Why These Are Protected
- **Middleware**: Controls all request routing and auth
- **Config**: Build-time configuration affects entire app
- **Protected APIs**: Security-critical backend logic
- **Core Services**: Business logic that should remain stable

## Memory Intelligence Features

### Codebase Tracking
- Tracks all component, route, and API changes
- Monitors TypeScript type definitions
- Captures configuration updates
- Records dependency changes

### Decision Intelligence
Captures decisions about:
- Why App Router vs Pages Router patterns chosen
- Server Component vs Client Component decisions
- API route design patterns
- Authentication/authorization strategies
- Data fetching approaches

### Intent Analysis
Uses hybrid LLM + heuristics to detect:
- Feature additions vs bug fixes
- Refactoring vs new implementations
- Configuration changes vs code changes
- Breaking changes vs safe updates

## Commands

### Refresh Memory
```bash
node ~/Projects/claude-memory-intelligence/refresh.js
```

### Check for Deprecated Patterns
```bash
# Check if using old Next.js patterns
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "getServerSideProps"
node ~/Projects/claude-memory-intelligence/decision-query.js --check-deprecated "pages directory"
```

### Find Decisions by Domain
```bash
node ~/Projects/claude-memory-intelligence/decision-query.js --domain routing
node ~/Projects/claude-memory-intelligence/decision-query.js --domain api
node ~/Projects/claude-memory-intelligence/decision-query.js --domain auth
```

## Integration with Next.js Tools

### TypeScript
Memory system respects TypeScript strict mode:
```json
{
  "nextjs": {
    "typescript": true
  }
}
```

### Environment Variables
Monitors changes to:
- `.env.local`
- `.env.production`
- `next.config.js` env configuration

### Vercel Deployment
Compatible with Vercel:
- `.memories/` is gitignored (local only)
- `.memory-config.json` can be committed
- No impact on build/deploy process

## Best Practices

1. **Protect Critical Routes**
   - Always protect `middleware.ts`
   - Mark auth-related APIs as protected
   - Secure payment/checkout routes

2. **Monitor Component Changes**
   - Track all component modifications
   - Capture design pattern decisions
   - Document Server vs Client component choices

3. **Database Schema Protection**
   - Protect schema files
   - Track migration history
   - Document breaking schema changes

4. **Use Decision Queries**
   - Before implementing new patterns
   - When refactoring existing code
   - To avoid deprecated Next.js features

## Troubleshooting

### Build Issues
If memory tracking affects builds:
```bash
# Ensure .next is ignored
echo ".next/**" >> .memory-config.json
# Under boundaries.ignored
```

### Vercel Deployment
Memory system is local-only:
- `.memories/` should be in `.gitignore`
- Only `.memory-config.json` is committed
- No build-time dependencies

### Hot Reload Performance
If memory updates slow down dev:
```json
{
  "performance": {
    "updateThrottleMs": 500,  // Increase throttle
    "maxConcurrentUpdates": 3  // Reduce concurrent updates
  }
}
```

## Migration from Pages Router

If migrating to App Router:
```bash
# Document the migration decision
node ~/Projects/claude-memory-intelligence/decision-capture.js \
  --domain routing \
  --decision "Migration from Pages Router to App Router" \
  --rationale "Better performance, streaming, server components"
```

## Support

- Next.js Docs: https://nextjs.org/docs
- Memory Intelligence: `~/Projects/claude-memory-intelligence/README.md`
- Template Issues: Check default template for general guidance

## License

MIT License - Use freely in your Next.js projects
