/**
 * Unit tests for Chess.com PGN fetcher
 * Tests URL parsing and PGN retrieval via the live-game callback endpoint
 */

import { parseChessComUrl, fetchPgnFromChessComUrl } from '../../../../lib/chess/pgn/fetcher'

describe('parseChessComUrl', () => {
  it('extracts game ID from a /game/live/ URL', () => {
    expect(parseChessComUrl('https://www.chess.com/game/live/170998476766')).toBe(
      '170998476766',
    )
  })

  it('extracts game ID from a /game/rapid/ URL', () => {
    expect(parseChessComUrl('https://chess.com/game/rapid/987654321')).toBe('987654321')
  })

  it('returns null when no game ID is present', () => {
    expect(parseChessComUrl('https://chess.com/game/live/')).toBeNull()
  })
})

describe('fetchPgnFromChessComUrl', () => {
  const url = 'https://www.chess.com/game/live/170998476766'

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('decodes the moveList into a PGN with headers', async () => {
    const mockResponse = {
      game: {
        moveList: 'mC0Kgv5QlBZRbsKBsJ!TcM3VMT2TvB92fH6ZCKTKHQXQJzQIzOKBdmZSmHSZHX8!OY70ef45XW0KaeKLjrLkowBtYJZHfoHQecQJoxknhgnLwELvgwvnxFtlcgnpwxpgxw2TEMVMFxJSwESE',
        pgnHeaders: {
          Event: 'Live Chess',
          White: 'kknicee',
          Black: 'GuYuju',
          Result: '0-1',
        },
      },
    }

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    }) as jest.Mock

    const pgn = await fetchPgnFromChessComUrl(url)

    expect(pgn).toContain('[White "kknicee"]')
    expect(pgn).toContain('[Black "GuYuju"]')
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6')
    expect(pgn).toContain('Bxg4#')
  })

  it('throws GAME_NOT_FOUND on a 404 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as jest.Mock

    await expect(fetchPgnFromChessComUrl(url)).rejects.toMatchObject({
      code: 'GAME_NOT_FOUND',
    })
  })

  it('throws INVALID_CHESS_COM_RESPONSE when moveList is missing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ game: {} }),
    }) as jest.Mock

    await expect(fetchPgnFromChessComUrl(url)).rejects.toMatchObject({
      code: 'INVALID_CHESS_COM_RESPONSE',
    })
  })

  it('throws INVALID_CHESS_COM_URL when the URL has no game ID', async () => {
    await expect(
      fetchPgnFromChessComUrl('https://www.chess.com/game/live/'),
    ).rejects.toMatchObject({
      code: 'INVALID_CHESS_COM_URL',
    })
  })
})
