# Chess Coach - Public API Reference

This document describes the public APIs exposed by Chess Coach for potential future integrations, extensions, and plugin development.

**Note:** Chess Coach is currently a client-side only application. These APIs are exported from the `lib/` modules and are available for internal use and future server-side integration.

## Core Types

### Chess Domain Types

#### Position

```typescript
interface Position {
  fen: string              // Forsyth-Edwards Notation (e.g., "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
  board: Board             // 2D array representing board state
  toMove: 'w' | 'b'        // Whose turn it is ('w' = white, 'b' = black)
}
```

#### Move

```typescript
interface Move {
  san: string              // Standard Algebraic Notation (e.g., "e4", "Nxf7", "O-O")
  uci: string              // UCI notation (e.g., "e2e4")
  position: Position       // Position after this move
  index: number            // Move index in game (0-based)
  evaluation?: Evaluation  // Engine evaluation (if analyzed)
  moment?: CoachingMoment  // Coaching moment (if detected)
}
```

#### Evaluation

```typescript
interface Evaluation {
  cp?: number              // Centipawns: positive = white advantage, negative = black advantage
  mate?: number            // Checkmate in N moves (positive = white wins, negative = black wins)
  depth: number            // Search depth in plies
  nodes: number            // Nodes evaluated
  time: number             // Analysis time in milliseconds
}
```

#### ParsedPgn

```typescript
interface ParsedPgn {
  moves: Move[]            // List of all moves in game
  metadata: GameMetadata   // Game information (players, date, event, etc.)
  initialPosition: Position // Starting position (usually starting position)
  moveCount: number        // Total number of moves
  playerWhite: PlayerInfo  // White player details
  playerBlack: PlayerInfo  // Black player details
  result: GameResult       // Game outcome ('1-0' | '0-1' | '1/2-1/2' | '*')
}

interface GameMetadata {
  event?: string           // Tournament/competition name
  site?: string            // Location or platform
  date?: string            // Game date (YYYY.MM.DD format)
  round?: string           // Tournament round
  timeControl?: string     // Time control (e.g., "300+3")
  termination?: string     // How game ended
  eco?: string             // ECO opening code
}

interface PlayerInfo {
  name: string
  rating?: number          // Elo rating at time of game
  title?: string           // GM, IM, FM, etc.
}

type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*'  // White wins, Black wins, Draw, Unfinished
```

### Coaching Types

#### CoachingMoment

```typescript
interface CoachingMoment {
  moveIndex: number        // Index of the move this moment is for
  type: MomentType         // Type of moment
  severity: Severity       // How important this moment is
  evaluation: EvalDelta    // Position evaluation before/after
  reason?: string          // Explanation of why this is a moment
}

type MomentType = 'blunder' | 'mistake' | 'missed_tactic' | 'good_move' | 'brilliant_move'

type Severity = 'critical' | 'significant' | 'minor'

interface EvalDelta {
  before: number           // Evaluation before move (cp)
  after: number            // Evaluation after move (cp)
  loss: number             // Absolute value of eval loss (cp)
}
```

#### CoachingResponse

```typescript
interface CoachingResponse {
  explanation: string      // AI-generated explanation
  skillLevel: SkillLevel   // Level the explanation was adapted for
  suggestedMove?: string   // Better move if applicable (in SAN notation)
  followUpPoints?: string[] // Key takeaways/learning points
}

type SkillLevel = 'beginner' | 'intermediate' | 'advanced'
```

### Error Types

#### AppError

```typescript
interface AppError extends Error {
  code: ErrorCode
  message: string          // Technical error message
  userMessage: string      // User-friendly error message
  timestamp: number        // Error creation time (ms since epoch)
  context?: Record<string, unknown> // Additional debugging context
}

type ErrorCode =
  | 'PGN_PARSE_ERROR'      // Invalid PGN notation
  | 'API_ERROR'            // External API call failed
  | 'ENGINE_ERROR'         // Stockfish analysis failed
  | 'MISSING_API_KEY'      // ANTHROPIC_API_KEY not configured
  | 'VALIDATION_ERROR'     // Input validation failed
  | 'NETWORK_ERROR'        // Network request failed
  | 'STORAGE_ERROR'        // localStorage access failed
  | 'UNKNOWN_ERROR'        // Other/unclassified error
```

### Storage Types

#### UserSettings

```typescript
interface UserSettings {
  apiKey: string           // Anthropic API key for Claude
  skillLevel: SkillLevel   // User's chess skill level
  theme: 'light' | 'dark'  // UI theme preference
  boardOrientation: 'white' | 'black' // Board perspective
  soundEnabled: boolean    // Whether to play move sounds
}
```

