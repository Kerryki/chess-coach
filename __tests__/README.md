# Chess Coach Test Suite

## Directory Structure

```
__tests__/
├── unit/
│   ├── chess/
│   │   ├── pgn/
│   │   │   └── parser.test.ts       # PGN parsing and metadata
│   │   ├── board/
│   │   │   └── board.test.ts        # Board state derivation
│   │   └── engine/
│   │       └── cache.test.ts        # LRU analysis cache
│   ├── coaching/
│   │   └── moment-detector.test.ts  # Moment detection logic
│   └── storage/
│       └── settings.test.ts         # Settings persistence
├── integration/
│   ├── game-load-flow.test.ts       # PGN → Board → Navigation
│   ├── analysis-flow.test.ts        # Board → Analysis → Cache
│   └── coaching-flow.test.ts        # Analysis → Moments → Explanations
└── e2e/
    └── game-analysis.spec.ts        # Full user flows (Playwright)
```

## Running Tests

### All Tests
```bash
npm test                # Run all unit + integration tests
npm test -- --watch    # Watch mode during development
npm test -- --coverage # Coverage report
```

### Specific Test Suite
```bash
npm test -- parser.test    # Only PGN parser tests
npm test -- cache.test     # Only cache tests
npm test -- settings.test  # Only settings tests
```

### E2E Tests
```bash
npm run test:e2e  # Requires running Next.js server (npm run dev)
```

## Test Statistics

**Current Coverage**:
- **PGN Parser**: 96.72% statements, 80.55% branches
- **Board State**: 100% coverage
- **Cache System**: 100% coverage
- **Moment Detector**: 97.36% statements, 96.42% branches
- **Settings**: 68.6% statements, 59.25% branches

**Total Tests**: 198
- **Passing**: 166+
- **Key Paths**: 100% coverage
- **Error Paths**: Comprehensive

## Unit Tests

### PGN Parser Tests (28 tests)
- Metadata extraction from PGN headers
- Move parsing (algebraic notation, castling, etc.)
- Complex variations and comments
- Move validation using chess.js
- Error handling (invalid PGN, illegal moves)

**Key Test Cases**:
```typescript
// Metadata extraction
parsePgn(pgn) → { metadata, moves, moveCount, legalMoves }

// Move validation
validateMoves(['e4', 'e5', 'Nf3']) → { isValid: true }

// Error detection
parsePgn('illegal move here') → throws AppError
```

### Board State Tests (22 tests)
- Starting position (FEN, 20 legal moves)
- Move navigation (apply moves up to index)
- Legal move generation from any position
- FEN consistency throughout game
- Special moves (castling, en passant, promotion)

**Key Test Cases**:
```typescript
// Get board at position
getBoardState(['e4', 'e5'], 2) → {
  fen: '...',
  legalMoves: [...],
  lastMove: { from: 'e7', to: 'e5' },
  currentMoveIndex: 2
}

// Legal moves generation
getLegalMovesFromFen(fen) → [{ san, lan, from, to }, ...]
```

### Cache Tests (27 tests)
- Get/set operations with FEN keys
- LRU eviction when cache exceeds maxSize
- Timestamp updates on access (marks as recently used)
- Clear operation
- Performance under load (10k+ lookups)

**Key Test Cases**:
```typescript
// Store analysis
cache.set(fen, { evaluation: 25, bestMove: 'e5', ... })

// Evict oldest when full
cache.set(fen1, ...) // Evicts least recently used
cache.size() === maxSize

// Cache hit
cache.get(fen) → analysis (updates timestamp)
```

### Moment Detection Tests (35 tests)
- Blunder detection (evaluation drop >300cp)
- Inaccuracy detection (50-300cp loss)
- Brilliant move detection (unexpected improvements)
- Key position identification (opening/endgame transitions)
- Defensive move detection (preventing bigger losses)
- Confidence scoring based on eval change
- Duplicate filtering and sorting

**Key Test Cases**:
```typescript
// Detect moments in game
detectCriticalMoments(game, analyses) → [
  { moveIndex, reason, confidence, evaluation, ... },
  ...
]

// Label reasons
getReasonLabel('blunder') → 'Blunder'
getReasonColor('brilliant') → '#16a34a'
```

