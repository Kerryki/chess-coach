/**
 * Unit tests for LRU analysis cache
 * Tests cache behavior, eviction, and performance
 */

import { AnalysisCache } from '../../../../lib/chess/engine/cache'
import { EngineAnalysis } from '../../../../lib/chess/engine/types'

describe('AnalysisCache', () => {
  let cache: AnalysisCache

  beforeEach(() => {
    cache = new AnalysisCache(3) // Small cache for testing
  })

  describe('initialization', () => {
    it('should create cache with default size', () => {
      const defaultCache = new AnalysisCache()

      expect(defaultCache.maxSize).toBe(100)
      expect(defaultCache.size()).toBe(0)
    })

    it('should create cache with custom size', () => {
      const customCache = new AnalysisCache(50)

      expect(customCache.maxSize).toBe(50)
    })

    it('should start empty', () => {
      expect(cache.size()).toBe(0)
      expect(cache.isFull()).toBe(false)
    })
  })

  describe('get and set operations', () => {
    const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
    const analysis1: EngineAnalysis = {
      bestMove: 'e5',
      evaluation: 25,
      depth: 20,
      principalVariation: ['e2e4', 'c7c5', 'g1f3'],
      isMate: false,
    }

    it('should store and retrieve analysis', () => {
      cache.set(fen1, analysis1)

      const retrieved = cache.get(fen1)

      expect(retrieved).toEqual(analysis1)
    })

    it('should return null for missing entry', () => {
      const retrieved = cache.get('nonexistent_fen')

      expect(retrieved).toBeNull()
    })

    it('should increment cache size on set', () => {
      expect(cache.size()).toBe(0)

      cache.set(fen1, analysis1)

      expect(cache.size()).toBe(1)
    })

    it('should not duplicate entries', () => {
      const analysis2: EngineAnalysis = {
        ...analysis1,
        evaluation: 50,
      }

      cache.set(fen1, analysis1)
      cache.set(fen1, analysis2)

      expect(cache.size()).toBe(1)
      expect(cache.get(fen1)?.evaluation).toBe(50)
    })
  })

  describe('LRU eviction', () => {
    const createAnalysis = (_fen: string, evalValue: number): EngineAnalysis => ({
      evaluation: evalValue,
      bestMove: 'a1',
      depth: 20,
      principalVariation: ['e2e4', 'c7c5', 'g1f3'],
      isMate: false,
    })

    it('should evict oldest entry when cache exceeds maxSize', () => {
      const fen1 = 'fen1'
      const fen2 = 'fen2'
      const fen3 = 'fen3'
      const fen4 = 'fen4'

      cache.set(fen1, createAnalysis(fen1, 10))
      cache.set(fen2, createAnalysis(fen2, 20))
      cache.set(fen3, createAnalysis(fen3, 30))

      expect(cache.size()).toBe(3)
      expect(cache.isFull()).toBe(true)

      // Adding 4th entry should evict the oldest (fen1)
      cache.set(fen4, createAnalysis(fen4, 40))

      expect(cache.size()).toBe(3)
      expect(cache.get(fen1)).toBeNull() // fen1 should be evicted
      expect(cache.get(fen2)).toBeDefined()
      expect(cache.get(fen3)).toBeDefined()
      expect(cache.get(fen4)).toBeDefined()
    })

    it('should update timestamp on get (marking as recently used)', () => {
      const fen1 = 'fen1'
      const fen2 = 'fen2'
      const fen3 = 'fen3'
      const fen4 = 'fen4'

      cache.set(fen1, createAnalysis(fen1, 10))
      cache.set(fen2, createAnalysis(fen2, 20))
      cache.set(fen3, createAnalysis(fen3, 30))

      // Access fen1 to mark it as recently used
      cache.get(fen1)

      // Adding 4th entry should evict fen2 (oldest), not fen1
      cache.set(fen4, createAnalysis(fen4, 40))

      expect(cache.get(fen1)).toBeDefined() // fen1 should still be there
      expect(cache.get(fen2)).toBeNull() // fen2 should be evicted
    })

    it('should handle multiple evictions in sequence', () => {
      const analyses = []
      for (let i = 0; i < 10; i++) {
        const fen = `fen${i}`
        analyses.push({ fen, analysis: createAnalysis(fen, i * 10) })
      }

      analyses.forEach(({ fen, analysis }) => {
        cache.set(fen, analysis)
      })

      expect(cache.size()).toBe(3) // Cache maxSize is 3
      // Only last 3 should be present
      expect(cache.get('fen7')).toBeDefined()
      expect(cache.get('fen8')).toBeDefined()
      expect(cache.get('fen9')).toBeDefined()
      expect(cache.get('fen0')).toBeNull()
    })
  })

  describe('clear operation', () => {
    it('should clear all entries', () => {
      const fen1 = 'fen1'
      const fen2 = 'fen2'

      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(fen1, analysis)
      cache.set(fen2, { ...analysis})

      expect(cache.size()).toBe(2)

      cache.clear()

      expect(cache.size()).toBe(0)
      expect(cache.get(fen1)).toBeNull()
      expect(cache.get(fen2)).toBeNull()
    })

    it('should reset isFull after clear', () => {
      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set('fen1', analysis)
      cache.set('fen2', { ...analysis})
      cache.set('fen3', { ...analysis})

      expect(cache.isFull()).toBe(true)

      cache.clear()

      expect(cache.isFull()).toBe(false)
    })
  })

  describe('capacity checks', () => {
    it('should report full when at maxSize', () => {
      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      expect(cache.isFull()).toBe(false)

      cache.set('fen1', { ...analysis})
      expect(cache.isFull()).toBe(false)

      cache.set('fen2', { ...analysis})
      expect(cache.isFull()).toBe(false)

      cache.set('fen3', { ...analysis})
      expect(cache.isFull()).toBe(true)
    })

    it('should correctly report size', () => {
      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      expect(cache.size()).toBe(0)

      cache.set('fen1', { ...analysis})
      expect(cache.size()).toBe(1)

      cache.set('fen2', { ...analysis})
      expect(cache.size()).toBe(2)

      cache.set('fen3', { ...analysis})
      expect(cache.size()).toBe(3)

      cache.set('fen4', { ...analysis})
      expect(cache.size()).toBe(3) // Still 3 due to eviction
    })
  })

  describe('large cache', () => {
    it('should handle large cache sizes efficiently', () => {
      const largeCache = new AnalysisCache(10000)

      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        const fen = `fen${i}`
        largeCache.set(fen, { ...analysis})
      }

      expect(largeCache.size()).toBe(1000)
      expect(largeCache.isFull()).toBe(false)

      // Verify retrieval
      expect(largeCache.get('fen500')).toBeDefined()
      expect(largeCache.get('fen999')).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle cache size of 1', () => {
      const tinyCache = new AnalysisCache(1)

      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      tinyCache.set('fen1', analysis)
      expect(tinyCache.isFull()).toBe(true)

      tinyCache.set('fen2', { ...analysis})
      expect(tinyCache.size()).toBe(1)
      expect(tinyCache.get('fen1')).toBeNull()
      expect(tinyCache.get('fen2')).toBeDefined()
    })

    it('should handle updating existing entry without eviction', () => {
      const analysis1: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      const analysis2: EngineAnalysis = {
        evaluation: 50,
        bestMove: 'e4',
        depth: 25,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set('fen1', analysis1)
      cache.set('fen2', { ...analysis1})
      cache.set('fen3', { ...analysis1})

      expect(cache.size()).toBe(3)

      // Update existing entry
      cache.set('fen1', analysis2)

      expect(cache.size()).toBe(3) // Size should not increase
      expect(cache.get('fen1')?.evaluation).toBe(50)
    })
  })

  describe('empty string and special FEN values', () => {
    it('should accept empty string as FEN key', () => {
      const analysis: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set('', analysis)

      expect(cache.get('')).toEqual(analysis)
    })

    it('should distinguish between different FENs', () => {
      const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1'
      const fen2 = 'rnbqkbnr/pppppppp/8/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1'

      const analysis1: EngineAnalysis = {
        evaluation: 25,
        bestMove: 'e5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      const analysis2: EngineAnalysis = {
        evaluation: 0,
        bestMove: 'd5',
        depth: 20,
        principalVariation: ['e2e4', 'c7c5', 'g1f3'],
        isMate: false,
      }

      cache.set(fen1, analysis1)
      cache.set(fen2, analysis2)

      expect(cache.get(fen1)?.evaluation).toBe(25)
      expect(cache.get(fen2)?.evaluation).toBe(0)
    })
  })
})