## Module APIs

### `lib/chess/pgn/parser`

Parses PGN (Portable Game Notation) text into structured game data.

#### `parsePgn(pgnText: string): ParsedPgn`

Parses PGN notation and returns structured game data.

```typescript
import { parsePgn } from '@/lib/chess/pgn/parser'

const pgnText = `
[Event "World Championship"]
[Site "London"]
[Date "2024.01.15"]
[White "Carlsen, Magnus"]
[Black "Nakamura, Hikaru"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4
`

const game = parsePgn(pgnText)
console.log(game.playerWhite.name) // "Carlsen, Magnus"
console.log(game.moves.length)      // Number of moves
```

**Returns:** `ParsedPgn` object with all moves and metadata

**Throws:** `AppError` with code `PGN_PARSE_ERROR` if invalid notation

---

### `lib/chess/pgn/fetcher`

Fetches games from Lichess.org API and returns PGN.

#### `fetchGameFromLichess(url: string | gameId: string): Promise<string>`

Fetches game PGN from Lichess.

```typescript
import { fetchGameFromLichess } from '@/lib/chess/pgn/fetcher'

const pgn = await fetchGameFromLichess('abc123def')
const game = parsePgn(pgn)
```

**Parameters:**
- `url` - Full Lichess URL (e.g., `https://lichess.org/abc123def`) or just game ID (`abc123def`)

**Returns:** PGN string

**Throws:** `AppError` with code `NETWORK_ERROR` or `API_ERROR`

---

### `lib/chess/board/moves`

Move validation and generation utilities.

#### `isValidMove(sanMove: string, position: Position): boolean`

Checks if a move is valid in the given position.

```typescript
import { isValidMove } from '@/lib/chess/board/moves'

const valid = isValidMove('e4', startingPosition)
console.log(valid) // true
```

**Parameters:**
- `sanMove` - Move in Standard Algebraic Notation (e.g., "e4", "Nxf7")
- `position` - Current board position

**Returns:** `boolean` - Whether move is legal

---

#### `generateLegalMoves(position: Position): Move[]`

Generates all legal moves from a position.

```typescript
import { generateLegalMoves } from '@/lib/chess/board/moves'

const moves = generateLegalMoves(position)
console.log(moves.length) // Number of legal moves available
```

**Parameters:**
- `position` - Current board position

**Returns:** Array of legal `Move` objects

---

### `lib/chess/engine/analyzer`

Stockfish engine analysis interface.

#### `analyzePosition(position: Position, depth?: number): Promise<Evaluation>`

Analyzes a position with Stockfish and returns evaluation.

```typescript
import { analyzePosition } from '@/lib/chess/engine/analyzer'

const eval = await analyzePosition(position, 20)
console.log(eval.cp)    // Centipawn score
console.log(eval.depth) // Search depth achieved
```

**Parameters:**
- `position` - Position to analyze (FEN)
- `depth` (optional) - Search depth (default: auto-selected for ~2s analysis)

**Returns:** `Evaluation` object with cp, mate, depth info

**Throws:** `AppError` with code `ENGINE_ERROR` if analysis fails

---

### `lib/coaching/analyzer`

Coaching moment detection and analysis.

#### `detectCoachingMoments(moves: Move[]): CoachingMoment[]`

Scans a game for coaching moments (blunders, mistakes, missed tactics).

```typescript
import { detectCoachingMoments } from '@/lib/coaching/analyzer'

const moments = detectCoachingMoments(game.moves)
moments.forEach(moment => {
  console.log(`Move ${moment.moveIndex}: ${moment.type}`)
})
```

**Parameters:**
- `moves` - Array of analyzed moves (must include evaluations)

**Returns:** Array of `CoachingMoment` objects

---

#### `classifyMoment(move: Move, nextMove: Move): MomentType`

Classifies a move as blunder, mistake, missed tactic, etc.

```typescript
import { classifyMoment } from '@/lib/coaching/analyzer'

const moveType = classifyMoment(move1, move2)
// Returns: 'blunder' | 'mistake' | 'missed_tactic' | 'good_move' | 'brilliant_move'
```

**Parameters:**
- `move` - The move to classify
- `nextMove` - The move that followed

**Returns:** `MomentType`

---

### `lib/coaching/promptBuilder`

Prompt construction for Claude AI coaching.

#### `buildCoachingPrompt(moment: CoachingMoment, skillLevel: SkillLevel, context: AnalysisContext): string`

Constructs a prompt for Claude AI that's adapted to the user's skill level.

```typescript
import { buildCoachingPrompt } from '@/lib/coaching/promptBuilder'

const prompt = buildCoachingPrompt(
  moment,
  'intermediate',
  {
    move: 'Nxe5',
    position: currentPosition,
    evaluation: { before: 50, after: -200 },
  }
)

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  messages: [{ role: 'user', content: prompt }],
})
```

**Parameters:**
- `moment` - The coaching moment to explain
- `skillLevel` - User's chess skill level
- `context` - Position and evaluation context

**Returns:** Prompt string optimized for Claude

---

### `lib/storage/settings`

Browser storage for user settings.

#### `loadSettings(): UserSettings`

Loads user settings from localStorage.

```typescript
import { loadSettings } from '@/lib/storage/settings'

const settings = loadSettings()
console.log(settings.skillLevel) // 'beginner' | 'intermediate' | 'advanced'
console.log(settings.apiKey)     // User's API key (first 10 chars masked)
```

**Returns:** `UserSettings` object (or defaults if not saved)

---

#### `saveSettings(settings: UserSettings): void`

Saves user settings to localStorage.

```typescript
import { saveSettings, loadSettings } from '@/lib/storage/settings'

const settings = loadSettings()
settings.skillLevel = 'advanced'
saveSettings(settings)
```

**Parameters:**
- `settings` - Settings object to save

**Throws:** `AppError` with code `STORAGE_ERROR` if save fails

---

### `lib/utils/errorHandler`

Unified error handling utilities.

#### `normalizeError(error: unknown): AppError`

Converts any error to a standardized `AppError`.

```typescript
import { normalizeError } from '@/lib/utils/errorHandler'

try {
  // Some operation
} catch (error) {
  const appError = normalizeError(error)
  console.log(appError.userMessage) // User-friendly message
}
```

**Parameters:**
- `error` - Any type of error

**Returns:** `AppError` with code, message, and context

---

#### `getErrorMessage(error: AppError): string`

Extracts appropriate error message (user-friendly or technical).

```typescript
import { getErrorMessage } from '@/lib/utils/errorHandler'

const msg = getErrorMessage(appError)
// Returns user message if available, falls back to technical message
```

**Parameters:**
- `error` - `AppError` object

**Returns:** Error message string

---

### `lib/utils/validation`

Input validation utilities.

#### `validatePgn(pgnText: string): boolean`

Validates PGN notation format.

```typescript
import { validatePgn } from '@/lib/utils/validation'

if (validatePgn(userInput)) {
  const game = parsePgn(userInput)
}
```

**Parameters:**
- `pgnText` - PGN notation to validate

**Returns:** `boolean` - Whether PGN format is valid

---

#### `validateApiKey(key: string): boolean`

Validates Anthropic API key format.

```typescript
import { validateApiKey } from '@/lib/utils/validation'

if (!validateApiKey(apiKey)) {
  console.error('Invalid API key format')
}
```

**Parameters:**
- `key` - API key string

**Returns:** `boolean` - Whether key format is valid (starts with `sk-ant-`)

---

### `lib/utils/logger`

Application logging utility.

#### `logger.info(message: string, context?: Record<string, unknown>): void`

Logs informational message.

```typescript
import { logger } from '@/lib/utils/logger'

logger.info('Game loaded', { moveCount: 42, playerWhite: 'Magnus' })
```

---

#### `logger.warn(message: string, context?: Record<string, unknown>): void`

Logs warning message.

```typescript
logger.warn('Slow analysis', { depth: 25, timeMs: 3500 })
```

---

#### `logger.error(message: string, error: Error): void`

Logs error with exception details.

```typescript
try {
  // operation
} catch (error) {
  logger.error('Operation failed', error)
}
```

---

## React Hooks (Client-Side Only)

### `lib/hooks/useGameInput`

Orchestrates PGN loading and parsing.

```typescript
import { useGameInput } from '@/lib/hooks/useGameInput'

const {
  game,
  loading,
  error,
  loadFromUrl,
  loadFromPgn,
} = useGameInput()

// Load from Lichess
await loadFromUrl('https://lichess.org/abc123def')

// Load from PGN text
await loadFromPgn('1. e4 c5 2. Nf3 d6')
```

**Returns:**
- `game: ParsedPgn | null` - Loaded game (null while loading)
- `loading: boolean` - Whether currently loading
- `error: AppError | null` - Error (if any)
- `loadFromUrl(url: string): Promise<void>` - Load from Lichess URL
- `loadFromPgn(pgn: string): Promise<void>` - Load from PGN text

---

### `lib/hooks/useEngineAnalysis`

Analyzes positions with Stockfish.

```typescript
import { useEngineAnalysis } from '@/lib/hooks/useEngineAnalysis'

const {
  evaluation,
  analyzing,
  analyzePosition,
} = useEngineAnalysis()

await analyzePosition(position)
// evaluation is now populated
```

**Returns:**
- `evaluation: Evaluation | null` - Latest evaluation
- `analyzing: boolean` - Whether analysis in progress
- `analyzePosition(position: Position): Promise<void>` - Analyze

---

### `lib/hooks/useCoaching`

Detects coaching moments and generates explanations.

```typescript
import { useCoaching } from '@/lib/hooks/useCoaching'

const {
  moments,
  getExplanation,
  explaining,
} = useCoaching(game)

// Detect moments automatically
const moments = await getExplanation(moveIndex, skillLevel)
```

**Returns:**
- `moments: CoachingMoment[]` - Detected moments in game
- `getExplanation(index: number, level: SkillLevel): Promise<string>` - Get AI explanation
- `explaining: boolean` - Whether generating explanation

---

## Streaming API (Claude)

For deep dive explanations, Chess Coach streams responses from Claude:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const stream = await client.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  stream: true,
  messages: [
    {
      role: 'user',
      content: buildCoachingPrompt(moment, skillLevel, context),
    },
  ],
})

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    console.log(chunk.delta.text)
  }
}
```

---

## Constants

### Configuration (`lib/constants/config`)

```typescript
export const CONFIG = {
  MAX_PGN_LENGTH: 50000,      // Max PGN size (characters)
  ANALYSIS_DEPTH: 20,         // Default Stockfish depth
  ANALYSIS_TIMEOUT: 2000,     // Max analysis time (ms)
  MIN_API_KEY_LENGTH: 20,     // Min API key length
}
```

### Skill Levels (`lib/constants/skillLevels`)

```typescript
export const SKILL_LEVELS = {
  beginner: {
    label: 'Beginner',
    description: 'Learning fundamentals',
    maxDepth: 1,
  },
  intermediate: {
    label: 'Intermediate',
    description: 'Understand tactics and strategy',
    maxDepth: 2,
  },
  advanced: {
    label: 'Advanced',
    description: 'Deep strategic and tactical analysis',
    maxDepth: 3,
  },
}
```

---

## Future Enhancements

### Planned API Additions

1. **Database Integration**
   - Save games to backend
   - Sync settings across devices
   - User authentication

2. **WebSocket Support**
   - Real-time game analysis
   - Live coaching for online games
   - Multiplayer features

3. **Opening Book API**
   - `getOpeningName(position: Position): string`
   - `getOpeningRecommendations(position: Position): Move[]`

4. **Endgame Tablebase API**
   - Perfect evaluation for endgames
   - Best move suggestions

5. **Statistics API**
   - Game statistics calculation
   - Performance metrics
   - Improvement tracking

---

## Examples

### Load and Analyze a Game

```typescript
import { fetchGameFromLichess } from '@/lib/chess/pgn/fetcher'
import { parsePgn } from '@/lib/chess/pgn/parser'
import { analyzePosition } from '@/lib/chess/engine/analyzer'
import { detectCoachingMoments } from '@/lib/coaching/analyzer'