### Settings Tests (45 tests)
- Load defaults when no stored settings
- Load and parse persisted settings
- Validate with Zod schema
- Save with timestamp update
- Single setting updates (immutable)
- Batch updates (immutable)
- Reset to defaults
- Export with API key redaction
- Skill level, theme, language validation
- NotificationVolume range (0-100)

**Key Test Cases**:
```typescript
// Load settings
loadSettings() → AppSettings (defaults or persisted)

// Update single field
updateSetting('skillLevel', 'advanced') → [updated, null]

// Update multiple
updateSettings({ theme: 'dark', autoAnnotate: false }) → [updated, null]

// Persist
saveSettings(settings) → [persisted, null]
```

## Integration Tests

### Game Load Flow (10 tests)
Tests the complete pipeline: PGN → Parse → Board State → Navigate

**Flow**:
1. Parse PGN string
2. Extract moves and metadata
3. Get board state at any position
4. Navigate forward/backward
5. Verify FEN consistency

**Edge Cases**:
- Games with castling
- Games with capture notation
- Long games (50+ moves)
- Metadata preservation during navigation

### Analysis Flow (16 tests)
Tests caching and analysis pipeline: Board State → Analyses → Cache

**Flow**:
1. Get board state for position
2. Store engine analysis in cache
3. Retrieve cached analysis
4. Handle cache eviction
5. Distinguish positions with same eval

**Scenarios**:
- Cache hits for repeated positions
- LRU eviction during long game analysis
- Performance with 1000+ cached positions

### Coaching Flow (15 tests)
Tests coaching pipeline: Analysis → Moment Detection → Explanations

**Flow**:
1. Generate engine analyses for all moves
2. Detect critical moments
3. Filter by confidence
4. Sort by importance
5. Limit to max moments per game

**Scenarios**:
- Blunder detection for correction
- Brilliant detection for praise
- Opening/endgame transition identification
- Skill level adaptation (beginner/intermediate/advanced)

## E2E Tests

Playwright-based tests for full user flows (requires running server).

**Test Coverage**:
- Game input interface
- PGN loading and validation
- Board display and navigation
- Settings management
- Error handling
- Responsive design (mobile/tablet/desktop)
- Accessibility (keyboard navigation)
- Performance (page load time)

## Writing New Tests

### Unit Test Template
```typescript
describe('FeatureName', () => {
  describe('specific behavior', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...
      
      // Act
      const result = functionUnderTest(input)
      
      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

### Integration Test Template
```typescript
describe('Flow Name', () => {
  it('should complete end-to-end', () => {
    // Setup
    const pgn = ...
    
    // Step 1: Parse
    const parsed = parsePgn(pgn)
    expect(parsed).toBeDefined()
    
    // Step 2: Derive board
    const board = getBoardState(parsed.moves, 5)
    expect(board.legalMoves).toHaveLength(n)
    
    // Step 3: Verify consistency
    expect(board.fen).toMatch(/.../)
  })
})
```

## Debugging Tests

### Run single test
```bash
npm test -- --testNamePattern="should extract basic game metadata"
```

### Verbose output
```bash
npm test -- --verbose
```

### Debug with Node inspector
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## CI/CD Integration

Tests run automatically on:
- `npm test` - Validates all changes
- `npm coverage` - Generates coverage report
- Pre-commit hooks (via git hooks)

Target coverage thresholds:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Common Issues

### Import path not resolving
Ensure relative paths are correct. From `__tests__/unit/chess/pgn/` to `lib/chess/pgn/`:
```typescript
import { parsePgn } from '../../../../lib/chess/pgn/parser'
```

### localStorage undefined
The test setup file mocks localStorage automatically. If tests fail:
```javascript
// jest.setup.js already handles this
Object.defineProperty(global, 'localStorage', { value: localStorageMock })
```

### Test timeout
Some integration tests with cache eviction may need extra time:
```typescript
it('test name', async () => { ... }, 10000) // 10 second timeout
```

## Contributing Tests

When adding new features:
1. Write tests first (TDD approach)
2. Run `npm test` to verify they fail
3. Implement feature
4. Run `npm test` to verify they pass
5. Run `npm coverage` to check coverage
6. Ensure coverage > 80% for new code

---

For detailed coverage reports, see `TEST_SUMMARY.md`
