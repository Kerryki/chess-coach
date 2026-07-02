# Chess Coach - Architecture Documentation

## System Overview

Chess Coach is a client-side chess analysis and coaching application built with Next.js. It combines three core systems:

1. **Chess Analysis** - PGN parsing, move validation, and board state management
2. **Engine Analysis** - Stockfish.js for position evaluation
3. **AI Coaching** - Claude AI for adaptive, skill-based explanations

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        User Input                            │
│                                                              │
│  • PGN Text Paste  • Lichess.org URL  • Manual Move Entry    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Game Input Pipeline                        │
│                                                              │
│  GameInput.tsx → useGameInput hook → PGN Fetcher/Parser     │
│                                                              │
│  • Fetch from Lichess API  • Parse PGN notation             │
│  • Validate moves         • Extract metadata                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Game State (ParsedPgn)                    │
│                                                              │
│  • Moves list              • Move tree/variants             │
│  • Player info             • Event metadata                 │
│  • Initial position        • Result                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │          │
                    ▼          ▼
        ┌──────────────────┐  ┌───────────────────┐
        │ Board Management │  │ Engine Analysis   │
        └──────────────────┘  └───────────────────┘
                    │          │
                    │ Current  │ Position
                    │ Position │ Evaluation
                    │          │
                    └────┬─────┘
                         │
                    ┌────┴────┐
                    │          │
                    ▼          ▼
        ┌──────────────────┐  ┌───────────────────┐
        │  Coaching Panel  │  │ Analysis Panel    │
        │   (Moments)      │  │ (Eval Display)    │
        └────────┬─────────┘  └─────────────────┘
                 │
            ┌────▼────────────────┐
            │ Coaching Analyzer   │
            │ (Moment Detection)  │
            └────┬────────────────┘
                 │
            ┌────▼──────────────────┐
            │ Claude AI Integration │
            │ (Adaptive Coaching)   │
            └─────────────────────┘
```

## Component Architecture

### Page Structure (`app/`)

```
app/
├── page.tsx                      # Main entry point (orchestrator)
│   ├── Manages game state
│   ├── Handles game loading
│   └── Routes to GameInput or BoardLayout
│
├── layout.tsx                    # Root layout
│   ├── Global styles
│   ├── Provider setup
│   └── Document head
│
└── components/                   # Feature components
    ├── GameInput.tsx             # PGN input form (orchestrator)
    │   ├── GameInputForm.tsx     # Form UI
    │   └── Integrates useGameInput hook
    │
    ├── BoardLayout.tsx           # Board display container
    │   ├── Chessboard.tsx        # Board visualization
    │   ├── MoveNavigation.tsx    # Move list/controls
    │   ├── GameInfo.tsx          # Game metadata
    │   ├── AnalysisPanel.tsx     # Stockfish evaluation
    │   ├── CoachingPanel.tsx     # AI coaching display
    │   │   ├── MomentCard.tsx    # Individual moment card
    │   │   └── DeepDiveModal.tsx # Stream UI for explanations
    │   └── SettingsButton.tsx    # Settings access
    │
    ├── SettingsModal.tsx         # Settings dialog
    │   └── Manages API key & skill level
    │
    ├── ErrorAlert.tsx            # Error display
    └── LoadingSpinner.tsx        # Loading state UI
```

### Business Logic (`lib/`)

```
lib/
│
├── chess/                        # Chess domain logic
│   ├── pgn/                      # PGN parsing & fetching
│   │   ├── fetcher.ts           # Lichess API integration
│   │   ├── parser.ts            # PGN notation parser
│   │   └── types.ts             # PGN-related types
│   │
│   ├── board/                    # Board state management
│   │   ├── board.ts             # Board state representation
│   │   ├── moves.ts             # Move validation & generation
│   │   └── notation.ts          # Coordinate conversions
│   │
│   └── engine/                   # Stockfish integration
│       ├── worker.ts            # Stockfish worker wrapper
│       ├── analyzer.ts          # Position analysis
│       └── evaluator.ts         # Evaluation metrics
│
├── coaching/                     # AI coaching logic
│   ├── analyzer.ts              # Moment detection algorithm
│   ├── evaluator.ts             # Moment classification
│   ├── classifier.ts            # Error type detection
│   └── promptBuilder.ts         # Claude prompt construction
│
├── hooks/                        # React custom hooks
│   ├── useGameInput.ts          # PGN fetch/parse orchestration
│   ├── useGameNavigation.ts     # Move navigation state
│   ├── useEngineAnalysis.ts     # Stockfish evaluation
│   ├── useCoaching.ts           # Coaching moment detection
│   ├── useDeepDive.ts           # Claude streaming
│   └── useSettings.ts           # Settings management
│
├── storage/                      # Browser storage
│   ├── settings.ts              # localStorage API wrappers
│   └── schemas.ts               # Storage validation schemas
│
├── types/                        # TypeScript definitions
│   ├── chess.ts                 # Chess domain types
│   ├── storage.ts               # Settings types
│   ├── errors.ts                # Error types
│   └── stockfish.d.ts           # Stockfish.js typings
│
├── constants/                    # Configuration
│   ├── config.ts                # App constants
│   ├── skillLevels.ts           # Skill level definitions
│   ├── errors.ts                # Error messages
│   └── limits.ts                # Performance limits
│
└── utils/                        # Utilities
    ├── errorHandler.ts          # Unified error handling
    ├── validation.ts            # Input validation
    ├── apiKeyValidator.ts       # API key validation
    └── logger.ts                # Application logging
