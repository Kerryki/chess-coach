/**
 * Chessboard component
 * Renders 8x8 grid with pieces and interactive move highlighting
 */

'use client';

import React, { useCallback, useState } from 'react';
import { BoardState, Square } from '@/lib/chess/board/board';

/**
 * Props for Chessboard component
 */
interface ChessboardProps {
  readonly boardState: BoardState;
  readonly onMove?: (from: string, to: string) => void;
  readonly className?: string;
}

/**
 * Piece unicode symbols
 */
const PIECES: Record<string, string> = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙', // White
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟', // Black
};

/**
 * Gets piece from FEN position
 */
function getPieceAt(fen: string, square: Square): string | null {
  const board: Record<string, string> = {};
  const fenParts = fen.split(' ');
  const boardFen = fenParts[0];
  const rows = boardFen.split('/');

  for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
    let colIdx = 0;
    for (const char of rows[rowIdx]) {
      if (/\d/.test(char)) {
        colIdx += parseInt(char);
      } else {
        const col = String.fromCharCode(97 + colIdx); // 'a' = 97
        const row = 8 - rowIdx;
        const sq = `${col}${row}`;
        board[sq] = char;
        colIdx++;
      }
    }
  }

  return board[square] || null;
}

/**
 * Chessboard component with piece rendering and move selection
 */
export const Chessboard: React.FC<ChessboardProps> = ({
  boardState,
  onMove,
  className = '',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMovesForSelected, setLegalMovesForSelected] = useState<Set<Square>>(
    new Set(),
  );

  // Use already-computed legal moves from boardState (single source of truth)
  const legalMovesDetailed = boardState.legalMoves;

  const handleSquareClick = useCallback(
    (square: Square) => {
      // If this square has a legal destination for the selected piece, move there
      if (selectedSquare && legalMovesForSelected.has(square)) {
        onMove?.(selectedSquare, square);
        setSelectedSquare(null);
        setLegalMovesForSelected(new Set());
        return;
      }

      // Check if this square has a piece that can move
      const piece = getPieceAt(boardState.fen, square);
      if (!piece) {
        setSelectedSquare(null);
        setLegalMovesForSelected(new Set());
        return;
      }

      // Get legal moves from this square
      const movesFromSquare = legalMovesDetailed
        .filter((m) => m.from === square)
        .map((m) => m.to as Square);

      setSelectedSquare(square);
      setLegalMovesForSelected(new Set(movesFromSquare));
    },
    [selectedSquare, legalMovesForSelected, boardState.fen, onMove],
  );

  // Square descriptors for all 64 squares in reverse order (a1 at bottom-left).
  // Kept as plain data (not JSX) generated before the return: styled-jsx's
  // scoping transform only annotates JSX written inline in the returned tree,
  // so building <button> elements via .push() into an array beforehand (as
  // this used to do) silently drops them from every scoped CSS rule.
  const squareDescriptors: Array<{ square: Square; rowIndex: number; colIndex: number }> = [];
  for (let row = 8; row >= 1; row--) {
    for (let col = 0; col < 8; col++) {
      const colLetter = String.fromCharCode(97 + col); // 'a' = 97
      const square = `${colLetter}${row}` as Square;
      squareDescriptors.push({ square, rowIndex: 8 - row, colIndex: col });
    }
  }

  return (
    <div className={`chessboard-container ${className}`}>
      <div className="chessboard">
        {squareDescriptors.map(({ square, rowIndex, colIndex }) => {
          const piece = getPieceAt(boardState.fen, square);
          const isLight = (rowIndex + colIndex) % 2 === 0;
          const isSelected = square === selectedSquare;
          const isLegalDest = legalMovesForSelected.has(square);
          const isLastMoveSrc = boardState.lastMove?.from === square;
          const isLastMoveDest = boardState.lastMove?.to === square;

          return (
            <button
              key={square}
              onClick={() => handleSquareClick(square)}
              className="chessboard-square"
              data-square={square}
              data-light={isLight}
              data-selected={isSelected}
              data-legal-dest={isLegalDest}
              data-last-move-src={isLastMoveSrc}
              data-last-move-dest={isLastMoveDest}
              aria-label={`${square}${piece ? ` with ${piece}` : ''}`}
              title={square}
            >
              {piece && <span className="piece">{PIECES[piece] || piece}</span>}
              {isLegalDest && <span className="legal-dot"></span>}
            </button>
          );
        })}
      </div>

      <div className="chessboard-info">
        <div className="move-counter">
          Move {Math.ceil(boardState.currentMoveIndex / 2)} of {Math.ceil(boardState.totalMoves / 2)}
        </div>
      </div>

      <style jsx>{`
        .chessboard-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          width: 100%;
        }

        .chessboard {
          display: grid;
          grid-template-columns: repeat(8, 1fr);
          gap: 0;
          aspect-ratio: 1;
          width: 100%;
          max-width: 640px;
          border: 2px solid #333;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
          background: #333;
        }

        .chessboard-square {
          aspect-ratio: 1;
          border: none;
          padding: 0;
          cursor: pointer;
          position: relative;
          font-size: 2rem;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 200ms ease;
        }

        .chessboard-square[data-light="true"] {
          background-color: #f0d9b5;
        }

        .chessboard-square[data-light="false"] {
          background-color: #b58863;
        }

        .chessboard-square[data-selected="true"] {
          background-color: #baca44 !important;
          box-shadow: inset 0 0 0 2px #7a8d2e;
        }

        .chessboard-square[data-legal-dest="true"] {
          background: radial-gradient(
            circle at center,
            rgba(76, 175, 80, 0.4) 25%,
            transparent 25%
          );
        }

        .chessboard-square[data-last-move-src="true"],
        .chessboard-square[data-last-move-dest="true"] {
          background-color: #baca44 !important;
        }

        .chessboard-square:hover {
          opacity: 0.9;
        }

        .piece {
          display: block;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3);
          user-select: none;
        }

        .legal-dot {
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: rgba(76, 175, 80, 0.7);
          pointer-events: none;
        }

        .chessboard-info {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 14px;
          color: #666;
        }

        .move-counter {
          font-weight: 600;
          padding: 8px 12px;
          background: #f5f5f5;
          border-radius: 4px;
          min-width: 120px;
          text-align: center;
        }

        @media (prefers-color-scheme: dark) {
          .chessboard {
            border-color: #ddd;
          }

          .chessboard-square[data-light="true"] {
            background-color: #505050;
          }

          .chessboard-square[data-light="false"] {
            background-color: #3d3d3d;
          }

          .chessboard-square[data-selected="true"] {
            background-color: #949d1f !important;
          }

          .chessboard-square[data-last-move-src="true"],
          .chessboard-square[data-last-move-dest="true"] {
            background-color: #949d1f !important;
          }

          .chessboard-info {
            color: #aaa;
          }

          .move-counter {
            background: #2a2a2a;
            color: #ddd;
          }
        }

        @media (max-width: 640px) {
          .chessboard {
            max-width: 100%;
          }

          .chessboard-square {
            font-size: 1.5rem;
          }

          .move-counter {
            font-size: 12px;
            padding: 6px 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default Chessboard;
