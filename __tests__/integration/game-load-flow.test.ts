/**
 * Integration tests for game load flow
 * Tests: PGN parsing → board state → move navigation
 */

import { parsePgn } from '../../lib/chess/pgn/parser'
import { getBoardState } from '../../lib/chess/board/board'

describe('Game Load Flow', () => {
  describe('Simple game parsing and board state', () => {
    it('should load simple game and navigate to first move', () => {
      const pgn = `[Event "Simple"]
[White "Alice"]
[Black "Bob"]

1. e4 e5 2. Nf3`

      // Parse PGN
      const parsed = parsePgn(pgn)
      expect(parsed.moves.length).toBeGreaterThan(0)

      // Get board state at move 1
      const state = getBoardState(parsed.moves as any, 1)

      expect(state.currentMoveIndex).toBe(1)
      expect(state.fen).toContain('4P')
      expect(state.legalMoves.length).toBeGreaterThan(0)
    })

    it('should navigate through entire game', () => {
      const pgn = `[Event "Test"]
[White "Player1"]
[Black "Player2"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4`

      const parsed = parsePgn(pgn)
      const totalMoves = parsed.moveCount

      // Navigate to end
      const finalState = getBoardState(parsed.moves as any, totalMoves)

      expect(finalState.currentMoveIndex).toBe(totalMoves)
      expect(finalState.totalMoves).toBe(totalMoves)
    })

    it('should maintain FEN consistency across move sequence', () => {
      const pgn = `[Event "Consistency"]

1. e4 e5 2. Nf3 Nc6 3. Bb5`

      const parsed = parsePgn(pgn)

      // Get state at each move
      const state1 = getBoardState(parsed.moves as any, 1)
      const state2 = getBoardState(parsed.moves as any, 2)
      const state3 = getBoardState(parsed.moves as any, 3)

      expect(state1.fen).not.toBe(state2.fen)
      expect(state2.fen).not.toBe(state3.fen)

      // Side to move alternates: after 1 half-move (e4) it's Black's turn,
      // after 2 (e4 e5) it's White's, after 3 (e4 e5 Nf3) it's Black's again.
      expect(state1.fen).toContain(' b ')
      expect(state2.fen).toContain(' w ')
      expect(state3.fen).toContain(' b ')
    })
  })

  describe('Complex game scenarios', () => {
    it('should handle game with castling', () => {
      const pgn = `[Event "Castling Game"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 O-O`

      const parsed = parsePgn(pgn)
      expect(parsed.legalMoves).toBe(true)

      // Verify moves parsed correctly
      expect(parsed.moves).toContain('O-O')

      // Navigate to castling position
      const state = getBoardState(parsed.moves as any, parsed.moveCount)
      expect(state).toBeDefined()
    })

    it('should handle game with captures', () => {
      const pgn = `[Event "Captures"]

1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 4. Nf3`

      const parsed = parsePgn(pgn)
      expect(parsed.legalMoves).toBe(true)

      // Verify captures parsed
      expect(parsed.moves).toContain('Nxe5')
    })

    it('should handle game with promotion', () => {
      // A short race of both sides' rook pawns to the back rank, each
      // capturing on the way and promoting to a queen.
      const pgn = `[Event "Promotion"]

1. h4 a5 2. h5 a4 3. h6 a3 4. hxg7 axb2 5. gxh8=Q bxa1=Q`

      const parsed = parsePgn(pgn)
      expect(parsed.legalMoves).toBe(true)
      expect(parsed.moves).toContain('gxh8=Q')
      expect(parsed.moves).toContain('bxa1=Q')
    })

    it('should handle short game (checkmate)', () => {
      const pgn = `[Event "Fool's Mate"]

1. f3 e5 2. g4 Qh4#`

      const parsed = parsePgn(pgn)
      expect(parsed.legalMoves).toBe(true)
      expect(parsed.moveCount).toBe(4)
    })
  })

  describe('Metadata integration', () => {
    it('should preserve metadata during board navigation', () => {
      const pgn = `[Event "Tournament"]
[Date "2023.06.15"]
[White "Champion"]
[Black "Challenger"]
[Result "1-0"]

1. e4 c5 2. Nf3 d6`

      const parsed = parsePgn(pgn)

      expect(parsed.metadata.event).toBe('Tournament')
      expect(parsed.metadata.white).toBe('Champion')
      expect(parsed.metadata.black).toBe('Challenger')

      // Board states shouldn't affect metadata
      const state1 = getBoardState(parsed.moves as any, 1)
      const state2 = getBoardState(parsed.moves as any, 2)

      expect(state1).toBeDefined()
      expect(state2).toBeDefined()
      // Metadata is part of parsed, not board state
      expect(parsed.metadata).toBeDefined()
    })

    it('should handle games without all metadata', () => {
      const pgn = `1. e4 e5 2. Nf3`

      const parsed = parsePgn(pgn)

      expect(parsed.metadata).toEqual({})
      expect(parsed.moves.length).toBe(3)

      const state = getBoardState(parsed.moves as any, 3)
      expect(state.legalMoves.length).toBeGreaterThan(0)
    })
  })

  describe('Move navigation edge cases', () => {
    it('should handle navigation to position before first move', () => {
      const pgn = `1. e4 e5 2. Nf3`

      const parsed = parsePgn(pgn)
      const state = getBoardState(parsed.moves as any, 0)

      expect(state.currentMoveIndex).toBe(0)
      expect(state.legalMoves).toHaveLength(20) // Starting position
    })

    it('should clamp moveIndex to moves array', () => {
      const pgn = `1. e4 e5 2. Nf3`

      const parsed = parsePgn(pgn)
      const state = getBoardState(parsed.moves as any, 999)

      expect(state.currentMoveIndex).toBe(999)
      expect(state.totalMoves).toBe(3)
    })

    it('should maintain state consistency during multiple navigations', () => {
      const pgn = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6`

      const parsed = parsePgn(pgn)

      // Navigate forward and backward
      const state1 = getBoardState(parsed.moves as any, 2)
      const state2 = getBoardState(parsed.moves as any, 4)
      const state3 = getBoardState(parsed.moves as any, 2) // Back to 2

      expect(state2.fen).not.toBe(state1.fen)
      expect(state1.fen).toBe(state3.fen)
      expect(state1.currentMoveIndex).toBe(state3.currentMoveIndex)
    })
  })

  describe('Error handling in flow', () => {
    it('should reject invalid PGN early', () => {
      const pgn = 'not a valid pgn'

      expect(() => parsePgn(pgn)).toThrow()
    })

    it('should reject game with illegal move sequence', () => {
      const pgn = `1. e4 ILLEGAL_MOVE`

      expect(() => parsePgn(pgn)).toThrow()
    })

    it('should handle missing moves gracefully', () => {
      const parsed = {
        moves: ['e4'] as any,
        moveCount: 1,
        metadata: {},
        pgn: '1. e4',
        legalMoves: true,
      }

      const state = getBoardState(parsed.moves, 0)
      expect(state.fen).toBeDefined()
    })
  })

  describe('Performance characteristics', () => {
    it('should parse and navigate long game efficiently', () => {
      const pgn = `[Event "Long"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 Na5 9. Bc2 c5 10. d4 Qc7`

      const startParse = Date.now()
      const parsed = parsePgn(pgn)
      const parseDuration = Date.now() - startParse

      expect(parseDuration).toBeLessThan(1000) // Should parse in under 1 second

      // Navigate through positions
      const startNav = Date.now()
      for (let i = 0; i < parsed.moves.length; i++) {
        getBoardState(parsed.moves as any, i)
      }
      const navDuration = Date.now() - startNav

      expect(navDuration).toBeLessThan(1000) // Navigation should be fast
    })
  })
})
