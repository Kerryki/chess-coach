# Chess Coach - Development Guide

This guide covers local development, testing, debugging, and deployment workflows for Chess Coach.

## Environment Setup

### Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **npm** 9+ (check with `npm --version`)
- **Git** for version control
- **Code Editor** - VS Code recommended
- **Anthropic API Key** - Get one free at [console.anthropic.com](https://console.anthropic.com/account/keys)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/yourusername/chess-coach.git
cd chess-coach

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your API key to .env.local
# ANTHROPIC_API_KEY=your_key_here
```

### Verify Installation

```bash
# Check TypeScript compilation
npm run type-check

# Run linter
npm run lint

# Run tests (should have 80%+ coverage)
npm run coverage

# Start dev server
npm run dev

# Visit http://localhost:3000 in browser
```

## Running the Application

### Development Server

```bash
npm run dev
```

Starts Next.js in development mode:
- Auto-reload on file changes
- Source maps for debugging
- Detailed error messages
- Running on http://localhost:3000

### Production Build & Start

```bash
# Build for production
npm run build

# Start production server
npm start
```

This optimizes for performance - similar to what runs on Vercel.

## Testing

### Unit & Integration Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm test -- --watch

# Run specific test file
npm test -- fileName

# Run tests matching pattern
npm test -- --testNamePattern="pattern"

# Generate coverage report
npm run coverage
```

**Coverage Report:**
Open `coverage/lcov-report/index.html` in browser to explore covered/uncovered code.

**Coverage Target:** 80% (enforced)

### E2E Tests

```bash
# Run E2E tests (requires dev server running)
npm run dev &  # Start in background
npm run test:e2e

# Run specific E2E test
npx playwright test tests/specific.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode (interactive)
npx playwright test --debug
```

**E2E Test Locations:** `__tests__/e2e/` and `playwright.config.ts`

### CI Pipeline (Local)

```bash
# Simulate GitHub Actions locally
npm run ci

# This runs:
# 1. npm run lint       → Code style
# 2. npm run type-check → TypeScript
# 3. npm run test       → Unit/integration tests
# 4. npm run build      → Production build

# All must pass before merging to main
```

## Code Style & Formatting

### Linting

```bash
# Check for style issues
npm run lint

# Auto-fix fixable issues
npx eslint . --fix
```

### Formatting

The project uses Prettier for consistent code formatting. Automatically applied on save if using VS Code extension.

```bash
# Format all files
npx prettier --write .

# Check formatting without changing
npx prettier --check .
```

### TypeScript

```bash
# Type check without building
npm run type-check

# Full build with type checking
npm run build
```

**TypeScript Settings:** See `tsconfig.json`
- Strict mode enabled
- All implicit types rejected
- No unused variables or parameters

## Coding Standards

### File Organization

**MANY SMALL FILES > FEW LARGE FILES**

- Maximum 400 lines per file (800 absolute limit)
- Extract utilities when a file gets large
- Organize by feature/domain, not by type (e.g., `lib/chess/` not `lib/utils/chess/`)

### Naming Conventions

```typescript
// Files: kebab-case (e.g., pgn-parser.ts)
// Components: PascalCase (e.g., GameInput.tsx)
// Hooks: camelCase with 'use' prefix (e.g., useGameInput.ts)
// Functions: camelCase (e.g., parseMove)
// Constants: UPPER_SNAKE_CASE (e.g., MAX_DEPTH)
// Types/Interfaces: PascalCase (e.g., ParsedPgn, MoveProps)
```

### Code Examples

#### Functions: Small and Focused
```typescript
// GOOD: Single responsibility, <50 lines
function parseMove(sanMove: string, position: Position): Move {
  const move = chess.move(sanMove)
  if (!move) {
    throw new Error(`Invalid move: ${sanMove}`)
  }
  return normalizeMove(move, position)
}

// BAD: Multiple responsibilities, hard to test
function processGame(pgnText: string, skill: string, apiKey: string) {
  // Parse, validate, analyze, coach...
  // 200+ lines doing many things
}
```

#### Components: Props with Types
```typescript
interface ChessboardProps {
  position: Position
  selectedSquare?: string
  onMove: (move: Move) => void
  disabled?: boolean
}

export function Chessboard({
  position,
  selectedSquare,
  onMove,
  disabled = false,
}: ChessboardProps): React.ReactElement {
  // Component implementation
}

// NOT: React.FC (avoid unless necessary)
```

#### Error Handling: Always Explicit
```typescript
// GOOD: Comprehensive error handling
async function loadGame(url: string): Promise<ParsedPgn> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const pgn = await response.text()
    return parsePgn(pgn)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Failed to load game', { url, error: message })
    throw new AppError('NETWORK_ERROR', message, 'Could not load game from URL')
  }
}

// BAD: Silent failure
async function loadGame(url: string) {
  const response = await fetch(url)
  const pgn = await response.text()
  return chess.parse(pgn)  // No error handling!
}
```

#### Immutability: Use Spread/Destructuring
```typescript
// GOOD: Immutable updates
function updateMove(move: Move, evaluation: number): Move {
  return {
    ...move,
    evaluation,
  }
}

// BAD: Mutation
function updateMove(move: Move, evaluation: number): Move {
  move.evaluation = evaluation  // Mutates original!
  return move
}
```

## Debugging

### Browser DevTools

1. Open http://localhost:3000 in Chrome/Firefox
2. Press F12 to open DevTools
3. Check Console tab for errors/warnings
4. Check Network tab for API calls
5. Use Sources tab to set breakpoints

### VS Code Debugging

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

Then press F5 to debug.

### Logging

Use the built-in logger (not console.log):

```typescript
import { logger } from '@/lib/utils/logger'

logger.info('Game loaded', { moveCount: 42 })
logger.warn('Slow position analysis', { depth: 20 })
logger.error('API call failed', error)
```

Benefits:
- Consistent format
- Easier to disable in production
- Context available for debugging

### Common Issues

#### Port 3000 Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
npm run dev -- -p 3001
```

#### Module Not Found Errors
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try again
npm run dev
```

#### API Key Errors
1. Check `.env.local` exists
2. Verify `ANTHROPIC_API_KEY=` line is present
3. No spaces around `=`
4. Key starts with `sk-ant-`
5. Restart dev server after changing env

#### Stockfish Worker Errors
- Check browser console for WASM errors
- Verify `node_modules/stockfish.js` exists
- Clear browser cache (Ctrl+Shift+Delete)
- Restart dev server

## Git Workflow

### Branch Strategy

```bash
# Create feature branch from main
git checkout -b feature/add-opening-book

# Make changes and test
npm run ci  # Verify all checks pass

# Commit with conventional message
git commit -m "feat: add opening book support

- Load openings from database
- Display recommended moves
- Explain opening principles"

# Push to remote
git push -u origin feature/add-opening-book

# Create pull request on GitHub
```

### Commit Message Format

```
<type>: <description>

<optional detailed body>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code cleanup (no behavior change)
- `test` - Test additions/changes
- `docs` - Documentation only
- `chore` - Build/dependency updates
- `perf` - Performance improvements

**Example:**
```
feat: add moment detection for blunders

Detect critical positions where player made blunders:
- Compare evaluations before/after move
- Classify as blunder/mistake/missed_tactic
- Generate coaching explanations for each moment
- Add 15 tests covering edge cases

Closes #42
```

### Pull Request Checklist

Before opening a PR:
- [ ] Branch created from latest `main`
- [ ] All tests pass: `npm run ci`
- [ ] Coverage >= 80%
- [ ] No console.log statements
- [ ] No hardcoded secrets
- [ ] Meaningful commit messages
- [ ] Changes documented (if user-facing)

## Deployment

### Vercel (Recommended)

#### First-Time Setup

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Deploy preview
vercel

# Deploy to production
vercel --prod
```

#### Environment Variables

Set in Vercel dashboard or CLI:

```bash
vercel env add ANTHROPIC_API_KEY
# Paste your API key when prompted

# Verify
vercel env list
```

#### Continuous Deployment

Push to `main` branch - Vercel automatically:
1. Runs CI pipeline (lint, test, build)
2. Deploys to staging on success
3. Creates deployment preview
4. Deploys to production on merge

#### Rollback

```bash
# View deployments
vercel ls

# Rollback to previous
vercel rollback
```

### Local Production Testing

```bash
# Build for production
npm run build

# Start production server
npm start

# Visit http://localhost:3000

# Should see optimized bundle, same as Vercel
```

### Docker (Alternative)

If deploying to Docker:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker build -t chess-coach .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-... chess-coach
```

## Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm install -g next-bundle-analyzer
# Configure in next.config.js and run build
npm run build
```

### Code Splitting

Next.js automatically splits by route. For manual splitting:

```typescript
import dynamic from 'next/dynamic'

// Load component only when needed
const ExpensiveComponent = dynamic(() => import('@/components/Expensive'), {
  loading: () => <p>Loading...</p>,
})
```

### Image Optimization

Use Next.js Image component (not `<img>`):

```typescript
import Image from 'next/image'

export function Logo() {
  return (
    <Image
      src="/chess-logo.png"
      alt="Chess Coach"
      width={200}
      height={200}
      priority  // Load immediately
    />
  )
}
```

### Database Queries (Future)

When adding backend:
- Use connection pooling
- Add query caching
- Implement pagination
- Create indexes on frequently queried fields

## Adding New Features

### Workflow

1. **Plan** - Create issue, discuss approach
2. **Create Branch** - `feature/my-feature`
3. **TDD**:
   - Write tests first (RED)
   - Implement code (GREEN)
   - Refactor (CLEAN)
4. **Verify Coverage** - `npm run coverage` >= 80%
5. **Code Review** - Get feedback
6. **Merge** - Squash or rebase to main

### Example: Adding Game Statistics

```bash
# 1. Create branch
git checkout -b feature/game-stats

# 2. Write test first
# __tests__/unit/coaching/stats-calculator.test.ts
// Test calculateStats function

# 3. Implement feature
# lib/coaching/stats-calculator.ts
// Calculate win rate, accuracy, etc.

# 4. Verify coverage
npm run coverage

# 5. Add UI component
# app/components/StatsPanel.tsx
// Display stats

# 6. Commit
git commit -m "feat: add game statistics display"

# 7. Push and create PR
git push -u origin feature/game-stats
```

## Troubleshooting

### Test Failures

```bash
# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- statsCalculator.test.ts

# Debug in Node
node --inspect-brk node_modules/.bin/jest --runInBand
```

**Common Issues:**
- **Timeout** - Increase with `jest.setTimeout(10000)`
- **Mock issues** - Check jest.setup.js
- **Coverage drops** - Write tests for new code before merging

### Build Failures

```bash
# Clear cache
rm -rf .next node_modules
npm install

# Try again
npm run build

# Check for errors in output
```

**Common Issues:**
- TypeScript errors - run `npm run type-check` for details
- Missing dependencies - run `npm install`
- Large bundle - check imports, may need dynamic loading

### API Errors

```
Error: ANTHROPIC_API_KEY not configured
→ Check .env.local file exists
→ Verify ANTHROPIC_API_KEY line
→ Restart dev server

Error: Authentication failed
→ API key may be invalid
→ Check key format (sk-ant-...)
→ Regenerate key from Anthropic dashboard
→ Update .env.local
```

## Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Anthropic Claude API](https://docs.anthropic.com)

### Tools
- [VS Code](https://code.visualstudio.com/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Lichess API](https://lichess.org/api)

### Learning
- [Next.js Tutorial](https://nextjs.org/learn)
- [React Patterns](https://patterns.dev/react)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

## Contributing

See [.github/CONTRIBUTING.md](./.github/CONTRIBUTING.md) for contribution guidelines.

## Support

- **Questions?** Open an issue on GitHub
- **Bug Report?** Include steps to reproduce
- **Feature Request?** Describe use case and expected behavior
- **Security Issue?** Email maintainers privately
