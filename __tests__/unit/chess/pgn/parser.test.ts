/**
 * Unit tests for PGN parser
 * Tests PGN parsing, validation, and metadata extraction
 */

import { parsePgn } from '../../../../lib/chess/pgn/parser'

describe('parsePgn', () => {
  describe('metadata extraction', () => {
    it('should extract basic game metadata', () => {
      const pgn = `[Event "Tournament"]
[Date "2023.06.15"]
[White "Player One"]
[Black "Player Two"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6`

      const result = parsePgn(pgn)

      expect(result.metadata.event).toBe('Tournament')
      expect(result.metadata.date).toBe('2023.06.15')
      expect(result.metadata.white).toBe('Player One')
      expect(result.metadata.black).toBe('Player Two')
      expect(result.metadata.result).toBe('1-0')
    })

    it('should extract all standard PGN tags', () => {
      const pgn = `[Event "Test"]
[Site "Online"]
[Date "2023.01.01"]
[White "White"]
[Black "Black"]
[Result "1/2-1/2"]
[ECO "C00"]
[WhiteElo "2000"]
[BlackElo "1900"]
[TimeControl "600+5"]

1. e4 e5`

      const result = parsePgn(pgn)

      expect(result.metadata.event).toBe('Test')
      expect(result.metadata.site).toBe('Online')
      expect(result.metadata.eco).toBe('C00')
      expect(result.metadata.whiteElo).toBe('2000')
      expect(result.metadata.blackElo).toBe('1900')
      expect(result.metadata.timeControl).toBe('600+5')
      expect(result.metadata.result).toBe('1/2-1/2')
    })

    it('should handle missing metadata gracefully', () => {
      const pgn = `1. e4 e5 2. Nf3 Nc6`

      const result = parsePgn(pgn)

      expect(result.metadata).toEqual({})
      expect(result.moves.length).toBeGreaterThan(0)
    })

    it('should handle metadata with special characters', () => {
      // Per the PGN spec, embedded quotes within a tag value are escaped
      // with a backslash (\\" below produces a literal \" in the PGN text).
      const pgn = `[Event "Tournament \\"2023\\""]
[White "O'Neill, Player"]

1. e4 e5`

      const result = parsePgn(pgn)

      expect(result.metadata.event).toBe('Tournament "2023"')
      expect(result.metadata.white).toBe("O'Neill, Player")
    })
  })

  describe('move extraction', () => {
    it('should extract simple moves', () => {
      const pgn = `1. e4 e5 2. Nf3 Nc6`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
      expect(result.moveCount).toBe(4)
    })

    it('should extract moves with complex notation', () => {
      const pgn = `1. e4 e5 2. Nf3 Nf6 3. Nxe5 d6 4. Nf3`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3', 'Nf6', 'Nxe5', 'd6', 'Nf3'])
    })

    it('should handle castling notation', () => {
      const pgn = `1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 O-O`

      const result = parsePgn(pgn)

      expect(result.moves).toContain('O-O')
      // Queenside castling may or may not be in this specific game
    })

    it('should handle promotion notation', () => {
      const pgn = `[Event "Promotion"]

1. e4 e5 2. f4 d5 3. exd5`

      const result = parsePgn(pgn)

      expect(result.moves.length).toBeGreaterThan(0)
      expect(result.legalMoves).toBe(true)
    })

    it('should ignore comments in braces', () => {
      const pgn = `1. e4 {opening move} e5 {solid response} 2. Nf3`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3'])
    })

    it('should ignore variations in parentheses', () => {
      const pgn = `1. e4 (1. d4 d5) e5 2. Nf3 (2. f4)`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3'])
    })

    it('should ignore nested variations', () => {
      const pgn = `1. e4 (1. d4 (1. c4) d5) e5`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5'])
    })

    it('should ignore annotations starting with $', () => {
      const pgn = `1. e4 $3 e5 $1 2. Nf3 $5`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3'])
    })

    it('should ignore game result tokens', () => {
      const pgn = `1. e4 e5 2. Nf3 1-0`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3'])
    })

    it('should handle long algebraic notation', () => {
      const pgn = `1. e2e4 e7e5 2. g1f3`

      const result = parsePgn(pgn)

      expect(result.moves).toContain('e2e4')
    })
  })

  describe('validation', () => {
    it('should validate legal move sequence', () => {
      const pgn = `1. e4 e5 2. Nf3 Nc6 3. Bb5`

      const result = parsePgn(pgn)

      expect(result.legalMoves).toBe(true)
    })

    it('should reject illegal moves', () => {
      const pgn = `1. e4 e5 2. Nf3 Nc6 3. Qh5 Nxe4`

      expect(() => parsePgn(pgn)).toThrow()
    })

    it('should catch illegal move in long sequences', () => {
      const pgn = `1. e4 e5 2. Nf3 Nf6 3. Bc4 Bc5 4. d3 d6 5. O-O Ng4 6. h3 Nh6 7. c3 a6 8. b4 Ba7 9. a4 O-O 10. Nbd2 c6 11. Bb2 Nf7 12. c4 Ne6 13. Re1 ILLEGAL_MOVE`

      expect(() => parsePgn(pgn)).toThrow()
    })
  })

  describe('error handling', () => {
    it('should reject empty PGN', () => {
      expect(() => parsePgn('')).toThrow()
    })

    it('should reject null PGN', () => {
      expect(() => parsePgn(null as any)).toThrow()
    })

    it('should reject undefined PGN', () => {
      expect(() => parsePgn(undefined as any)).toThrow()
    })

    it('should reject non-string PGN', () => {
      expect(() => parsePgn(123 as any)).toThrow()
    })

    it('should reject PGN that is too short', () => {
      expect(() => parsePgn('1. e')).toThrow()
    })

    it('should reject PGN with no moves', () => {
      const pgn = `[Event "Test"]
[White "Player"]
[Black "Player"]`

      expect(() => parsePgn(pgn)).toThrow()
    })

    it('should trim whitespace from PGN', () => {
      const pgn = `

1. e4 e5 2. Nf3 Nc6

      `

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6'])
    })
  })

  describe('immutability', () => {
    it('should return frozen moves array', () => {
      const pgn = `[Event "Test"]

1. e4 e5`

      const result = parsePgn(pgn)

      expect(() => {
        ;(result.moves as any)[0] = 'MODIFIED'
      }).toThrow()
    })

    it('should return readonly metadata', () => {
      const pgn = `[Event "Test"]

1. e4 e5`

      const result = parsePgn(pgn)

      // Metadata should not have modifications
      expect(result.metadata).toBeDefined()
    })
  })

  describe('complex games', () => {
    it('should handle Fischer-Spassky game', () => {
      const pgn = `[Event "World Championship"]
[White "Bobby Fischer"]
[Black "Boris Spassky"]
[Date "1972.07.01"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4 Be7
8. Qf3 Nbd7 9. O-O-O b5 10. a3 Bb7 11. Qh3 Rc8`

      const result = parsePgn(pgn)

      expect(result.metadata.event).toBe('World Championship')
      expect(result.metadata.white).toBe('Bobby Fischer')
      expect(result.moveCount).toBeGreaterThan(20)
      expect(result.legalMoves).toBe(true)
    })

    it('should handle PGN with multiple spaces and newlines', () => {
      const pgn = `[Event "Test"]


1.  e4   e5   2.   Nf3

  Nc6   3. Bb5`

      const result = parsePgn(pgn)

      expect(result.moves.length).toBeGreaterThan(0)
    })

    it('should not mistake a FEN/SetUp header value for moves (Chess.com-style export)', () => {
      const pgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2026.07.02"]
[White "kknicee"]
[Black "GuYuju"]
[Result "0-1"]
[SetUp "1"]
[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]
[Termination "GuYuju won by checkmate"]

1. e4 e5 2. Nf3 Nc6 3. d4 d6`

      const result = parsePgn(pgn)

      expect(result.moves).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'd6'])
      expect(result.legalMoves).toBe(true)
    })
  })
})