```

## Type System

Chess Coach uses TypeScript with strict mode enabled. Key types:

### Game Types
```typescript
interface ParsedPgn {
  moves: Move[]
  metadata: GameMetadata
  initialPosition: Position
  moveCount: number
  playerWhite: PlayerInfo
  playerBlack: PlayerInfo
  result: GameResult
}

interface Move {
  san: string                    // e.g., "e4", "Nxf7"
  uci: string                    // e.g., "e2e4"
  position: Position            // Position after move
  index: number
  evaluation?: Evaluation        // Added by engine
  moment?: CoachingMoment       // Added by coaching analyzer
}

interface Position {
  fen: string                    // Forsyth-Edwards Notation
  board: Board
  toMove: 'w' | 'b'
}
```

### Coaching Types
```typescript
interface CoachingMoment {
  moveIndex: number
  type: MomentType             // 'blunder' | 'mistake' | 'missed_tactic'
  severity: 'critical' | 'significant' | 'minor'
  evaluation: {
    before: number             // eval before move (cp)
    after: number              // eval after move (cp)
    loss: number               // eval loss (cp)
  }
  reason?: string              // Why it's a moment
}

interface SkillLevelConfig {
  level: 'beginner' | 'intermediate' | 'advanced'
  maxDepth: number            // Explanation complexity
  useTacticalLanguage: boolean
  useStrategyTerms: boolean
}
```

### Error Types
```typescript
interface AppError {
  code: ErrorCode
  message: string              // Technical message (logging)
  userMessage: string          // User-friendly message
  timestamp: number
  context?: Record<string, unknown>
}

type ErrorCode = 
  | 'PGN_PARSE_ERROR'
  | 'API_ERROR'
  | 'ENGINE_ERROR'
  | 'MISSING_API_KEY'
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'UNKNOWN_ERROR'
```

## Data Flow Details

### 1. Game Loading Pipeline

```
User Input (PGN/URL)
        ↓
GameInputForm validates format
        ↓
useGameInput hook processes:
    ├─ Fetch from Lichess API (if URL)
    ├─ Parse PGN notation
    ├─ Validate moves
    └─ Extract metadata
        ↓
ParsedPgn object created
        ↓
Passed to BoardLayout
```

### 2. Analysis Pipeline

```
CurrentMove from navigation
        ↓
