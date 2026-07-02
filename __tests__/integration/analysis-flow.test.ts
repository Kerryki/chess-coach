/**
 * Integration tests for analysis flow
 * Tests: Board state → Engine analysis caching → Move evaluation
 */

import { getBoardState, getLegalMovesFromFen } from '../../lib/chess/board/board'
import { AnalysisCache } from '../../lib/chess/engine/cache'
import { EngineAnalysis } from '../../lib/chess/engine/types'

describe('Analysis Flow', () => {
  let cache: AnalysisCache

  beforeEach(() => {
    cache = new AnalysisCache(100)
  })

  describe('Position analysis and caching', () => {
    it('should cache analysis for board positions', () => {
      const moves = ['e4', 'e5', 'Nf3']
      const state = getBoardState(moves, 3)

      const analysis: EngineAnalysis = {
        evaluation: 30,
        bestMove: 'Nc3',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(state.fen, analysis)

      const retrieved = cache.get(state.fen)
      expect(retrieved).toEqual(analysis)
    })

    it('should use cache for repeated position analysis', () => {
      const moves = ['e4', 'e5', 'Nf3', 'Nc6']
      const state1 = getBoardState(moves, 4)

      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'Bb5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      // First analysis
      cache.set(state1.fen, analysis)

      // If we arrive at same position from different move order,
      // it should use the cache
      const cached = cache.get(state1.fen)
      expect(cached?.evaluation).toBe(25)
    })

    it('should distinguish different positions', () => {
      const moves1 = ['e4', 'e5']
      const state1 = getBoardState(moves1, 2)

      const moves2 = ['d4', 'd5']
      const state2 = getBoardState(moves2, 2)

      const analysis1: EngineAnalysis = {
        evaluation: 20,
        bestMove: 'Nf3',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      const analysis2: EngineAnalysis = {
        evaluation: 15,
        bestMove: 'c4',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(state1.fen, analysis1)
      cache.set(state2.fen, analysis2)

      expect(cache.get(state1.fen)?.evaluation).toBe(20)
      expect(cache.get(state2.fen)?.evaluation).toBe(15)
    })
  })

  describe('Legal moves from analyzed positions', () => {
    it('should get legal moves after board state analysis', () => {
      const moves = ['e4', 'e5', 'Nf3']
      const state = getBoardState(moves, 3)

      const legalMoves = getLegalMovesFromFen(state.fen)

      expect(legalMoves.length).toBeGreaterThan(0)
      expect(legalMoves.some((m) => m.san === 'Nc6')).toBe(true)
    })

    it('should restrict legal moves in check', () => {
      // Bb5+ actually gives check (previous fixture, ending in Bb5, was not
      // a check at all - just the Ruy Lopez pin, which doesn't restrict
      // black's mobility below the starting-position move count).
      const moves = ['e4', 'e5', 'Nf3', 'd6', 'Bb5+']
      const state = getBoardState(moves, moves.length)

      const legalMoves = getLegalMovesFromFen(state.fen)

      // Should have legal moves, but only the ones that resolve the check
      expect(legalMoves.length).toBeGreaterThan(0)
      expect(legalMoves.length).toBeLessThan(20) // Less than starting position
    })

    it('should match legal moves from state with FEN', () => {
      const moves = ['e4', 'c5', 'Nf3', 'd6']
      const state = getBoardState(moves, 4)

      const movesFromState = state.legalMoves
      const movesFromFen = getLegalMovesFromFen(state.fen)

      expect(movesFromState.length).toBe(movesFromFen.length)
      movesFromState.forEach((move, idx) => {
        expect(move.san).toBe(movesFromFen[idx].san)
      })
    })
  })

  describe('Analysis depth tracking', () => {
    it('should track analysis depth progression', () => {
      const moves = ['e4', 'e5', 'Nf3']
      const state = getBoardState(moves, 3)

      const analyses: EngineAnalysis[] = [
        { evaluation: 25, bestMove: 'Nc3', depth: 10, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },
        { evaluation: 28, bestMove: 'Nc3', depth: 15, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },
        { evaluation: 30, bestMove: 'Nc3', depth: 20, principalVariation: ['e2e4', 'c7c5', 'g1f3'], isMate: false },
      ]

      // Store deepest analysis
      cache.set(state.fen, analyses[2])

      const final = cache.get(state.fen)
      expect(final?.depth).toBe(20)
      expect(final?.evaluation).toBe(30)
    })

    it('should update analysis when deeper evaluation found', () => {
      const moves = ['e4', 'e5']
      const state = getBoardState(moves, 2)

      const shallowAnalysis: EngineAnalysis = {
        evaluation: 20,
        bestMove: 'Nf3',
        depth: 10,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      const deepAnalysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'Nf3',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(state.fen, shallowAnalysis)
      expect(cache.get(state.fen)?.evaluation).toBe(20)

      // Update with deeper analysis
      cache.set(state.fen, deepAnalysis)
      expect(cache.get(state.fen)?.evaluation).toBe(25)
    })
  })

  describe('Multi-position analysis sequence', () => {
    it('should analyze entire game sequence efficiently', () => {
      const moves = [
        'e4', 'c5', 'Nf3', 'd6', 'Bb5', 'Bd7', 'Bxd7', 'Qxd7', 'O-O', 'Nc6',
      ]

      for (let i = 0; i < moves.length; i++) {
        const state = getBoardState(moves, i)
        const analysis: EngineAnalysis = {
          evaluation: Math.random() * 100 - 50,
          bestMove: 'e4',
          depth: 20,
          principalVariation: ['e2e4', 'c7c5', 'g1f3'],
          isMate: false,
        }
        cache.set(state.fen, analysis)
      }

      expect(cache.size()).toBe(moves.length)

      // All analyses should be retrievable
      for (let i = 0; i < moves.length; i++) {
        const state = getBoardState(moves, i)
        const cached = cache.get(state.fen)
        expect(cached).toBeDefined()
      }
    })

    it('should handle cache eviction during game analysis', () => {
      const smallCache = new AnalysisCache(5)
      const moves = [
        'e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6',
      ]

      for (let i = 0; i < Math.min(moves.length, 7); i++) {
        const state = getBoardState(moves, i)
        const analysis: EngineAnalysis = {
          evaluation: i * 5,
          bestMove: 'e4',
          depth: 20,
          principalVariation: ['e2e4', 'c7c5', 'g1f3'],
          isMate: false,
        }
        smallCache.set(state.fen, analysis)
      }

      // Cache should have evicted oldest entries
      expect(smallCache.size()).toBeLessThanOrEqual(5)

      // Most recent positions should still be cached
      const lastState = getBoardState(moves, 6)
      expect(smallCache.get(lastState.fen)).toBeDefined()
    })
  })

  describe('Performance characteristics', () => {
    it('should provide fast lookups for cached analyses', () => {
      const moves = ['e4', 'e5', 'Nf3', 'Nc6']
      const state = getBoardState(moves, 4)

      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'Bb5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(state.fen, analysis)

      // Measure lookup time
      const start = Date.now()
      for (let i = 0; i < 10000; i++) {
        cache.get(state.fen)
      }
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100) // 10k lookups should be < 100ms
    })

    it('should handle rapid position changes with cache hits', () => {
      const allMoves = [
        'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6',
        'O-O', 'Be7', 'Re1', 'b5', 'Bb3', 'd6',
      ]

      // Pre-populate cache with analyses
      for (let i = 0; i < allMoves.length; i++) {
        const state = getBoardState(allMoves, i)
        const analysis: EngineAnalysis = {
          evaluation: Math.random() * 50,
          bestMove: 'e4',
          depth: 20,
          principalVariation: ['e2e4', 'c7c5', 'g1f3'],
          isMate: false,
        }
        cache.set(state.fen, analysis)
      }

      // Navigate through game with lookups
      const start = Date.now()
      for (let i = 0; i < allMoves.length; i++) {
        const state = getBoardState(allMoves, i)
        const cached = cache.get(state.fen)
        expect(cached).toBeDefined()
      }
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100) // All operations should be fast
    })
  })

  describe('Cache invalidation scenarios', () => {
    it('should handle clearing cache and rebuilding', () => {
      const moves = ['e4', 'e5', 'Nf3']
      const state = getBoardState(moves, 3)

      const analysis: EngineAnalysis = {
        evaluation: 30,
        bestMove: 'Nc3',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(state.fen, analysis)
      expect(cache.get(state.fen)).toBeDefined()

      cache.clear()
      expect(cache.get(state.fen)).toBeNull()

      // Rebuild cache
      cache.set(state.fen, analysis)
      expect(cache.get(state.fen)).toBeDefined()
    })

    it('should maintain cache through position backtracks', () => {
      const moves = ['e4', 'e5', 'Nf3']

      const state1 = getBoardState(moves, 1)
      const state3 = getBoardState(moves, 3)

      const analysis1: EngineAnalysis = {
        evaluation: 20,
        bestMove: 'Nf3',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }
      const analysis3: EngineAnalysis = {
        evaluation: 30,
        bestMove: 'Nc3',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(state1.fen, analysis1)
      cache.set(state3.fen, analysis3)

      // Backtrack from position 3 to position 1
      const backtrackedState1 = getBoardState(moves, 1)
      expect(cache.get(backtrackedState1.fen)).toEqual(analysis1)

      // Forward to position 3
      const forwardState3 = getBoardState(moves, 3)
      expect(cache.get(forwardState3.fen)).toEqual(analysis3)
    })
  })
})
