/**
 * useGameNavigation hook
 * Manages game state and move navigation with immutable patterns
 */

import { useCallback, useState } from 'react';
import { getBoardState, BoardState } from '@/lib/chess/board/board';
import { getTurn } from '@/lib/chess/board/moves';

/**
 * Game state for navigation
 */
export interface NavigationGameState {
  readonly moves: ReadonlyArray<string>;
  readonly metadata?: {
    readonly white?: string;
    readonly black?: string;
    readonly event?: string;
    readonly date?: string;
    readonly result?: string;
  };
}

/**
 * Public interface for the hook
 */
export interface UseGameNavigationReturn {
  readonly currentMoveIndex: number;
  readonly boardState: BoardState;
  readonly currentTurn: 'white' | 'black';
  readonly isAtStart: boolean;
  readonly isAtEnd: boolean;
  nextMove: () => void;
  previousMove: () => void;
  goToMove: (index: number) => void;
  restart: () => void;
  reset: () => void;
  setGame: (game: NavigationGameState) => void;
}

/**
 * Hook for managing game navigation and board state
 * Provides immutable state management for move navigation
 *
 * @param initialGame - Initial game state (optional)
 * @returns Game navigation interface
 */
export function useGameNavigation(initialGame?: NavigationGameState): UseGameNavigationReturn {
  const [game, setGameState] = useState<NavigationGameState | null>(initialGame ?? null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);

  // Derived board state
  const boardState: BoardState = game
    ? getBoardState(game.moves, currentMoveIndex)
    : getBoardState([], 0);

  const currentTurn = getTurn(boardState.fen);

  // Move to next move
  const nextMove = useCallback(() => {
    if (!game) return;
    setCurrentMoveIndex((prev) => (prev < game.moves.length - 1 ? prev + 1 : prev));
  }, [game]);

  // Move to previous move
  const previousMove = useCallback(() => {
    setCurrentMoveIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  // Go to specific move index
  const goToMove = useCallback(
    (index: number) => {
      if (game) {
        const clampedIndex = Math.max(0, Math.min(index, game.moves.length));
        setCurrentMoveIndex(clampedIndex);
      }
    },
    [game],
  );

  // Restart game (go to move 0)
  const restart = useCallback(() => {
    setCurrentMoveIndex(0);
  }, []);

  // Reset completely (clear game)
  const reset = useCallback(() => {
    setGameState(null);
    setCurrentMoveIndex(0);
  }, []);

  // Set game (immutable)
  const setGame = useCallback((newGame: NavigationGameState) => {
    setGameState(newGame);
    setCurrentMoveIndex(0);
  }, []);

  return {
    currentMoveIndex,
    boardState,
    currentTurn,
    isAtStart: currentMoveIndex === 0,
    isAtEnd: game ? currentMoveIndex === game.moves.length : true,
    nextMove,
    previousMove,
    goToMove,
    restart,
    reset,
    setGame,
  };
}