useEngineAnalysis hook:
    ├─ Get position FEN
    ├─ Send to Stockfish worker
    ├─ Receive evaluation (Cp, Mate#, depth)
    └─ Update AnalysisPanel
        ↓
useCoaching hook:
    ├─ Detect moment (blunder/mistake/tactic)
    ├─ Classify severity
    ├─ Store CoachingMoment
    └─ Update CoachingPanel
        ↓
User sees:
    ├─ Evaluation (Analysis Panel)
    ├─ Coaching moment highlight
    └─ "Explain" button (if moment)
```

### 3. Coaching Explanation Pipeline

```
User clicks "Explain" on moment
        ↓
DeepDiveModal opens
        ↓
useDeepDive hook constructs prompt:
    ├─ Game context
    ├─ Move context
    ├─ Moment type & severity
    ├─ Skill level config
    └─ Previous position analysis
        ↓
Stream Claude response to PromptBuilder
        ↓
Real-time display updates
        ↓
Explanation complete
```

## Key Algorithms

### Moment Detection (`lib/coaching/analyzer.ts`)

```typescript
Algorithm: detectCoachingMoments(moves: Move[]): CoachingMoment[]

For each move:
  1. Get evaluation before move
  2. Get evaluation after move
  3. Calculate eval loss (delta)
  
  4. If eval loss > threshold:
    - Type = 'blunder' (loss > 300cp)
    - Type = 'mistake' (loss > 100cp)
    - Type = 'missed_tactic' (opponent had better move)
  
  5. Classify severity:
    - critical: Loss > 500cp
    - significant: Loss > 200cp
    - minor: Loss < 200cp
  
  6. Generate coaching context
```

### Skill Level Adaptation (`lib/coaching/promptBuilder.ts`)

```typescript
Function: buildCoachingPrompt(
  moment: CoachingMoment,
  skillLevel: SkillLevel,
  context: AnalysisContext
): string

1. Select explanation style based on level:
   - Beginner: Simple terms, fundamental concepts
   - Intermediate: Positional ideas, tactic patterns
   - Advanced: Deep strategy, engine insights

2. Construct prompt with:
   - Move context (what happened before/after)
   - Position evaluation (why it's bad)
   - Alternative suggestions (better moves)
   - Learning point (what to learn from this)

3. Include skill-level specific:
   - Beginner: "Why blunders happen"
   - Intermediate: "Position evaluation explained"
   - Advanced: "Engine line analysis"
```

## Performance Considerations

### Browser-Side Processing
- **PGN Parsing** - O(n) where n = number of moves
- **Move Validation** - O(1) per move with chess.js
- **Stockfish Analysis** - Depth-dependent (typically 2-3 seconds per position)
- **Claude Streaming** - Real-time; stops when complete

### Memory Usage
- **Game State** - ~5-10KB per game (typical)
- **Stockfish Worker** - ~50MB (pre-built binary)
- **Component State** - Minimal (hooks manage efficiently)

### Optimization Strategies
1. **Web Workers** - Stockfish runs on dedicated thread
2. **Lazy Evaluation** - Analyze only when position changes
3. **Streaming Responses** - Claude explanations stream in real-time
4. **Memoization** - React.memo on expensive components
5. **Code Splitting** - Next.js automatic route-based splitting

## Error Handling Strategy

### Error Layers

```
1. Input Validation Layer
   └─ Validate PGN format
   └─ Validate API key
   └─ Check Lichess URL format

2. Processing Layer
   ├─ PGN parsing errors → User message
   ├─ Move validation errors → Suggest correction
   └─ Stockfish errors → Graceful fallback

3. API Layer
   ├─ Network errors → Retry with backoff
   ├─ Claude errors → User message + error details
   └─ Lichess errors → Fallback to PGN input

4. Storage Layer
   ├─ localStorage errors → Fallback to defaults
   └─ Settings loss → Warning + reset prompt

5. Display Layer
   └─ Component errors → ErrorBoundary (if added)
```

### Error Recovery

```typescript
Pattern: Try → Validate → Handle → Recover

try {
  const result = await riskyOperation()
  return success(result)
} catch (error) {
  const appError = normalizeError(error)
  log(appError)
  
  // Recover if possible
  if (appError.recoverable) {
    return fallbackResult()
  }
  
  // Show user error
  showUserMessage(appError.userMessage)
  throw appError
}
```

## Security Considerations

### API Key Management
- **Storage** - localStorage with warning about local machine
- **Transmission** - HTTPS only (Vercel enforces)
- **Exposure** - Never logged, never exposed in errors
- **Rotation** - User-controlled via settings modal

### Input Validation
- **PGN** - Validated against chess.js parser
- **URLs** - Check hostname === lichess.org
- **API Responses** - Validated with Zod schemas

### Content Security
- **Cross-Site Scripting** - React auto-escapes by default
- **CSRF** - N/A (stateless API calls)
- **Headers** - Vercel configured with security headers

## Testing Strategy

### Test Coverage (80%+ required)
- **Unit Tests** - Individual functions (lib/)
- **Integration Tests** - Hook combinations, API flows
- **Component Tests** - UI rendering and interactions
- **E2E Tests** - Critical user flows with Playwright

### Test Organization
```
__tests__/
├── unit/
│   ├── chess/          # PGN parser, board logic
│   ├── coaching/       # Moment detection, prompts
│   ├── utils/          # Validation, error handling
│   └── storage/        # localStorage wrappers
│
├── integration/        # Hook and API flows
│
└── e2e/               # Playwright critical paths
```

## Deployment Architecture

Chess Coach deploys to Vercel as a Next.js application:

### Build Pipeline
```
npm run ci
├─ npm run lint      → Code style check
├─ npm run type-check → TypeScript verification
├─ npm run test      → Unit & integration tests
└─ npm run build     → Next.js production build
```

### Runtime Environment
- **Platform** - Vercel Edge (deployment) + Serverless Functions
- **Environment Variables** - ANTHROPIC_API_KEY (required)
- **Storage** - Browser localStorage (all user data local)
- **CDN** - Vercel global CDN for assets

### Production Optimizations
- **Code Splitting** - Route-based automatic splitting
- **Image Optimization** - Next.js Image component
- **CSS Minification** - Next.js built-in
- **JavaScript Minification** - Terser via Next.js

## Monitoring & Logging

### Client-Side Logging
```typescript
logger.info(message, context)     // Info messages
logger.warn(message, context)     // Warnings
logger.error(message, error)      // Errors
```

### Log Levels
- **Info** - User actions, initialization
- **Warn** - Potential issues, fallbacks
- **Error** - Failures, exceptions

### Note on Production Logging
- Logs go to browser console only
- No server-side logs (client-side app)
- Errors captured in ErrorAlert component
- Consider integrating Sentry for production monitoring

## Future Architecture Improvements

1. **Service Worker** - Offline support
2. **IndexedDB** - Local game database
3. **WebAssembly** - Faster chess engine
4. **Real-time Collaboration** - Game sharing
5. **Backend API** - Game storage, user accounts
