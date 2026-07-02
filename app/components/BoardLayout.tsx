/**
 * Board layout container
 * Combines chessboard, move navigation, and game info with state management
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ParsedPgn } from '@/lib/chess/pgn/parser';
import { useGameNavigation, NavigationGameState } from '@/lib/hooks/useGameNavigation';
import { useEngineAnalysis } from '@/lib/hooks/useEngineAnalysis';
import { useCoaching } from '@/lib/hooks/useCoaching';
import { getBoardState } from '@/lib/chess/board/board';
import { DeepDiveContext } from '@/lib/coaching/deep-dive';
import { DEFAULT_COACHING_CONFIG } from '@/lib/coaching/types';
import { GameState, Move } from '@/lib/types/chess';
import { EngineAnalysis } from '@/lib/chess/engine/types';
import { loadSettings } from '@/lib/storage/settings';
import { AppSettings, AIProvider } from '@/lib/types/storage';
import Chessboard from '@/app/components/Chessboard';
import MoveNavigation from '@/app/components/MoveNavigation';
import GameInfo from '@/app/components/GameInfo';
import AnalysisPanel from '@/app/components/AnalysisPanel';
import CoachingPanel from '@/app/components/CoachingPanel';
import DeepDiveModal from '@/app/components/DeepDiveModal';
import SettingsButton from '@/app/components/SettingsButton';
import SettingsModal from '@/app/components/SettingsModal';

/**
 * Props for BoardLayout component
 */
interface BoardLayoutProps {
  readonly parsedGame: ParsedPgn;
  readonly onLoadDifferentGame: () => void;
  readonly className?: string;
}

/**
 * Layout component combining board, navigation, and game info
 */