async function analyzeGame(lichessUrl: string) {
  // 1. Fetch game
  const pgn = await fetchGameFromLichess(lichessUrl)
  
  // 2. Parse game
  const game = parsePgn(pgn)
  
  // 3. Analyze each move
  for (const move of game.moves) {
    const eval = await analyzePosition(move.position, 20)
    move.evaluation = eval
  }
  
  // 4. Detect coaching moments
  const moments = detectCoachingMoments(game.moves)
  
  // 5. Generate explanations
  for (const moment of moments) {
    const prompt = buildCoachingPrompt(moment, 'intermediate', {
      move: game.moves[moment.moveIndex].san,
      position: game.moves[moment.moveIndex].position,
      evaluation: moment.evaluation,
    })
    
    console.log(`Move ${moment.moveIndex}: ${moment.type}`)
    console.log(`Prompt: ${prompt}`)
  }
}
```

---

## Migration Guide

If you're migrating from another chess application:

1. **Convert PGN** - Use `parsePgn()` to convert your game format
2. **Analyze Positions** - Use `analyzePosition()` for engine analysis
3. **Store Settings** - Use `saveSettings()` for user preferences
4. **Handle Errors** - Use `normalizeError()` for consistent error handling

---

## Support & Contributions

For questions about the API:
- Check [DEVELOPMENT.md](./DEVELOPMENT.md)
- Review [ARCHITECTURE.md](./ARCHITECTURE.md)
- Open an issue on GitHub

For bug reports or feature requests:
- Include which API method is affected
- Provide minimal reproduction code
- Share error messages and stack traces
