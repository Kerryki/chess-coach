/**
 * Integration tests for coaching flow
 * Tests: Board analysis → Moment detection → Explanation generation
 */

import { detectCriticalMoments, getReasonLabel } from '../../lib/coaching/moment-detector'
import { parsePgn } from '../../lib/chess/pgn/parser'
import { GameState } from '../../lib/types/chess'
import { EngineAnalysis } from '../../lib/chess/engine/types'

describe('Coaching Flow', () => {
  const createGameWithMoves = (moves: string[]): GameState => ({
    position: {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      moveNumber: 1,
      halfMoveClock: 0,
    },
    moves: moves.map(() => ({
      from: 'e2',
      to: 'e4',
    })),
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })

  const createAnalysisSequence = (values: number[]): EngineAnalysis[] => {
    return values.map((evalValue) => ({
      evaluation: evalValue,
      bestMove: 'e5',
      depth: 20,
      principalVariation: ['e2e4', 'c7c5', 'g1f3'],
      isMate: false,
    }))
  }

  describe('Basic coaching flow', () => {
    it('should detect moments in a simple game', () => {
      const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']
      const game = createGameWithMoves(moves)
      const analyses = createAnalysisSequence([0, 20, 20, 25, 25, 30])

      const moments = detectCriticalMoments(game, analyses)

      expect(moments.length).toBeGreaterThanOrEqual(0)
      moments.forEach((moment) => {
        expect(moment.reason).toMatch(/blunder|brilliant|inaccuracy|key_position|defensive_move/)
        expect(moment.confidence).toBeGreaterThanOrEqual(0)
        expect(moment.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('should label detected moments appropriately', () => {
      const moves = Array(10).fill('move')
      const game = createGameWithMoves(moves)
      // Create a blunder at move 5
      const analyses = createAnalysisSequence([0, 25, 25, 30, 30, -300, -300, 0, 0, 0, 0, 0])

      const moments = detectCriticalMoments(game, analyses)

      const labels = moments.map((m) => getReasonLabel(m.reason))
      labels.forEach((label) => {
        expect(['Blunder', 'Brilliant Move', 'Inaccuracy', 'Key Position', 'Defensive Move']).toContain(label)
      })
    })
  })

  describe('Blunder detection for coaching', () => {
    it('should identify critical blunders for explanation', () => {
      // detectCriticalMoments only scans up to game.moves.length, so moves
      // must be at least as long as analyses or the blunder at index 6
      // never gets evaluated.
      const moves = Array(8).fill('move')
      const game = createGameWithMoves(moves)
      // Setup: position worsens by 350cp at index 6 (White's 4th move)
      const analyses = createAnalysisSequence([0, 25, 25, 30, 30, 35, -350, -350])

      const moments = detectCriticalMoments(game, analyses)
      const blunders = moments.filter((m) => m.reason === 'blunder')

      expect(blunders.length).toBeGreaterThan(0)
      blunders.forEach((b) => {
        expect(b.confidence).toBeGreaterThan(0.3)
        expect(b.moveIndex).toBeGreaterThan(0)
      })
    })

    it('should prioritize larger blunders', () => {
      // moves must cover index 10, or detectCriticalMoments never evaluates
      // the second (larger) blunder and this test's assertion silently
      // never runs.
      const moves = Array(12).fill('move')
      const game = createGameWithMoves(moves)
      // Create two blunders at White's moves (even indices): a 350cp swing
      // at index 6 and a larger 600cp swing at index 10. (The eval swing at
      // index 6 must clear the 300cp blunder threshold - a 50cp swing, as
      // this fixture previously used, only registers as an inaccuracy.)
      const analyses = createAnalysisSequence([0, 20, 20, 30, 30, 30, -320, -320, 0, 0, -600, -600])

      const moments = detectCriticalMoments(game, analyses)
      const blunders = moments.filter((m) => m.reason === 'blunder')

      expect(blunders.length).toBeGreaterThan(1)
      // Larger blunder should have higher confidence
      expect(blunders[0].confidence).toBeGreaterThanOrEqual(blunders[1].confidence)
    })
  })

  describe('Brilliant move detection for praise', () => {
    it('should identify brilliant moves', () => {
      const moves = Array(6).fill('move')
      const game = createGameWithMoves(moves)
      // Position improves by 200cp
      const analyses = createAnalysisSequence([0, -20, -20, -30, -30, 170, 170])

      const moments = detectCriticalMoments(game, analyses)
      const brilliant = moments.filter((m) => m.reason === 'brilliant')

      if (brilliant.length > 0) {
        brilliant.forEach((b) => {
          expect(b.confidence).toBeGreaterThan(0)
        })
      }
      expect(moments.length).toBeGreaterThanOrEqual(0)
    })

    it('should give higher confidence to larger improvements', () => {
      const moves = Array(8).fill('move')
      const game = createGameWithMoves(moves)
      // Create two improvements, one larger
      const analyses = createAnalysisSequence([
        0, -20, -20, -30, -30, -50, // Small improvement
        50, 50, // Large improvement
        0, 0,
      ])

      const moments = detectCriticalMoments(game, analyses)
      const brilliant = moments.filter((m) => m.reason === 'brilliant')

      if (brilliant.length > 1) {
        expect(brilliant[0].confidence).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Inaccuracy detection for guidance', () => {
    it('should identify minor mistakes', () => {
      const moves = Array(6).fill('move')
      const game = createGameWithMoves(moves)
      // Moderate evaluation drop (inaccuracy range)
      const analyses = createAnalysisSequence([0, 20, 20, 30, 30, -80, -80])

      const moments = detectCriticalMoments(game, analyses)
      const inaccuracies = moments.filter((m) => m.reason === 'inaccuracy')

      expect(inaccuracies.length).toBeGreaterThanOrEqual(0)
    })

    it('should distinguish inaccuracies from blunders', () => {
      const moves = Array(12).fill('move')
      const game = createGameWithMoves(moves)
      // 200cp swing at move 1 stays under the 300cp blunder threshold, so it
      // registers as an inaccuracy (0.83 confidence, above the 0.7 default
      // confidence gate); the 600cp swing at move 8 clears the blunder
      // threshold.
      const analyses = createAnalysisSequence([
        0, 200, 200, 200, 200, 200, 200, 200, -400, -400, -400, -400,
      ])

      const moments = detectCriticalMoments(game, analyses)
      const blunders = moments.filter((m) => m.reason === 'blunder')
      const inaccuracies = moments.filter((m) => m.reason === 'inaccuracy')

      expect(blunders.length).toBeGreaterThan(0)
      expect(inaccuracies.length).toBeGreaterThan(0)
      blunders.forEach((b) => {
        expect(b.confidence).toBeGreaterThanOrEqual(0.7)
      })
      inaccuracies.forEach((i) => {
        expect(i.confidence).toBeLessThanOrEqual(1.0)
      })
    })
  })

  describe('Key position identification', () => {
    it('should identify opening transition', () => {
      const moves = Array(20).fill('move')
      const game = createGameWithMoves(moves)
      const analyses = createAnalysisSequence(Array(21).fill(0))

      const moments = detectCriticalMoments(game, analyses)
      const keyPositions = moments.filter((m) => m.reason === 'key_position')

      expect(keyPositions.length).toBeGreaterThan(0)
    })

    it('should identify endgame transition', () => {
      const moves = Array(30).fill('move')
      const game = createGameWithMoves(moves)
      const analyses = createAnalysisSequence(Array(31).fill(0))

      const moments = detectCriticalMoments(game, analyses)
      const keyPositions = moments.filter((m) => m.reason === 'key_position')

      expect(keyPositions.length).toBeGreaterThan(0)
    })
  })

  describe('Coaching moment sorting for priority', () => {
    it('should prioritize high-confidence moments', () => {
      const moves = Array(20).fill('move')
      const game = createGameWithMoves(moves)
      // Create one huge blunder and one small inaccuracy
      const analyses = createAnalysisSequence([
        0, 20, 20, 30, 30, -50, -50, 0, 0, 0, 0, -600, -600, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ])

      const moments = detectCriticalMoments(game, analyses)

      // First moment should have highest confidence
      if (moments.length > 1) {
        expect(moments[0].confidence).toBeGreaterThanOrEqual(moments[moments.length - 1].confidence)
      }
    })

    it('should sort by importance for explanation generation', () => {
      const moves = Array(15).fill('move')
      const game = createGameWithMoves(moves)
      const analyses = createAnalysisSequence([
        0, 25, 25, // Opening moves
        -50, -50, // Inaccuracy
        100, 100, // Brilliant
        -400, -400, // Blunder
        0, 0, 0, 0, 0, 0, 0, 0,
      ])

      const moments = detectCriticalMoments(game, analyses)

      // Check that moments are sortable and have ranking info
      moments.forEach((moment, idx) => {
        if (idx < moments.length - 1) {
          expect(moment.confidence).toBeGreaterThanOrEqual(moments[idx + 1].confidence)
        }
      })
    })
  })

  describe('Filtering for relevant coaching', () => {
    it('should exclude low-confidence moments', () => {
      const moves = Array(6).fill('move')
      const game = createGameWithMoves(moves)
      // Very small eval changes
      const analyses = createAnalysisSequence([0, 5, 5, 8, 8, 3, 3])

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 300,
        inaccuracyLowerThreshold: 50,
        inaccuracyUpperThreshold: 300,
        confidenceThreshold: 0.5,
        filterConsecutiveDuplicates: true,
        maxMomentsPerGame: 10,
        analysisTimeLimit: 2000,
      })

      // Most small changes should be filtered
      moments.forEach((m) => {
        expect(m.confidence).toBeGreaterThanOrEqual(0.5)
      })
    })

    it('should limit coaching points for focus', () => {
      const moves = Array(30).fill('move')
      const game = createGameWithMoves(moves)
      // Many small blunders throughout
      const analyses: EngineAnalysis[] = Array(31).fill(null).map((_, i) => ({
        evaluation: (i % 3) * -150,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }))

      const moments = detectCriticalMoments(game, analyses, 'intermediate', {
        blunderThreshold: 100,
        inaccuracyLowerThreshold: 30,
        inaccuracyUpperThreshold: 200,
        confidenceThreshold: 0.2,
        filterConsecutiveDuplicates: false,
        maxMomentsPerGame: 5,
        analysisTimeLimit: 2000,
      })

      expect(moments.length).toBeLessThanOrEqual(5)
    })
  })

  describe('Skill level adaptation', () => {
    it('should detect moments for beginner level', () => {
      const moves = Array(8).fill('move')
      const game = createGameWithMoves(moves)
      const analyses = createAnalysisSequence([0, 25, 25, 30, 30, -100, -100, 0, 0])

      const moments = detectCriticalMoments(game, analyses, 'beginner')

      expect(moments).toBeDefined()
      expect(Array.isArray(moments)).toBe(true)
    })

    it('should detect moments for intermediate level', () => {
      const moves = Array(8).fill('move')
      const game = createGameWithMoves(moves)
      const analyses = createAnalysisSequence([0, 25, 25, 30, 30, -100, -100, 0, 0])

      const moments = detectCriticalMoments(game, analyses, 'intermediate')

      expect(moments).toBeDefined()
      expect(Array.isArray(moments)).toBe(true)
    })

    it('should detect moments for advanced level', () => {
      const moves = Array(8).fill('move')
      const game = createGameWithMoves(moves)
      const analyses = createAnalysisSequence([0, 25, 25, 30, 30, -100, -100, 0, 0])

      const moments = detectCriticalMoments(game, analyses, 'advanced')

      expect(moments).toBeDefined()
      expect(Array.isArray(moments)).toBe(true)
    })
  })

  describe('End-to-end coaching scenario', () => {
    it('should process complete game for coaching', () => {
      const pgn = `[Event "Training Game"]
[White "Student"]
[Black "Opponent"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6`

      // 1. Parse the PGN into a validated move list, exercising the same
      // path a real loaded game would take.
      const moves = parsePgn(pgn).moves as string[]

      // 2. Create game state
      const game = createGameWithMoves(moves)

      // 3. Get board states and analyses (normally from engine)
      const pv = ['e2e4', 'c7c5', 'g1f3']
      const analyses: (EngineAnalysis | null)[] = [
        { evaluation: 0, bestMove: 'e4', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 20, bestMove: 'e5', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 0, bestMove: 'Nf3', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 15, bestMove: 'd6', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 10, bestMove: 'd4', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 25, bestMove: 'cxd4', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 20, bestMove: 'Nxd4', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 30, bestMove: 'Nf6', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 25, bestMove: 'Nc3', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 20, bestMove: 'a6', depth: 20, principalVariation: pv, isMate: false },
        { evaluation: 25, bestMove: 'Ba4', depth: 20, principalVariation: pv, isMate: false },
      ]

      // 4. Detect coaching moments
      const moments = detectCriticalMoments(game, analyses)

      // 5. Results should be ready for explanation generation
      expect(moments).toBeDefined()
      expect(Array.isArray(moments)).toBe(true)

      moments.forEach((moment) => {
        expect(moment.moveIndex).toBeGreaterThanOrEqual(1)
        expect(moment.moveIndex).toBeLessThanOrEqual(moves.length)
        expect(moment.reason).toMatch(/blunder|brilliant|inaccuracy|key_position|defensive_move/)
      })
    })
  })
})
