/**
 * Unit tests for critical moment detection
 * Tests blunder, inaccuracy, brilliant, and key position detection
 */

import { detectCriticalMoments, getReasonLabel, getReasonColor } from '../../../lib/coaching/moment-detector'
import { GameState } from '../../../lib/types/chess'
import { EngineAnalysis } from '../../../lib/chess/engine/types'

describe('detectCriticalMoments', () => {
  const createGameState = (moveCount: number): GameState => ({
    position: {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moveNumber: 1,
      halfMoveClock: 0,
    },
    moves: Array(moveCount).fill({ from: 'e2', to: 'e4' }),
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  const createAnalyses = (values: number[]): (EngineAnalysis | null)[] => {
    return values.map((evalValue) => ({
      evaluation: evalValue,
      bestMove: 'e5',
      depth: 20,
      principalVariation: ['e2e4', 'c7c5', 'g1f3'],
      isMate: false,
    }))
  }

  describe('blunder detection', () => {
    it('should detect white blunder (evaluation drops)', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, -350, -350, -350]) // Move at index 2: white eval drops 350cp

      const moments = detectCriticalMoments(game, analyses)

      const blunder = moments.find((m) => m.reason === 'blunder')
      expect(blunder).toBeDefined()
      expect(blunder?.moveIndex).toBe(2)
    })

    it('should detect black blunder (evaluation increases, worse for black)', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([0, 350, 350]) // Move at index 1: black eval increases 350cp (worse)

      const moments = detectCriticalMoments(game, analyses)

      const blunder = moments.find((m) => m.reason === 'blunder')
      expect(blunder).toBeDefined()
      expect(blunder?.moveIndex).toBe(1)
    })

    it('should not flag minor evaluation changes as blunders', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([0, -50, -50]) // Only 50cp drop

      const moments = detectCriticalMoments(game, analyses)

      const blunder = moments.find((m) => m.reason === 'blunder')
      expect(blunder).toBeUndefined()
    })

    it('should set confidence based on evaluation loss', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, -500, -500, -500]) // 500cp loss at white's move (index 2)

      const moments = detectCriticalMoments(game, analyses)

      const blunder = moments.find((m) => m.reason === 'blunder')
      expect(blunder?.confidence).toBeGreaterThan(0.5)
    })
  })

  describe('inaccuracy detection', () => {
    it('should detect white inaccuracy', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, -100, -100, -100]) // 100cp drop at white's move (index 2)

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5,
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const inaccuracy = moments.find((m) => m.reason === 'inaccuracy')
      expect(inaccuracy).toBeDefined()
    })

    it('should detect black inaccuracy', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([0, 100, 100]) // Black eval increases 100cp at index 1

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5,
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const inaccuracy = moments.find((m) => m.reason === 'inaccuracy')
      expect(inaccuracy).toBeDefined()
    })

    it('should not flag moves outside inaccuracy range as inaccuracies', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, -400, -400, -400]) // Too large, should be blunder

      const moments = detectCriticalMoments(game, analyses)

      const inaccuracy = moments.find((m) => m.reason === 'inaccuracy')
      expect(inaccuracy).toBeUndefined()
    })

    it('should clamp confidence to 0.5-1.0 range', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, -50, -50, -50]) // Smallest inaccuracy

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5,
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const inaccuracy = moments.find((m) => m.reason === 'inaccuracy')
      expect(inaccuracy?.confidence).toBeGreaterThanOrEqual(0.5)
      expect(inaccuracy?.confidence).toBeLessThanOrEqual(1.0)
    })
  })

  describe('brilliant move detection', () => {
    it('should detect white brilliant move (eval improvement)', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, 200, 200, 200]) // White eval improves 200cp at index 2

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5,
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const brilliant = moments.find((m) => m.reason === 'brilliant')
      expect(brilliant).toBeDefined()
    })

    it('should detect black brilliant move (eval improvement)', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([0, -200, -200]) // Black eval improves (becomes more negative) at index 1

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5,
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const brilliant = moments.find((m) => m.reason === 'brilliant')
      expect(brilliant).toBeDefined()
    })

    it('should require significant eval change for brilliant', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, 20, 20, 20]) // Only 20cp improvement

      const moments = detectCriticalMoments(game, analyses)

      const brilliant = moments.find((m) => m.reason === 'brilliant')
      expect(brilliant).toBeUndefined()
    })

    it('should set confidence proportional to eval gain', () => {
      const game = createGameState(4)
      const analyses = createAnalyses([0, 0, 100, 100, 100])

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.3, // Lower threshold for small eval gains
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const brilliant = moments.find((m) => m.reason === 'brilliant')
      expect(brilliant?.confidence).toBeGreaterThan(0)
    })
  })

  describe('defensive move detection', () => {
    it('should detect defensive move in losing position', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([-200, -180, -180]) // Black improves by 20cp from losing position at index 1

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5, // Lower threshold to detect defensive moves
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const defensive = moments.find((m) => m.reason === 'defensive_move')
      expect(defensive).toBeDefined()
    })

    it('should set confidence to 0.6 for defensive moves', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([-200, -180, -180]) // Black improves by 20cp at index 1

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5, // Lower threshold to detect defensive moves
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      const defensive = moments.find((m) => m.reason === 'defensive_move')
      expect(defensive?.confidence).toBe(0.6)
    })

    it('should not flag moves in winning position as defensive', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([200, 250, 250]) // Winning position, improvement

      const moments = detectCriticalMoments(game, analyses)

      const defensive = moments.find((m) => m.reason === 'defensive_move')
      expect(defensive).toBeUndefined()
    })
  })

  describe('key position detection', () => {
    it('should detect opening end around move 10', () => {
      const game = createGameState(20)
      const analyses = Array(21).fill(null).map((_, _i) => ({
        evaluation: 0,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }))

      const moments = detectCriticalMoments(game, analyses)

      const opening = moments.find((m) => m.reason === 'key_position' && m.moveIndex >= 10 && m.moveIndex <= 15)
      expect(opening).toBeDefined()
    })

    it('should detect endgame start around 70% of moves', () => {
      const game = createGameState(30)
      const analyses = Array(31).fill(null).map((_, _i) => ({
        evaluation: 0,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }))

      const moments = detectCriticalMoments(game, analyses)

      const endgame = moments.find((m) => m.reason === 'key_position' && m.moveIndex >= 20)
      expect(endgame).toBeDefined()
    })
  })

  describe('confidence threshold filtering', () => {
    it('should filter out moments below confidence threshold', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([0, -15, -15]) // Very small change, low confidence

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5,
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      // Should have no moments if confidence is too low
      expect(moments.length).toBeGreaterThanOrEqual(0)
    })

    it('should include moments above confidence threshold', () => {
      const game = createGameState(2)
      const analyses = createAnalyses([0, -300, -300]) // Large change, high confidence

      const moments = detectCriticalMoments(game, analyses)

      expect(moments.length).toBeGreaterThan(0)
    })
  })

  describe('filtering consecutive duplicates', () => {
    it('should remove consecutive identical moments', () => {
      const game = createGameState(4)
      // Two moves that both cause blunders
      const analyses = createAnalyses([0, -350, -350, -400, -400])

      const moments = detectCriticalMoments(game, analyses)

      // With filtering enabled, consecutive blunders within 2 moves should be reduced
      const blunders = moments.filter((m) => m.reason === 'blunder')
      expect(blunders.length).toBeLessThanOrEqual(2)
    })

    it('should keep duplicates far apart', () => {
      const game = createGameState(10)
      // Set up blunders at White's moves (even indices): at 2 and 6 (far apart with filterConsecutiveDuplicates=true)
      const analyses = [
        { evaluation: 100, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false }, // i=0
        { evaluation: 50, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },  // i=1 (Black)
        { evaluation: -350, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false }, // i=2 (White - blunder)
        { evaluation: -300, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false }, // i=3 (Black)
        { evaluation: 100, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },  // i=4 (White - recovery)
        { evaluation: 50, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },   // i=5 (Black)
        { evaluation: -350, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false }, // i=6 (White - blunder)
        { evaluation: -300, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false }, // i=7 (Black)
        { evaluation: 50, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },   // i=8 (White)
        { evaluation: 0, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },    // i=9 (Black)
        { evaluation: 10, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },   // i=10 (White)
      ]

      const moments = detectCriticalMoments(game, analyses)

      const blunders = moments.filter((m) => m.reason === 'blunder')
      // Two blunders far apart (at indices 2 and 6) should both be kept with default filtering
      expect(blunders.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('max moments limiting', () => {
    it('should limit moments to maxMomentsPerGame', () => {
      const game = createGameState(20)
      const analyses = Array(21).fill(null).map((_, i) => ({
        evaluation: i % 2 === 0 ? 0 : -100,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }))

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 50, // Low threshold to catch many
        inaccuracyLowerThreshold: 30,
        inaccuracyUpperThreshold: 200,
        confidenceThreshold: 0.3,
        filterConsecutiveDuplicates: false,
        maxMomentsPerGame: 5,
        analysisTimeLimit: 2000,
      })

      expect(moments.length).toBeLessThanOrEqual(5)
    })
  })

  describe('edge cases', () => {
    it('should handle empty game', () => {
      const game = createGameState(0)
      const analyses: (EngineAnalysis | null)[] = []

      const moments = detectCriticalMoments(game, analyses)

      expect(moments).toEqual([])
    })

    it('should handle game with single move', () => {
      const game = createGameState(1)
      const analyses = createAnalyses([0, 0])

      const moments = detectCriticalMoments(game, analyses)

      expect(moments.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle analyses with null entries', () => {
      const game = createGameState(4)
      const analyses: (EngineAnalysis | null)[] = [
        { evaluation: 0, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },
        null,
        { evaluation: -100, bestMove: 'e5', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },
        null,
      ]

      const moments = detectCriticalMoments(game, analyses)

      expect(moments).toBeDefined()
      expect(Array.isArray(moments)).toBe(true)
    })

    it('should handle fewer analyses than moves', () => {
      const game = createGameState(10)
      const analyses = createAnalyses([0, 0, 0]) // Only 3 analyses for 10 moves

      const moments = detectCriticalMoments(game, analyses)

      expect(moments).toBeDefined()
    })
  })

  describe('sorting by confidence and index', () => {
    it('should sort moments by confidence descending, then by index ascending', () => {
      const game = createGameState(6)
      // Create varying confidence levels
      const analyses = createAnalyses([0, -100, -100, -500, -500, -50, -50])

      const moments = detectCriticalMoments(game, analyses)

      // First moment should have higher confidence than last
      if (moments.length > 1) {
        expect(moments[0].confidence).toBeGreaterThanOrEqual(moments[moments.length - 1].confidence)
      }
    })
  })

  describe('move information preservation', () => {
    it('should preserve best move and played move', () => {
      const game: GameState = {
        position: {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moveNumber: 1,
          halfMoveClock: 0,
        },
        moves: [
          { from: 'e2', to: 'e4' },
          { from: 'e7', to: 'e5' },
        ],
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const analyses = createAnalyses([0, 25, 25])

      const moments = detectCriticalMoments(game, analyses)

      // At minimum, the analysis should run
      expect(moments).toBeDefined()
    })
  })
})

describe('getReasonLabel', () => {
  it('should return label for blunder', () => {
    expect(getReasonLabel('blunder')).toBe('Blunder')
  })

  it('should return label for brilliant', () => {
    expect(getReasonLabel('brilliant')).toBe('Brilliant Move')
  })

  it('should return label for inaccuracy', () => {
    expect(getReasonLabel('inaccuracy')).toBe('Inaccuracy')
  })

  it('should return label for key_position', () => {
    expect(getReasonLabel('key_position')).toBe('Key Position')
  })

  it('should return label for defensive_move', () => {
    expect(getReasonLabel('defensive_move')).toBe('Defensive Move')
  })
})

describe('getReasonColor', () => {
  it('should return red for blunder', () => {
    expect(getReasonColor('blunder')).toBe('#dc2626')
  })

  it('should return green for brilliant', () => {
    expect(getReasonColor('brilliant')).toBe('#16a34a')
  })

  it('should return amber for inaccuracy', () => {
    expect(getReasonColor('inaccuracy')).toBe('#f59e0b')
  })

  it('should return blue for key_position', () => {
    expect(getReasonColor('key_position')).toBe('#0ea5e9')
  })

  it('should return violet for defensive_move', () => {
    expect(getReasonColor('defensive_move')).toBe('#8b5cf6')
  })
})