export const BoardLayout: React.FC<BoardLayoutProps> = ({
  parsedGame,
  onLoadDifferentGame,
  className = '',
}) => {
  const navigation = useGameNavigation();
  const { setGame } = navigation;
  const engine = useEngineAnalysis();
  const coaching = useCoaching();

  // Deep dive modal state
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [deepDiveContext, setDeepDiveContext] = useState<DeepDiveContext | null>(null);

  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState<AppSettings | null>(null);

  // Get API key for the currently selected provider
  const getApiKey = (): string => {
    try {
      const settings = loadSettings();
      return (settings.provider === 'gemini' ? settings.geminiApiKey : settings.claudeApiKey) || '';
    } catch {
      return '';
    }
  };

  // Get the currently selected AI provider
  const getProvider = (): AIProvider => {
    try {
      return loadSettings().provider;
    } catch {
      return 'claude';
    }
  };

  // Initialize game on mount
  React.useEffect(() => {
    const gameState: NavigationGameState = {
      moves: parsedGame.moves,
      metadata: parsedGame.metadata,
    };
    setGame(gameState);
  }, [parsedGame, setGame]);

  // Trigger analysis when position changes.
  // Note: engine.analyzePosition lazily initializes the analyzer itself on
  // first call - it must NOT be gated on engine.isInitialized here, since
  // that flag only ever becomes true as a *result* of calling
  // analyzePosition. Gating on it first would deadlock (nothing else ever
  // initializes the engine).
  useEffect(() => {
    const analyzeCurrentPosition = async () => {
      if (!navigation.boardState.fen) {
        return;
      }

      await engine.analyzePosition(navigation.boardState.fen, 2000);
    };

    // Debounce to avoid analyzing on every re-render
    const timer = setTimeout(() => {
      analyzeCurrentPosition();
    }, 100);

    return () => clearTimeout(timer);
  }, [navigation.boardState.fen, engine.analyzePosition]);

  // Track which game we've already run coaching for, so it only runs once
  // per loaded game rather than on every render
  const coachingTriggeredForRef = useRef<string | null>(null);

  // Track component mount status, so the bulk coaching sweep below can stop
  // mid-scan if the user navigates away (e.g. loads a different game)
  // instead of continuing to burn engine time analyzing positions nobody
  // will see. Explicitly reset to true in the effect body (not just via the
  // useRef initializer) - see useEngineAnalysis.ts for why: React Strict
  // Mode's dev-mode mount->cleanup->mount double-invoke would otherwise
  // leave it stuck at false.
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Analyze every position in the game and generate coaching explanations.
  // Runs once per loaded game, once an API key is set. Does not gate on
  // engine.isInitialized (see note on the effect above) - the first
  // analyzePosition call below initializes the engine lazily if needed.
  useEffect(() => {
    const runCoaching = async () => {
      const totalMoves = navigation.boardState.totalMoves;

      if (totalMoves === 0) {
        return;
      }

      const apiKey = getApiKey();
      if (!apiKey) {
        return;
      }

      if (coachingTriggeredForRef.current === parsedGame.pgn) {
        return;
      }
      coachingTriggeredForRef.current = parsedGame.pgn;

      // Walk every position in the game (0 = starting position), collecting
      // the FEN and engine analysis for each so critical moments can be
      // detected across the whole game, not just the currently-viewed move.
      const fens: string[] = [];
      const analyses: (EngineAnalysis | null)[] = [];
      const moves: Move[] = [];

      for (let i = 0; i <= totalMoves; i++) {
        if (!isMountedRef.current) {
          return;
        }

        const boardState = getBoardState(parsedGame.moves, i);
        fens.push(boardState.fen);

        if (boardState.lastMove) {
          moves.push({ from: boardState.lastMove.from, to: boardState.lastMove.to });
        }

        const analysis = await engine.analyzePosition(
          boardState.fen,
          DEFAULT_COACHING_CONFIG.analysisTimeLimit,
          'background',
        );
        analyses.push(analysis);
      }

      if (!isMountedRef.current) {
        return;
      }

      const game: GameState = {
        position: { fen: fens[fens.length - 1], moveNumber: Math.ceil(totalMoves / 2), halfMoveClock: 0 },
        moves,
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await coaching.generateCoaching({
        game,
        analyses,
        fens,
        apiKey,
        skillLevel: currentSettings?.skillLevel || 'intermediate',
        gameId: parsedGame.pgn,
        provider: getProvider(),
        gameMetadata: {
          white: parsedGame.metadata.white,
          black: parsedGame.metadata.black,
          event: parsedGame.metadata.event,
          timeControl: parsedGame.metadata.timeControl,
        },
      });
    };

    runCoaching();
  }, [
    navigation.boardState.totalMoves,
    parsedGame,
    currentSettings,
    coaching.generateCoaching,
    engine.analyzePosition,
  ]);

  const handleMove = useCallback(() => {
    // Just show the move was attempted - no auto-advance
    // User navigates with buttons
  }, []);

  const handleAnalysisRetry = useCallback(() => {
    if (navigation.boardState.fen) {
      engine.analyzePosition(navigation.boardState.fen, 2000);
    }
  }, [navigation.boardState.fen, engine.analyzePosition]);

  const handleCoachingRetry = useCallback(() => {
    // Retry button for coaching errors
    // In Phase 7, this will use settings for API key and skill level
    // For now, moment detection happens automatically after game loads
  }, []);

  // Open deep dive modal for current move
  const handleDeepDive = useCallback(async () => {
    if (!engine.analysis || !navigation.boardState.fen) {
      return;
    }

    const moveIndex = navigation.currentMoveIndex;
    const currentMove = navigation.boardState.lastMove;

    if (!currentMove) {
      return;
    }

    // Get evaluation from previous position if available
    let beforeEvaluation = 0;
    if (moveIndex > 0) {
      try {
        // Compute the board state from one move before
        const previousBoardState = getBoardState(parsedGame.moves, moveIndex - 1);
        // Analyze the previous position to get its evaluation
        await engine.analyzePosition(previousBoardState.fen, 1000);
        beforeEvaluation = engine.analysis?.evaluation || 0;
      } catch (error) {
        // If previous analysis fails, default to 0
        beforeEvaluation = 0;
      }
    }

    // Create deep dive context from current position
    const context: DeepDiveContext = {
      moveIndex,
      fen: navigation.boardState.fen,
      move: `${currentMove.from}${currentMove.to}`,
      analysis: {
        before: beforeEvaluation,
        after: engine.analysis.evaluation,
        bestMove: engine.analysis.bestMove,
        principalVariation: engine.analysis.principalVariation,
      },
      skillLevel: currentSettings?.skillLevel || 'intermediate',
    };

    setDeepDiveContext(context);
    setIsDeepDiveOpen(true);
  }, [engine.analysis, navigation.boardState.fen, navigation.currentMoveIndex, navigation.boardState.lastMove, parsedGame.moves, engine.analyzePosition]);

  // Handle settings change
  const handleSettingsChanged = useCallback((settings: AppSettings) => {
    setCurrentSettings(settings);
  }, []);

  return (
    <div className={`board-layout ${className}`}>
      <div className="board-layout-header">
        <h2 className="board-layout-title">Game Analysis</h2>
        <div className="board-layout-header-actions">
          <SettingsButton
            onClick={() => setIsSettingsOpen(true)}
            ariaLabel="Open settings"
          />
          <button
            onClick={onLoadDifferentGame}
            className="board-layout-load-btn"
            aria-label="Load a different game"
          >
            Load Different Game
          </button>
        </div>
      </div>

      <GameInfo
        white={parsedGame.metadata.white}
        black={parsedGame.metadata.black}
        event={parsedGame.metadata.event}
        date={parsedGame.metadata.date}
        result={parsedGame.metadata.result}
        site={parsedGame.metadata.site}
        className="board-layout-game-info"
      />

      <div className="board-layout-content">
        <div className="board-layout-board-section">
          <Chessboard
            boardState={navigation.boardState}
            onMove={handleMove}
            className="board-layout-board"
          />
        </div>

        <div className="board-layout-controls-section">
          <MoveNavigation
            currentMoveIndex={navigation.currentMoveIndex}
            totalMoves={navigation.boardState.totalMoves}
            isAtStart={navigation.isAtStart}
            isAtEnd={navigation.isAtEnd}
            onStart={navigation.restart}
            onPrevious={navigation.previousMove}
            onNext={navigation.nextMove}
            onEnd={() => navigation.goToMove(navigation.boardState.totalMoves)}
            onJumpToMove={navigation.goToMove}
            className="board-layout-navigation"
          />

          <AnalysisPanel
            analysis={engine.analysis}
            isAnalyzing={engine.isAnalyzing}
            error={engine.error}
            fen={navigation.boardState.fen}
            onRetry={handleAnalysisRetry}
            className="board-layout-analysis"
          />
        </div>
      </div>

      <CoachingPanel
        moments={coaching.moments}
        explanations={coaching.explanations}
        isLoading={coaching.isLoading}
        error={coaching.error}
        skillLevel={currentSettings?.skillLevel || 'intermediate'}
        onRetry={handleCoachingRetry}
        className="board-layout-coaching"
      />

      {/* Deep Dive Modal */}
      <DeepDiveModal
        isOpen={isDeepDiveOpen}
        context={deepDiveContext}
        apiKey={getApiKey()}
        provider={getProvider()}
        onClose={() => setIsDeepDiveOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChanged={handleSettingsChanged}
      />

      {/* Deep Dive Button */}
      {navigation.boardState.lastMove && engine.analysis && (
        <button
          onClick={handleDeepDive}
          className="board-layout-deep-dive-btn"
          title="Get detailed analysis of this move"
        >
          Deep Dive
        </button>
      )}

      <style jsx>{`
        .board-layout {
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .board-layout-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .board-layout-title {
          font-size: 24px;
          font-weight: 700;
          color: #333;
          margin: 0;
        }

        .board-layout-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .board-layout-load-btn {
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid #667eea;
          border-radius: 4px;
          background: white;
          color: #667eea;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .board-layout-load-btn:hover {
          background: #667eea;
          color: white;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }

        .board-layout-load-btn:active {
          transform: scale(0.95);
        }

        .board-layout-game-info {
          order: 1;
        }

        .board-layout-content {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          order: 2;
        }

        .board-layout-board-section {
          display: flex;
          justify-content: center;
        }

        .board-layout-controls-section {
          width: 100%;
        }

        .board-layout-navigation {
          width: 100%;
        }

        .board-layout-analysis {
          width: 100%;
        }

        .board-layout-coaching {
          width: 100%;
          order: 3;
        }

        .board-layout-deep-dive-btn {
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          border: 1px solid #667eea;
          border-radius: 4px;
          background: #667eea;
          color: white;
          cursor: pointer;
          transition: all 200ms ease;
          align-self: flex-start;
          margin-top: 8px;
        }

        .board-layout-deep-dive-btn:hover {
          background: #5568d3;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        }

        .board-layout-deep-dive-btn:active {
          transform: scale(0.95);
        }

        /* Desktop layout */
        @media (min-width: 1024px) {
          .board-layout-content {
            /* minmax(0, 1fr) instead of a bare 1fr: a bare 1fr track has an
               implicit min-width of its content's min-content size, so as
               analysis/coaching text changes length the grid renegotiates
               column widths and the board visibly grows/shrinks. Clamping
               the min to 0 makes both columns a fixed 50/50 split. */
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            align-items: start;
          }

          .board-layout-board-section {
            justify-content: flex-end;
          }

          .board-layout-controls-section {
            display: flex;
            flex-direction: column;
            gap: 20px;
            min-width: 0;
          }
        }

        @media (prefers-color-scheme: dark) {
          .board-layout-title {
            color: #ddd;
          }

          .board-layout-load-btn {
            background: #2a2a2a;
            color: #81d4fa;
            border-color: #81d4fa;
          }

          .board-layout-load-btn:hover {
            background: #81d4fa;
            color: #1a1a1a;
          }

          .board-layout-deep-dive-btn {
            background: #5b7ce9;
            border-color: #5b7ce9;
            color: white;
          }

          .board-layout-deep-dive-btn:hover {
            background: #4a6ad4;
            box-shadow: 0 2px 8px rgba(91, 124, 233, 0.3);
          }
        }

        @media (max-width: 768px) {
          .board-layout {
            padding: 16px;
            gap: 16px;
          }

          .board-layout-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .board-layout-title {
            font-size: 20px;
          }

          .board-layout-load-btn {
            align-self: stretch;
          }

          .board-layout-content {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default BoardLayout;
