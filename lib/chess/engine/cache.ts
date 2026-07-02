/**
 * LRU (Least Recently Used) cache for storing engine analysis results
 * Prevents re-analysis of previously evaluated positions
 */

import { EngineAnalysis } from '@/lib/chess/engine/types';

/**
 * Cache entry
 */
interface CacheEntry {
  readonly analysis: EngineAnalysis;
}

/**
 * LRU cache implementation using Map for O(1) lookups
 * When cache exceeds maxSize, removes least recently used entry.
 *
 * Recency is tracked via Map's own insertion-order guarantee (re-inserting a
 * key on access moves it to the end) rather than Date.now() timestamps: two
 * cache operations can land on the same millisecond, which previously made
 * evictOldest() pick the wrong entry under fast/synchronous usage.
 */
export class AnalysisCache {
  private cache: Map<string, CacheEntry>;
  readonly maxSize: number;

  /**
   * Creates a new analysis cache
   *
   * @param maxSize - Maximum number of positions to cache (default: 100)
   */
  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  /**
   * Retrieves cached analysis for a position
   *
   * @param fen - FEN string of the position
   * @returns Cached analysis or null if not found
   */
  get(fen: string): EngineAnalysis | null {
    const entry = this.cache.get(fen);
    if (!entry) {
      return null;
    }

    // Re-insert to move this key to the end of the Map's iteration order,
    // marking it as most recently used
    this.cache.delete(fen);
    this.cache.set(fen, entry);

    return entry.analysis;
  }

  /**
   * Stores analysis result in cache
   * Evicts oldest entry if cache exceeds maxSize
   *
   * @param fen - FEN string of the position
   * @param analysis - Engine analysis result to cache
   */
  set(fen: string, analysis: EngineAnalysis): void {
    if (this.cache.has(fen)) {
      // Remove first so the re-insertion below moves it to the end (most recently used)
      this.cache.delete(fen);
    } else if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(fen, { analysis });
  }

  /**
   * Removes the least recently used entry from cache.
   * The Map's first key in iteration order is the least recently used, since
   * get()/set() always move accessed keys to the end.
   */
  private evictOldest(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clears all cached entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Returns current cache size
   *
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Returns whether cache is at capacity
   *
   * @returns True if cache size equals maxSize
   */
  isFull(): boolean {
    return this.cache.size >= this.maxSize;
  }
}
